const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

console.log('===================================================');
console.log(' Starting Candidate Import & Merge Script');
console.log('===================================================\n');

// File Paths
const EXPORT_ORIGINAL_FILE = path.join(__dirname, 'extracted_original_1778.json');
const CANDIDATES_JSON_PATH = path.join(__dirname, 'candidates.json');
const MAT_FILE_PATH = path.join(__dirname, 'FEB-MAT-2026_sorted.xlsx');
const CMAT_FILE_PATH = path.join(__dirname, 'CMAT 2026 Edit With TN.xlsx');

// 1. Get original candidates #1 to #1778
let originalCandidates = [];

if (fs.existsSync(EXPORT_ORIGINAL_FILE)) {
  originalCandidates = JSON.parse(fs.readFileSync(EXPORT_ORIGINAL_FILE, 'utf8'));
  console.log(`[1/4] Loaded ${originalCandidates.length} original candidates from extracted_original_1778.json`);
} else {
  console.log('[1/4] Extracting original 1778 candidates from Git commit history...');
  const content = cp.execSync('git show 87443a313eeb4615557d3b177ccc908af75a083a:app.js', { maxBuffer: 200 * 1024 * 1024 }).toString();
  const startMarker = 'const CANDIDATES_DATA = ';
  const startIdx = content.indexOf(startMarker);
  const jsonStart = startIdx + startMarker.length;
  const endMarker = ';\n\n// State Management';
  let endIdx = content.indexOf(endMarker, jsonStart);
  if (endIdx === -1) endIdx = content.indexOf('];\n\n', jsonStart);
  const rawJson = content.substring(jsonStart, endIdx + 1);
  const allOriginal = JSON.parse(rawJson);
  originalCandidates = allOriginal.slice(0, 1778);
  fs.writeFileSync(EXPORT_ORIGINAL_FILE, JSON.stringify(originalCandidates, null, 2));
  console.log(`Saved ${originalCandidates.length} original candidates.`);
}

// Clean and normalize existing phones & emails to avoid duplicate entries
const existingPhones = new Set();
const existingEmails = new Set();

const finalCandidates = originalCandidates.map((cand, idx) => {
  const cleanPhone = (cand.phone || '').toString().replace(/[^0-9]/g, '');
  const cleanEmail = (cand.email || '').toString().trim().toLowerCase();

  if (cleanPhone) existingPhones.add(cleanPhone);
  if (cleanEmail) existingEmails.add(cleanEmail);

  return {
    id: `cand-${idx + 1}`,
    name: cand.name ? cand.name.trim() : `Candidate ${idx + 1}`,
    phone: cand.phone ? cand.phone.trim() : '',
    email: cleanEmail,
    status: cand.status || 'pending',
    lastContactedAt: cand.lastContactedAt || null
  };
});

console.log(`[2/4] Preserved candidates #1 to #${finalCandidates.length} intact.`);
console.log(`  First candidate (#1): ${finalCandidates[0].name} (${finalCandidates[0].phone})`);
console.log(`  Last preserved candidate (#1778): ${finalCandidates[finalCandidates.length - 1].name} (${finalCandidates[finalCandidates.length - 1].phone})`);

let nextIdNumber = finalCandidates.length + 1;
let addedFromMat = 0;
let addedFromCmat = 0;
let skippedDuplicates = 0;
let skippedIncomplete = 0;

// Helper to sanitize phone numbers
function formatPhoneNumber(rawPhone) {
  if (!rawPhone) return '';
  const digits = rawPhone.toString().replace(/[^0-9]/g, '');
  if (digits.length < 7) return '';
  if (rawPhone.toString().trim().startsWith('+')) {
    return rawPhone.toString().trim();
  }
  if (digits.length === 10) {
    return `+91 ${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
  }
  return `+${digits}`;
}

// 2. Read FEB-MAT-2026_sorted.xlsx
if (fs.existsSync(MAT_FILE_PATH)) {
  console.log(`\n[3/4] Processing Excel file: FEB-MAT-2026_sorted.xlsx...`);
  const wb1 = XLSX.readFile(MAT_FILE_PATH);
  const sheet1 = wb1.Sheets[wb1.SheetNames[0]];
  const matRows = XLSX.utils.sheet_to_json(sheet1);

  matRows.forEach((row) => {
    const rawName = row['NAME'] || row['Name'] || row['name'];
    const rawPhone = row['NUMBER'] || row['Mobile'] || row['Phone'] || row['NUMBER '];
    const rawEmail = row['EMAIL'] || row['Email'] || row['email'];

    const name = (rawName || '').toString().trim();
    const formattedPhone = formatPhoneNumber(rawPhone);
    const email = (rawEmail || '').toString().trim().toLowerCase();

    if (!name || !formattedPhone || !email || !email.includes('@')) {
      skippedIncomplete++;
      return;
    }

    const digitsOnly = formattedPhone.replace(/[^0-9]/g, '');

    if (existingPhones.has(digitsOnly) || existingEmails.has(email)) {
      skippedDuplicates++;
      return;
    }

    existingPhones.add(digitsOnly);
    existingEmails.add(email);

    finalCandidates.push({
      id: `cand-${nextIdNumber++}`,
      name: name,
      phone: formattedPhone,
      email: email,
      status: 'pending',
      lastContactedAt: null
    });
    addedFromMat++;
  });
  console.log(`  Added ${addedFromMat} new candidates from FEB-MAT-2026_sorted.xlsx`);
} else {
  console.warn(`Warning: ${MAT_FILE_PATH} not found.`);
}

// 3. Read CMAT 2026 Edit With TN.xlsx
if (fs.existsSync(CMAT_FILE_PATH)) {
  console.log(`\n[4/4] Processing Excel file: CMAT 2026 Edit With TN.xlsx...`);
  const wb2 = XLSX.readFile(CMAT_FILE_PATH);
  const sheet2 = wb2.Sheets[wb2.SheetNames[0]];
  const cmatRows = XLSX.utils.sheet_to_json(sheet2);

  cmatRows.forEach((row) => {
    const rawName = row['CNAME'] || row['NAME'] || row['Candidate Name'];
    const rawPhone = row['MobileNo'] || row['MOBILE'] || row['Phone'];
    const rawEmail = row['EmailId'] || row['EMAIL'] || row['Email'];

    const name = (rawName || '').toString().trim();
    const formattedPhone = formatPhoneNumber(rawPhone);
    const email = (rawEmail || '').toString().trim().toLowerCase();

    if (!name || !formattedPhone || !email || !email.includes('@')) {
      skippedIncomplete++;
      return;
    }

    const digitsOnly = formattedPhone.replace(/[^0-9]/g, '');

    if (existingPhones.has(digitsOnly) || existingEmails.has(email)) {
      skippedDuplicates++;
      return;
    }

    existingPhones.add(digitsOnly);
    existingEmails.add(email);

    finalCandidates.push({
      id: `cand-${nextIdNumber++}`,
      name: name,
      phone: formattedPhone,
      email: email,
      status: 'pending',
      lastContactedAt: null
    });
    addedFromCmat++;
  });
  console.log(`  Added ${addedFromCmat} new candidates from CMAT 2026 Edit With TN.xlsx`);
} else {
  console.warn(`Warning: ${CMAT_FILE_PATH} not found.`);
}

// 4. Save merged candidates dataset to candidates.json
fs.writeFileSync(CANDIDATES_JSON_PATH, JSON.stringify(finalCandidates, null, 2), 'utf8');

console.log('\n===================================================');
console.log(' MERGE SUMMARY:');
console.log(`  - Preserved original #1-#1778: ${originalCandidates.length}`);
console.log(`  - Added from FEB-MAT-2026:     ${addedFromMat}`);
console.log(`  - Added from CMAT 2026:        ${addedFromCmat}`);
console.log(`  - Skipped duplicates:          ${skippedDuplicates}`);
console.log(`  - Skipped incomplete rows:     ${skippedIncomplete}`);
console.log(`  - TOTAL CANDIDATES SAVED:      ${finalCandidates.length}`);
console.log(`  - Output File:                 candidates.json`);
console.log('===================================================\n');

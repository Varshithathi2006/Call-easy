const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// File paths
const CANDIDATES_FILE = path.join(__dirname, 'candidates.json');
const TEMPLATES_FILE = path.join(__dirname, 'templates.json');

// Default message templates
const DEFAULT_TEMPLATES = {
  company: 'Acme Corp Hiring Team',
  whatsapp: 'Hi {name}, thank you for taking the time to speak with us today regarding the {role} position at {company}. Next step: {next_step}. Feel free to reply here if you have any questions!',
  emailSubject: 'Follow-up regarding your {role} application - {company}',
  emailBody: 'Hi {name},\n\nThank you for speaking with our recruiting team today regarding the {role} position at {company}.\n\nAs discussed, our key next step is: {next_step}.\n\nPlease let us know if you need any additional details or have any questions in the meantime.\n\nBest regards,\n{company} Recruitment Team'
};

// Helper to read candidates
function getCandidates() {
  try {
    if (fs.existsSync(CANDIDATES_FILE)) {
      const data = fs.readFileSync(CANDIDATES_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading candidates file:', err);
  }
  return [];
}

// Helper to save candidates
function saveCandidates(candidates) {
  try {
    fs.writeFileSync(CANDIDATES_FILE, JSON.stringify(candidates, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving candidates file:', err);
    return false;
  }
}

// Helper to read templates
function getTemplates() {
  try {
    if (fs.existsSync(TEMPLATES_FILE)) {
      const data = fs.readFileSync(TEMPLATES_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading templates file:', err);
  }
  return DEFAULT_TEMPLATES;
}

// Helper to save templates
function saveTemplates(templates) {
  try {
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving templates file:', err);
    return false;
  }
}

// Check Twilio initialization state
function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (
    accountSid &&
    authToken &&
    accountSid !== 'your_twilio_account_sid_here' &&
    authToken !== 'your_twilio_auth_token_here' &&
    authToken.length > 10
  ) {
    try {
      const twilio = require('twilio');
      return twilio(accountSid, authToken);
    } catch (err) {
      console.warn('Twilio SDK initialization warning:', err.message);
    }
  }
  return null;
}

// Helper to replace template tags
function renderTemplate(templateStr, data) {
  if (!templateStr) return '';
  return templateStr
    .replace(/\{name\}/g, data.name || 'Candidate')
    .replace(/\{role\}/g, data.role || 'Position')
    .replace(/\{company\}/g, data.company || process.env.COMPANY_NAME || 'Our Team')
    .replace(/\{next_step\}/g, data.next_step || data.notes || 'Interview follow-up');
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Health & Config Status
app.get('/api/health', (req, res) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
  const hasTwilioCreds =
    accountSid.length > 5 &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_AUTH_TOKEN !== 'your_twilio_auth_token_here';

  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    config: {
      twilioConfigured: !!hasTwilioCreds,
      twilioAccountSid: accountSid ? accountSid.substring(0, 6) + '...' : 'Not Set',
      twilioVirtualNumber: process.env.TWILIO_PHONE_NUMBER || 'Not Set',
      recruiterPhoneNumber: process.env.RECRUITER_PHONE_NUMBER || 'Not Set',
      twilioWhatsAppNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'Not Set',
      emailConfigured: !!(process.env.SMTP_USER && process.env.SMTP_USER !== 'recruiter@example.com'),
      serverBaseUrl: process.env.SERVER_BASE_URL || `http://localhost:${PORT}`
    }
  });
});

// 2. Candidate List Management
app.get('/api/candidates', (req, res) => {
  const candidates = getCandidates();
  res.json({ success: true, candidates });
});

app.post('/api/candidates/status', (req, res) => {
  const { id, status } = req.body;
  if (!id || !status) {
    return res.status(400).json({ success: false, message: 'Missing candidate id or status' });
  }

  const candidates = getCandidates();
  const index = candidates.findIndex((c) => c.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Candidate not found' });
  }

  candidates[index].status = status;
  candidates[index].lastContactedAt = status === 'contacted' ? new Date().toISOString() : candidates[index].lastContactedAt;
  saveCandidates(candidates);

  res.json({ success: true, candidate: candidates[index] });
});

// Reset progress for all candidates
app.post('/api/candidates/reset', (req, res) => {
  const candidates = getCandidates();
  candidates.forEach((c) => {
    c.status = 'pending';
    c.lastContactedAt = null;
  });
  saveCandidates(candidates);
  res.json({ success: true, message: 'Progress reset successfully', candidates });
});

// 3. Message Templates API
app.get('/api/templates', (req, res) => {
  const templates = getTemplates();
  res.json({ success: true, templates });
});

app.post('/api/templates', (req, res) => {
  const newTemplates = req.body;
  saveTemplates(newTemplates);
  res.json({ success: true, message: 'Templates saved successfully', templates: newTemplates });
});

// 4. Twilio Outbound Voice Call Bridging Route
// Taps "Call Candidate" -> Twilio calls recruiter first -> recruiter answers -> Twilio requests TwiML bridge -> candidate receives call with Twilio Caller ID
app.post('/api/call', async (req, res) => {
  const { candidateId, candidatePhone, candidateName } = req.body;

  const recruiterPhone = process.env.RECRUITER_PHONE_NUMBER;
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
  const serverBaseUrl = process.env.SERVER_BASE_URL || `http://localhost:${PORT}`;

  console.log(`[OUTBOUND CALL REQUEST] Candidate: ${candidateName} (${candidatePhone}), Recruiter: ${recruiterPhone}`);

  const twilioClient = getTwilioClient();

  if (twilioClient && recruiterPhone && twilioNumber && twilioNumber !== '+18005550199') {
    try {
      // Build TwiML callback URL for bridging
      const twimlUrl = `${serverBaseUrl}/api/twiml/bridge?candidatePhone=${encodeURIComponent(candidatePhone)}&candidateName=${encodeURIComponent(candidateName || 'Candidate')}`;

      console.log(`[TWILIO CALL] Placing call to recruiter: ${recruiterPhone} with TwiML URL: ${twimlUrl}`);

      const call = await twilioClient.calls.create({
        url: twimlUrl,
        to: recruiterPhone,
        from: twilioNumber
      });

      return res.json({
        success: true,
        callSid: call.sid,
        mode: 'live_twilio',
        message: `Twilio call initiated! Calling your phone (${recruiterPhone}) first. When answered, Twilio will bridge you to ${candidateName} (${candidatePhone}) showing ${twilioNumber} as Caller ID.`
      });
    } catch (err) {
      console.error('[TWILIO CALL ERROR]', err);
      return res.json({
        success: false,
        error: err.message,
        mode: 'simulated',
        message: `Twilio API Call Error: ${err.message}. Showing simulated calling mode for testing.`
      });
    }
  }

  // Fallback Simulation Mode (when Twilio credentials or phone numbers are pending setup)
  return res.json({
    success: true,
    mode: 'simulated',
    callSid: 'SIM_CALL_' + Date.now(),
    message: `[Simulated Call] Twilio would call recruiter (${recruiterPhone || 'Not set'}) first, then bridge to candidate (${candidatePhone}) displaying Twilio number (${twilioNumber || 'Virtual Number'}) as Caller ID. Your personal number remains 100% hidden!`
  });
});

// 5. TwiML Webhook Endpoint for Twilio Call Bridging
app.all('/api/twiml/bridge', (req, res) => {
  const candidatePhone = req.query.candidatePhone || req.body.candidatePhone;
  const candidateName = req.query.candidateName || req.body.candidateName || 'Candidate';
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER || '+18005550199';

  console.log(`[TWIML WEBHOOK TRIGGERED] Bridging to ${candidateName} at ${candidatePhone} using callerId ${twilioNumber}`);

  // Clean TwiML XML response
  res.type('text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Connecting call to candidate ${candidateName}. Your personal number is hidden.</Say>
    <Dial callerId="${twilioNumber}">
        <Number>${candidatePhone}</Number>
    </Dial>
</Response>`);
});

// 6. Mark Call Complete & Automatic Follow-Up (Email + WhatsApp)
app.post('/api/complete-call', async (req, res) => {
  const { candidateId, companyName, customNote } = req.body;

  const candidates = getCandidates();
  const candidate = candidates.find((c) => c.id === candidateId);

  if (!candidate) {
    return res.status(404).json({ success: false, message: 'Candidate not found' });
  }

  const templates = getTemplates();
  const company = companyName || templates.company || 'Acme Corp';
  const nextStep = customNote || candidate.notes || 'Follow-up interview scheduled';

  // Update candidate status to contacted
  candidate.status = 'contacted';
  candidate.lastContactedAt = new Date().toISOString();
  saveCandidates(candidates);

  const templateData = {
    name: candidate.name,
    role: candidate.role,
    company: company,
    next_step: nextStep
  };

  const whatsappMessage = renderTemplate(templates.whatsapp, templateData);
  const emailSubject = renderTemplate(templates.emailSubject, templateData);
  const emailBody = renderTemplate(templates.emailBody, templateData);

  let emailResult = { sent: false, info: 'Not attempted' };
  let whatsappResult = { sent: false, info: 'Not attempted' };

  // A. Send Email via Nodemailer (SMTP / SendGrid)
  if (process.env.SMTP_USER && process.env.SMTP_USER !== 'recruiter@example.com') {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to: candidate.email,
        subject: emailSubject,
        text: emailBody
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`[EMAIL SENT] To: ${candidate.email}, MessageID: ${info.messageId}`);
      emailResult = { sent: true, info: `Email delivered to ${candidate.email} (ID: ${info.messageId})` };
    } catch (err) {
      console.error('[EMAIL ERROR]', err.message);
      emailResult = { sent: false, error: err.message, info: `Email failed: ${err.message}` };
    }
  } else {
    emailResult = {
      sent: false,
      mode: 'simulated',
      info: `[Simulated Email] Would send email to ${candidate.email} with subject "${emailSubject}"`
    };
  }

  // B. Send WhatsApp via Twilio WhatsApp API
  const twilioClient = getTwilioClient();
  const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886';

  if (twilioClient && candidate.phone) {
    try {
      // Twilio WhatsApp numbers must be prefixed with 'whatsapp:'
      const fromWa = twilioWhatsAppNumber.startsWith('whatsapp:') ? twilioWhatsAppNumber : `whatsapp:${twilioWhatsAppNumber}`;
      const toWa = candidate.phone.startsWith('whatsapp:') ? candidate.phone : `whatsapp:${candidate.phone}`;

      const waMsg = await twilioClient.messages.create({
        from: fromWa,
        to: toWa,
        body: whatsappMessage
      });

      console.log(`[WHATSAPP SENT] To: ${candidate.phone}, SID: ${waMsg.sid}`);
      whatsappResult = { sent: true, info: `WhatsApp message delivered (SID: ${waMsg.sid})` };
    } catch (err) {
      console.error('[WHATSAPP ERROR]', err.message);
      whatsappResult = { sent: false, error: err.message, info: `WhatsApp failed: ${err.message}` };
    }
  } else {
    whatsappResult = {
      sent: false,
      mode: 'simulated',
      info: `[Simulated WhatsApp] Would send WhatsApp message to ${candidate.phone}`
    };
  }

  res.json({
    success: true,
    candidate,
    emailResult,
    whatsappResult,
    whatsappMessage,
    emailSubject,
    emailBody,
    message: `Call marked complete! Candidate ${candidate.name} updated to Contacted.`
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  Call Easy - Twilio Candidate Outreach Backend Server`);
  console.log(`  Running on: http://localhost:${PORT}`);
  console.log(`  Health Check: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});

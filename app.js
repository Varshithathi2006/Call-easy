/**
 * Call Easy - Twilio Anonymous Candidate Outreach
 * Frontend Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // STATE
    // ----------------------------------------------------
    let candidates = [];
    let currentIndex = 0;
    let currentFilter = 'all';
    let searchQuery = '';
    let callState = 'idle'; // 'idle' | 'calling' | 'completed'

    let templates = {
        company: 'Acme Corp Hiring Team',
        whatsapp: 'Hi {name}, thank you for taking the time to speak with us today regarding the {role} position at {company}. Next step: {next_step}. Feel free to reply here if you have any questions!',
        emailSubject: 'Follow-up regarding your {role} application - {company}',
        emailBody: 'Hi {name},\n\nThank you for speaking with our recruiting team today regarding the {role} position at {company}.\n\nAs discussed, our key next step is: {next_step}.\n\nPlease let us know if you need any additional details or have any questions in the meantime.\n\nBest regards,\n{company} Recruitment Team'
    };

    // ----------------------------------------------------
    // DOM ELEMENTS
    // ----------------------------------------------------
    const desktopOverlay = document.getElementById('desktop-overlay');
    const toggleSimulatorBtn = document.getElementById('toggle-simulator-btn');
    const appShell = document.getElementById('app-shell');

    // Header & Progress
    const setupBtn = document.getElementById('setup-btn');
    const templatesBtn = document.getElementById('templates-btn');
    const listDrawerBtn = document.getElementById('list-drawer-btn');
    const headerProgressCount = document.getElementById('header-progress-count');
    const progressBarFill = document.getElementById('progress-bar-fill');

    // Candidate Card Elements
    const candidateIndexLabel = document.getElementById('candidate-index-label');
    const candidateStatusBadge = document.getElementById('candidate-status-badge');
    const statusText = document.getElementById('status-text');
    const candidateAvatar = document.getElementById('candidate-avatar');
    const contactedCheckmark = document.getElementById('contacted-checkmark');
    const candidateName = document.getElementById('candidate-name');
    const candidateRole = document.getElementById('candidate-role');
    const candidateExp = document.getElementById('candidate-exp');
    const candidateLocation = document.getElementById('candidate-location');
    const candidatePhone = document.getElementById('candidate-phone');
    const candidateEmail = document.getElementById('candidate-email');
    const candidateNotes = document.getElementById('candidate-notes');

    // Call Action Footer Controls
    const callStatusBanner = document.getElementById('call-status-banner');
    const callBannerTitle = document.getElementById('call-banner-title');
    const callBannerSub = document.getElementById('call-banner-sub');
    const callActionBtn = document.getElementById('call-action-btn');
    const markCompleteBtn = document.getElementById('mark-complete-btn');

    // Sub-actions & Navigation
    const manualWaBtn = document.getElementById('manual-wa-btn');
    const manualEmailBtn = document.getElementById('manual-email-btn');
    const toggleContactedBtn = document.getElementById('toggle-contacted-btn');
    const toggleContactedText = document.getElementById('toggle-contacted-text');
    const prevCandidateBtn = document.getElementById('prev-candidate-btn');
    const nextCandidateBtn = document.getElementById('next-candidate-btn');

    // Drawers & Modals
    const listDrawer = document.getElementById('list-drawer');
    const closeDrawerBtn = document.getElementById('close-drawer-btn');
    const candidateSearchInput = document.getElementById('candidate-search-input');
    const filterPills = document.querySelectorAll('.filter-pill');
    const drawerCandidatesList = document.getElementById('drawer-candidates-list');
    const resetProgressBtn = document.getElementById('reset-progress-btn');

    const templatesModal = document.getElementById('templates-modal');
    const closeTemplatesBtn = document.getElementById('close-templates-btn');
    const templateCompany = document.getElementById('template-company');
    const templateWhatsapp = document.getElementById('template-whatsapp');
    const templateEmailSubject = document.getElementById('template-email-subject');
    const templateEmailBody = document.getElementById('template-email-body');
    const previewWhatsappText = document.getElementById('preview-whatsapp-text');
    const previewEmailSubjectText = document.getElementById('preview-email-subject-text');
    const saveTemplatesBtn = document.getElementById('save-templates-btn');
    const resetTemplatesBtn = document.getElementById('reset-templates-btn');

    const setupModal = document.getElementById('setup-modal');
    const closeSetupBtn = document.getElementById('close-setup-btn');
    const closeSetupFooterBtn = document.getElementById('close-setup-footer-btn');

    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // ----------------------------------------------------
    // INITIALIZATION & API FETCHING
    // ----------------------------------------------------
    async function init() {
        await checkBackendHealth();
        await loadCandidates();
        await loadTemplates();
        renderCandidateCard();
        setupEventListeners();
    }

    // Check backend status
    async function checkBackendHealth() {
        try {
            const res = await fetch('/api/health');
            if (res.ok) {
                const data = await res.json();
                console.log('[Backend Online]', data);
            }
        } catch (err) {
            console.warn('[Backend Offline / Standalone Mode]', err);
        }
    }

    // Load candidate list from backend API (or fallback to local seed)
    async function loadCandidates() {
        try {
            const res = await fetch('/api/candidates');
            if (res.ok) {
                const data = await res.json();
                if (data.candidates && data.candidates.length > 0) {
                    candidates = data.candidates;
                    return;
                }
            }
        } catch (err) {
            console.warn('API fetch candidates failed, using local storage or seed data');
        }

        // Local Storage / Seed Fallback
        const saved = localStorage.getItem('call_easy_candidates');
        if (saved) {
            try {
                candidates = JSON.parse(saved);
                return;
            } catch (e) {}
        }

        candidates = [
            {
                id: 'cand_001',
                name: 'Ananya Sharma',
                role: 'Senior Frontend Developer',
                phone: '+919876543211',
                email: 'ananya.sharma@example.com',
                experience: '5 Yrs',
                location: 'Bengaluru, IN',
                status: 'pending',
                notes: 'Strong React & TypeScript experience. Available to start in 15 days.'
            },
            {
                id: 'cand_002',
                name: 'Rohan Verma',
                role: 'Full Stack Engineer',
                phone: '+919876543212',
                email: 'rohan.verma@example.com',
                experience: '4 Yrs',
                location: 'Hyderabad, IN',
                status: 'pending',
                notes: 'Node.js, PostgreSQL & AWS expert. Interested in remote hybrid role.'
            },
            {
                id: 'cand_003',
                name: 'Priya Nair',
                role: 'Product Designer (UI/UX)',
                phone: '+919876543213',
                email: 'priya.nair@example.com',
                experience: '6 Yrs',
                location: 'Mumbai, IN',
                status: 'pending',
                notes: 'Figma design system lead. Portfolio reviewed and rated top 5%.'
            }
        ];
    }

    // Save candidate state
    function persistCandidates() {
        localStorage.setItem('call_easy_candidates', JSON.stringify(candidates));
    }

    // Load templates
    async function loadTemplates() {
        try {
            const res = await fetch('/api/templates');
            if (res.ok) {
                const data = await res.json();
                if (data.templates) {
                    templates = { ...templates, ...data.templates };
                    return;
                }
            }
        } catch (err) {}

        const savedTemplates = localStorage.getItem('call_easy_templates');
        if (savedTemplates) {
            try {
                templates = JSON.parse(savedTemplates);
            } catch (e) {}
        }
    }

    // ----------------------------------------------------
    // RENDERING LOGIC
    // ----------------------------------------------------
    function renderCandidateCard() {
        if (!candidates || candidates.length === 0) return;

        const candidate = candidates[currentIndex];

        // Header counts
        const contactedCount = candidates.filter(c => c.status === 'contacted').length;
        headerProgressCount.textContent = `${contactedCount}/${candidates.length}`;
        const pct = Math.round((contactedCount / candidates.length) * 100);
        progressBarFill.style.width = `${pct}%`;

        // Card Index & Status
        candidateIndexLabel.textContent = `Candidate ${currentIndex + 1} of ${candidates.length}`;
        
        if (candidate.status === 'contacted') {
            candidateStatusBadge.className = 'status-badge status-contacted';
            statusText.textContent = 'Contacted';
            contactedCheckmark.classList.add('active');
            toggleContactedText.textContent = 'Mark Pending';
        } else {
            candidateStatusBadge.className = 'status-badge status-pending';
            statusText.textContent = 'Pending';
            contactedCheckmark.classList.remove('active');
            toggleContactedText.textContent = 'Mark Done';
        }

        // Profile fields
        const initials = candidate.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        candidateAvatar.textContent = initials;
        candidateName.textContent = candidate.name;
        candidateRole.textContent = candidate.role;
        candidateExp.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${candidate.experience || '-- Yrs Exp'}`;
        candidateLocation.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> ${candidate.location || 'Remote'}`;

        candidatePhone.textContent = candidate.phone;
        candidateEmail.textContent = candidate.email;
        candidateNotes.textContent = candidate.notes || 'Initial recruiter screening call.';

        // Navigation state
        prevCandidateBtn.disabled = currentIndex === 0;
        nextCandidateBtn.disabled = currentIndex === candidates.length - 1;
        prevCandidateBtn.style.opacity = currentIndex === 0 ? '0.5' : '1';
        nextCandidateBtn.style.opacity = currentIndex === candidates.length - 1 ? '0.5' : '1';

        // Render call state UI
        renderCallStateUI();
    }

    function renderCallStateUI() {
        if (callState === 'calling') {
            callStatusBanner.classList.remove('hidden');
            callBannerTitle.textContent = `Twilio Calling Your Phone...`;
            callBannerSub.textContent = `Answer incoming call to bridge to ${candidates[currentIndex].name}`;
            callActionBtn.classList.add('hidden');
            markCompleteBtn.classList.remove('hidden');
        } else {
            callStatusBanner.classList.add('hidden');
            callActionBtn.classList.remove('hidden');
            markCompleteBtn.classList.add('hidden');
        }
    }

    // ----------------------------------------------------
    // TWILIO OUTBOUND CALL & MARK COMPLETE ACTIONS
    // ----------------------------------------------------

    // 1. Trigger Twilio Outbound Call Bridge
    async function handleCallCandidate() {
        const candidate = candidates[currentIndex];
        callState = 'calling';
        renderCallStateUI();

        showToast(`Initiating Twilio call to ${candidate.name}...`);

        try {
            const res = await fetch('/api/call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidateId: candidate.id,
                    candidatePhone: candidate.phone,
                    candidateName: candidate.name
                })
            });

            if (res.ok) {
                const data = await res.json();
                console.log('[Twilio Call Response]', data);

                if (data.mode === 'live_twilio') {
                    showToast(`Calling your phone! Answer to connect to ${candidate.name}`);
                } else {
                    showToast(data.message || `Call initiated! Tap "Mark Call Complete" when done.`);
                }
            } else {
                showToast(`Call initiated! Tap "Mark Call Complete" when finished.`);
            }
        } catch (err) {
            console.warn('[Call Request Fallback]', err);
            showToast(`Simulated Call Started. Tap "Mark Call Complete" when done.`);
        }
    }

    // 2. Mark Call Complete Action (Auto Sends WhatsApp & Email Follow-up)
    async function handleMarkCallComplete() {
        const candidate = candidates[currentIndex];

        showToast(`Sending WhatsApp & Email follow-up to ${candidate.name}...`);

        try {
            const res = await fetch('/api/complete-call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidateId: candidate.id,
                    companyName: templates.company,
                    customNote: candidate.notes
                })
            });

            if (res.ok) {
                const data = await res.json();
                console.log('[Complete Call Response]', data);

                candidate.status = 'contacted';
                persistCandidates();

                callState = 'idle';
                renderCandidateCard();

                let toastMsg = `✓ Call Complete! Follow-up sent to ${candidate.name}`;
                if (data.emailResult && data.emailResult.sent) {
                    toastMsg += ` (Email delivered)`;
                }
                showToast(toastMsg);
                return;
            }
        } catch (err) {
            console.warn('[Complete Call Fallback]', err);
        }

        // Local fallback update if server unreachable
        candidate.status = 'contacted';
        persistCandidates();
        callState = 'idle';
        renderCandidateCard();
        showToast(`✓ Marked Call Complete for ${candidate.name}`);
    }

    // Toggle status manually
    async function toggleContactedStatus() {
        const candidate = candidates[currentIndex];
        const newStatus = candidate.status === 'contacted' ? 'pending' : 'contacted';
        candidate.status = newStatus;
        persistCandidates();

        try {
            await fetch('/api/candidates/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: candidate.id, status: newStatus })
            });
        } catch (e) {}

        renderCandidateCard();
        showToast(`Status updated to ${newStatus}`);
    }

    // ----------------------------------------------------
    // TEMPLATE EDITOR & PREVIEW LOGIC
    // ----------------------------------------------------
    function openTemplatesModal() {
        templateCompany.value = templates.company || '';
        templateWhatsapp.value = templates.whatsapp || '';
        templateEmailSubject.value = templates.emailSubject || '';
        templateEmailBody.value = templates.emailBody || '';

        updateTemplatePreview();
        templatesModal.classList.add('active');
    }

    function closeTemplatesModal() {
        templatesModal.classList.remove('active');
    }

    function updateTemplatePreview() {
        const currentCandidate = candidates[currentIndex] || { name: 'Sample Name', role: 'Developer' };

        const render = (str) => {
            return (str || '')
                .replace(/\{name\}/g, currentCandidate.name)
                .replace(/\{role\}/g, currentCandidate.role)
                .replace(/\{company\}/g, templateCompany.value || 'Acme Corp')
                .replace(/\{next_step\}/g, currentCandidate.notes || 'Interview round');
        };

        previewWhatsappText.textContent = render(templateWhatsapp.value);
        previewEmailSubjectText.textContent = render(templateEmailSubject.value);
    }

    async function saveTemplatesData() {
        templates = {
            company: templateCompany.value.trim(),
            whatsapp: templateWhatsapp.value.trim(),
            emailSubject: templateEmailSubject.value.trim(),
            emailBody: templateEmailBody.value.trim()
        };

        localStorage.setItem('call_easy_templates', JSON.stringify(templates));

        try {
            await fetch('/api/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(templates)
            });
        } catch (e) {}

        closeTemplatesModal();
        showToast('Follow-up templates saved successfully!');
    }

    // ----------------------------------------------------
    // CANDIDATE QUEUE DRAWER & SEARCH
    // ----------------------------------------------------
    function openListDrawer() {
        renderDrawerCandidatesList();
        listDrawer.classList.add('active');
    }

    function closeListDrawer() {
        listDrawer.classList.remove('active');
    }

    function renderDrawerCandidatesList() {
        const allCount = candidates.length;
        const pendingCount = candidates.filter(c => c.status === 'pending').length;
        const contactedCount = candidates.filter(c => c.status === 'contacted').length;

        document.getElementById('count-filter-all').textContent = allCount;
        document.getElementById('count-filter-pending').textContent = pendingCount;
        document.getElementById('count-filter-contacted').textContent = contactedCount;

        const filtered = candidates.filter(candidate => {
            const matchesFilter = currentFilter === 'all' || candidate.status === currentFilter;
            const matchesSearch = !searchQuery || 
                candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                candidate.role.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesFilter && matchesSearch;
        });

        drawerCandidatesList.innerHTML = '';

        if (filtered.length === 0) {
            drawerCandidatesList.innerHTML = `<div style="text-align:center; padding: 24px; color: var(--text-muted);">No candidates match your filter.</div>`;
            return;
        }

        filtered.forEach((candidate) => {
            const indexInMainList = candidates.findIndex(c => c.id === candidate.id);
            const isCurrent = indexInMainList === currentIndex;

            const item = document.createElement('div');
            item.className = `drawer-candidate-item ${isCurrent ? 'active-item' : ''}`;
            item.innerHTML = `
                <div>
                    <strong style="font-size:0.92rem; display:block; color:var(--text-primary);">${candidate.name}</strong>
                    <span style="font-size:0.8rem; color:var(--text-secondary);">${candidate.role}</span>
                </div>
                <span class="status-badge ${candidate.status === 'contacted' ? 'status-contacted' : 'status-pending'}">
                    ${candidate.status === 'contacted' ? '✓ Done' : 'Pending'}
                </span>
            `;

            item.addEventListener('click', () => {
                currentIndex = indexInMainList;
                callState = 'idle';
                renderCandidateCard();
                closeListDrawer();
            });

            drawerCandidatesList.appendChild(item);
        });
    }

    // ----------------------------------------------------
    // TOAST NOTIFICATIONS & LISTENERS
    // ----------------------------------------------------
    function showToast(msg) {
        toastMessage.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3500);
    }

    function setupEventListeners() {
        // Desktop Simulator toggle
        toggleSimulatorBtn.addEventListener('click', () => {
            desktopOverlay.style.display = 'none';
            appShell.classList.add('simulator-active');
        });

        // Call Action Buttons
        callActionBtn.addEventListener('click', handleCallCandidate);
        markCompleteBtn.addEventListener('click', handleMarkCallComplete);

        // Sub Actions (Direct manual triggers)
        manualWaBtn.addEventListener('click', () => {
            const candidate = candidates[currentIndex];
            const cleanPhone = candidate.phone.replace(/[^0-9]/g, '');
            const msg = encodeURIComponent(`Hi ${candidate.name}, following up regarding the ${candidate.role} position.`);
            window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
        });

        manualEmailBtn.addEventListener('click', () => {
            const candidate = candidates[currentIndex];
            const subject = encodeURIComponent(`Follow-up: ${candidate.role} position`);
            const body = encodeURIComponent(`Hi ${candidate.name},\n\nThank you for connecting with our team today.\n\nBest regards,`);
            window.location.href = `mailto:${candidate.email}?subject=${subject}&body=${body}`;
        });

        toggleContactedBtn.addEventListener('click', toggleContactedStatus);

        // Queue Navigation
        prevCandidateBtn.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
                callState = 'idle';
                renderCandidateCard();
            }
        });

        nextCandidateBtn.addEventListener('click', () => {
            if (currentIndex < candidates.length - 1) {
                currentIndex++;
                callState = 'idle';
                renderCandidateCard();
            }
        });

        // Drawer
        listDrawerBtn.addEventListener('click', openListDrawer);
        closeDrawerBtn.addEventListener('click', closeListDrawer);
        listDrawer.addEventListener('click', (e) => {
            if (e.target === listDrawer) closeListDrawer();
        });

        // Search & Filter
        candidateSearchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderDrawerCandidatesList();
        });

        filterPills.forEach(pill => {
            pill.addEventListener('click', () => {
                filterPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                currentFilter = pill.dataset.filter;
                renderDrawerCandidatesList();
            });
        });

        // Reset progress
        resetProgressBtn.addEventListener('click', async () => {
            if (confirm('Reset contact progress for all candidates back to Pending?')) {
                candidates.forEach(c => c.status = 'pending');
                persistCandidates();
                try {
                    await fetch('/api/candidates/reset', { method: 'POST' });
                } catch (e) {}
                renderCandidateCard();
                renderDrawerCandidatesList();
                showToast('Contact progress reset!');
            }
        });

        // Templates Modal
        templatesBtn.addEventListener('click', openTemplatesModal);
        closeTemplatesBtn.addEventListener('click', closeTemplatesModal);
        templatesModal.addEventListener('click', (e) => {
            if (e.target === templatesModal) closeTemplatesModal();
        });

        [templateCompany, templateWhatsapp, templateEmailSubject, templateEmailBody].forEach(input => {
            input.addEventListener('input', updateTemplatePreview);
        });

        saveTemplatesBtn.addEventListener('click', saveTemplatesData);
        resetTemplatesBtn.addEventListener('click', () => {
            if (confirm('Reset templates to default text?')) {
                templateCompany.value = 'Acme Corp Hiring Team';
                templateWhatsapp.value = templates.whatsapp;
                templateEmailSubject.value = templates.emailSubject;
                templateEmailBody.value = templates.emailBody;
                updateTemplatePreview();
            }
        });

        // Setup Guide Modal
        setupBtn.addEventListener('click', () => setupModal.classList.add('active'));
        closeSetupBtn.addEventListener('click', () => setupModal.classList.remove('active'));
        closeSetupFooterBtn.addEventListener('click', () => setupModal.classList.remove('active'));
        setupModal.addEventListener('click', (e) => {
            if (e.target === setupModal) setupModal.classList.remove('active');
        });
    }

    // Start App
    init();
});

/**
 * Call Easy - Anonymous Candidate Outreach
 * Frontend Application & Theme Management
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
    let currentTheme = 'light';

    let templates = {
        company: 'Saveetha Admissions Cell',
        whatsapp: 'Hi {name}, thank you for speaking with our Admissions team today regarding your application at {company}. Complete your online application here: https://admission.saveetha.com/ . Feel free to reply here if you have any questions!',
        emailSubject: 'Official Admission Follow-up & Next Steps - {company}',
        emailBody: 'Dear {name},\n\nThank you for speaking with the Admissions Cell team today regarding your higher education application at {company}.\n\nPlease complete your official online application form at your earliest convenience using the link below:\n\n👉 Application Portal: https://admission.saveetha.com/\n\nPlease let us know if you need any assistance or have any questions in the meantime.\n\nWarm regards,\nSaveetha Admissions Cell Team'
    };

    // ----------------------------------------------------
    // DOM ELEMENTS
    // ----------------------------------------------------
    const desktopOverlay = document.getElementById('desktop-overlay');
    const toggleSimulatorBtn = document.getElementById('toggle-simulator-btn');
    const appShell = document.getElementById('app-shell');

    // Header & Theme Controls
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeIconSun = document.getElementById('theme-icon-sun');
    const themeIconMoon = document.getElementById('theme-icon-moon');
    const setupBtn = document.getElementById('setup-btn');
    const templatesBtn = document.getElementById('templates-btn');
    const listDrawerBtn = document.getElementById('list-drawer-btn');
    const headerProgressCount = document.getElementById('header-progress-count');
    const progressBarFill = document.getElementById('progress-bar-fill');

    // Candidate Card Elements (ONLY Name, Phone, Email)
    const candidateIndexLabel = document.getElementById('candidate-index-label');
    const candidateStatusBadge = document.getElementById('candidate-status-badge');
    const statusText = document.getElementById('status-text');
    const candidateAvatar = document.getElementById('candidate-avatar');
    const contactedCheckmark = document.getElementById('contacted-checkmark');
    const candidateName = document.getElementById('candidate-name');
    const phoneLink = document.getElementById('phone-link');
    const candidatePhone = document.getElementById('candidate-phone');
    const emailLink = document.getElementById('email-link');
    const candidateEmail = document.getElementById('candidate-email');

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
    // THEME MANAGEMENT ENGINE
    // ----------------------------------------------------
    function initTheme() {
        const savedTheme = localStorage.getItem('call_easy_theme');
        if (savedTheme === 'dark' || savedTheme === 'light') {
            currentTheme = savedTheme;
        } else {
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            currentTheme = prefersDark ? 'dark' : 'light';
        }
        applyTheme(currentTheme);
    }

    function applyTheme(theme) {
        currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('call_easy_theme', theme);

        if (theme === 'dark') {
            themeIconSun.classList.remove('hidden');
            themeIconMoon.classList.add('hidden');
        } else {
            themeIconSun.classList.add('hidden');
            themeIconMoon.classList.remove('hidden');
        }
    }

    function toggleTheme() {
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        showToast(`Switched to ${nextTheme.toUpperCase()} theme`);
    }

    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('call_easy_theme')) {
                applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    // ----------------------------------------------------
    // INITIALIZATION & CANDIDATE FETCHING (API + STATIC FALLBACK)
    // ----------------------------------------------------
    async function init() {
        initTheme();
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
            console.warn('[Backend Offline / GitHub Pages Static Mode]', err);
        }
    }

    // Load candidate list from backend API, or fallback to static candidates.json for GitHub Pages
    async function loadCandidates() {
        // 1. Try Express backend API
        try {
            const res = await fetch('/api/candidates');
            if (res.ok) {
                const data = await res.json();
                if (data.candidates && data.candidates.length > 0) {
                    candidates = data.candidates;
                    syncWithLocalStorageStatus();
                    console.log(`Loaded ${candidates.length} candidates from Express backend API`);
                    return;
                }
            }
        } catch (err) {}

        // 2. Try fetching static candidates.json (works 100% on GitHub Pages static hosting!)
        try {
            const resStatic = await fetch('./candidates.json');
            if (resStatic.ok) {
                const staticData = await resStatic.json();
                if (Array.isArray(staticData) && staticData.length > 0) {
                    candidates = staticData;
                    syncWithLocalStorageStatus();
                    console.log(`Loaded ${candidates.length} candidates from static candidates.json`);
                    return;
                }
            }
        } catch (err) {
            console.warn('Static fetch ./candidates.json failed', err);
        }

        // 3. Fallback to localStorage
        const saved = localStorage.getItem('call_easy_candidates');
        if (saved) {
            try {
                candidates = JSON.parse(saved);
                console.log(`Loaded ${candidates.length} candidates from localStorage`);
                return;
            } catch (e) {}
        }
    }

    function syncWithLocalStorageStatus() {
        const saved = localStorage.getItem('call_easy_candidates');
        if (saved) {
            try {
                const savedList = JSON.parse(saved);
                const statusMap = new Map();
                savedList.forEach(c => {
                    if (c.status) statusMap.set(c.id, c.status);
                });
                candidates.forEach(c => {
                    if (statusMap.has(c.id)) {
                        c.status = statusMap.get(c.id);
                    }
                });
            } catch (e) {}
        }
    }

    // Save candidate state locally
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
    // RENDERING LOGIC (Display Name, Phone, Email ONLY)
    // ----------------------------------------------------
    function renderCandidateCard() {
        if (!candidates || candidates.length === 0) return;

        const candidate = candidates[currentIndex];

        // Header counts & Progress bar
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

        // Candidate Avatar & Name
        const initials = candidate.name
            ? candidate.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
            : 'C';
        candidateAvatar.textContent = initials;
        candidateName.textContent = candidate.name;

        // Candidate Phone & Email
        candidatePhone.textContent = candidate.phone || 'No phone provided';
        phoneLink.href = candidate.phone ? `tel:${candidate.phone.replace(/[^0-9+]/g, '')}` : '#';

        candidateEmail.textContent = candidate.email || 'No email provided';
        emailLink.href = candidate.email ? `mailto:${candidate.email}` : '#';

        // Navigation state
        prevCandidateBtn.disabled = currentIndex === 0;
        nextCandidateBtn.disabled = currentIndex === candidates.length - 1;
        prevCandidateBtn.style.opacity = currentIndex === 0 ? '0.5' : '1';
        nextCandidateBtn.style.opacity = currentIndex === candidates.length - 1 ? '0.5' : '1';

        // Render active call UI state
        renderCallStateUI();
    }

    function renderCallStateUI() {
        if (callState === 'calling') {
            callStatusBanner.classList.remove('hidden');
            callBannerTitle.textContent = `Calling Candidate...`;
            callBannerSub.textContent = `Tap "Mark Call Complete" when call finishes`;
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
    async function handleCallCandidate() {
        const candidate = candidates[currentIndex];
        callState = 'calling';
        renderCallStateUI();

        showToast(`Calling ${candidate.name}...`);

        // Try backend Twilio call API first
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
                if (data.mode === 'live_twilio') {
                    showToast(`Twilio calling your phone! Answer to connect to ${candidate.name}`);
                    return;
                }
            }
        } catch (err) {}

        // Fallback for static hosting (GitHub Pages) or when backend unavailable: trigger device dialer
        if (candidate.phone) {
            window.location.href = `tel:${candidate.phone.replace(/[^0-9+]/g, '')}`;
        }
        showToast(`Dialer opened! Tap "Mark Call Complete" when finished.`);
    }

    async function handleMarkCallComplete() {
        const candidate = candidates[currentIndex];

        // 1. Try backend auto-send endpoint if connected
        try {
            const res = await fetch('/api/complete-call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidateId: candidate.id,
                    companyName: templates.company
                })
            });

            if (res.ok) {
                const data = await res.json();
                candidate.status = 'contacted';
                persistCandidates();
                callState = 'idle';
                renderCandidateCard();
                showToast(`✓ Call Complete! Follow-up sent to ${candidate.name}`);
                return;
            }
        } catch (err) {}

        // 2. Static GitHub Pages Fallback: update status & offer 1-tap WhatsApp follow-up
        candidate.status = 'contacted';
        persistCandidates();
        callState = 'idle';
        renderCandidateCard();

        showToast(`✓ Call Complete! ${candidate.name} marked Contacted.`);

        // Trigger WhatsApp follow-up link for static mode
        if (candidate.phone) {
            setTimeout(() => {
                const cleanPhone = candidate.phone.replace(/[^0-9]/g, '');
                const msg = encodeURIComponent(`Hi ${candidate.name}, thank you for speaking with us today regarding your application at ${templates.company}.`);
                window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
            }, 600);
        }
    }

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
        const currentCandidate = candidates[currentIndex] || { name: 'Sample Candidate' };

        const render = (str) => {
            return (str || '')
                .replace(/\{name\}/g, currentCandidate.name)
                .replace(/\{company\}/g, templateCompany.value || 'Acme Corp');
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
                (candidate.name && candidate.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (candidate.phone && candidate.phone.includes(searchQuery)) ||
                (candidate.email && candidate.email.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesFilter && matchesSearch;
        });

        drawerCandidatesList.innerHTML = '';

        if (filtered.length === 0) {
            drawerCandidatesList.innerHTML = `<div style="text-align:center; padding: 24px; color: var(--text-muted);">No candidates match your filter.</div>`;
            return;
        }

        // Render first 100 matching items for high performance rendering
        const displaySlice = filtered.slice(0, 100);

        displaySlice.forEach((candidate) => {
            const indexInMainList = candidates.findIndex(c => c.id === candidate.id);
            const isCurrent = indexInMainList === currentIndex;

            const item = document.createElement('div');
            item.className = `drawer-candidate-item ${isCurrent ? 'active-item' : ''}`;
            item.innerHTML = `
                <div>
                    <strong style="font-size:0.92rem; display:block; color:var(--text-primary);">${candidate.name}</strong>
                    <span style="font-size:0.78rem; color:var(--text-secondary);">${candidate.phone || candidate.email}</span>
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
        // Theme Switcher Toggle
        themeToggleBtn.addEventListener('click', toggleTheme);

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
            const cleanPhone = (candidate.phone || '').replace(/[^0-9]/g, '');
            const msg = encodeURIComponent(`Hi ${candidate.name}, following up regarding your application at ${templates.company}.`);
            window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
        });

        manualEmailBtn.addEventListener('click', () => {
            const candidate = candidates[currentIndex];
            const subject = encodeURIComponent(`Follow-up: ${templates.company}`);
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

        // Drawer Controls
        listDrawerBtn.addEventListener('click', openListDrawer);
        closeDrawerBtn.addEventListener('click', closeListDrawer);
        listDrawer.addEventListener('click', (e) => {
            if (e.target === listDrawer) closeListDrawer();
        });

        // Search & Filter Inputs
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

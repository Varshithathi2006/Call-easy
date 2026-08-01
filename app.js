/* ==========================================================================
   CALL EASY - MOBILE CANDIDATE OUTREACH SCRIPT
   ========================================================================== */

// ==========================================================================
// 1. EDITABLE MESSAGE TEMPLATES & GLOBAL CONFIGURATION
// ==========================================================================
let COMPANY_NAME = "Amrita Admissions Cell";

let WHATSAPP_TEMPLATE = "Dear {name}, thank you for speaking with our Admissions Office regarding your application for {role} at {company}. Next step: {next_step}. For further queries, call/WhatsApp our Admission Desk at 8122280223!";

let EMAIL_SUBJECT_TEMPLATE = "Official Admission Information & Next Steps - {role}";

let EMAIL_BODY_TEMPLATE = "Dear {name},\n\nThank you for connecting with the Admissions Cell regarding your interest in the {role} program at {company}.\n\nAs discussed during our call, your immediate next step is:\n👉 {next_step}\n\nPlease submit your required documents at your earliest convenience.\n\nFor any admission queries, seat allocation details, or fee structure guidance, feel free to call or WhatsApp our Admissions Desk at 8122280223.\n\nWarm regards,\nAdmissions Office\n{company}\nHotline: 8122280223";


// ==========================================================================
// 2. CANDIDATES DATASET (ADMISSION APPLICANTS JSON ARRAY)
// ==========================================================================
const CANDIDATES_DATA = [
    {
        id: "cand-1",
        name: "Aarav Sharma",
        role: "B.Tech Computer Science",
        phone: "+91 98765 43210",
        email: "aarav.sharma@example.com",
        experience: "Cutoff: 94.5%",
        location: "Chennai, TN",
        nextStep: "Complete Document Verification & Initial Fee Payment"
    },
    {
        id: "cand-2",
        name: "Ananya Verma",
        role: "B.Tech AI & Data Science",
        phone: "+91 98123 45678",
        email: "ananya.verma@example.com",
        experience: "Cutoff: 92.8%",
        location: "Bengaluru, KA",
        nextStep: "Submit 12th Marksheet & Allotment Order"
    },
    {
        id: "cand-3",
        name: "Rohan Kulkarni",
        role: "MBA Business Analytics",
        phone: "+91 97654 32109",
        email: "rohan.kulkarni@example.com",
        experience: "Cutoff: 89.2%",
        location: "Hyderabad, TS",
        nextStep: "Attend Online Counseling Session on Friday at 10 AM"
    },
    {
        id: "cand-4",
        name: "Kavya Reddy",
        role: "B.Tech Electronics & Comm",
        phone: "+91 96543 21098",
        email: "kavya.reddy@example.com",
        experience: "Cutoff: 91.0%",
        location: "Coimbatore, TN",
        nextStep: "Upload Transfer Certificate & Entrance Scorecard"
    },
    {
        id: "cand-5",
        name: "Aditya Nair",
        role: "B.Tech Mechanical Engg",
        phone: "+91 95432 10987",
        email: "aditya.nair@example.com",
        experience: "Cutoff: 88.5%",
        location: "Kochi, KL",
        nextStep: "Fill Hostel Accommodation & Transport Application Form"
    },
    {
        id: "cand-6",
        name: "Meera Patel",
        role: "B.Sc Data Science",
        phone: "+91 94321 09876",
        email: "meera.patel@example.com",
        experience: "Cutoff: 93.1%",
        location: "Ahmedabad, GJ",
        nextStep: "Download & Sign Provisional Admission Letter"
    }
];


// ==========================================================================
// 3. STATE MANAGEMENT & STORAGE KEYS
// ==========================================================================
const STORAGE_CONTACTED_KEY = "call_easy_contacted_ids_v1";
const STORAGE_TEMPLATES_KEY = "call_easy_templates_v1";
const STORAGE_SIMULATOR_KEY = "call_easy_simulator_mode";

let activeCandidateIndex = 0;
let contactedCandidateIds = new Set();
let currentFilter = "all";
let searchQuery = "";


// ==========================================================================
// 4. INITIALIZATION & LOCALSTORAGE SYNC
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    loadSavedState();
    renderActiveCandidate();
    updateQueueDrawer();
    setupEventListeners();
});

function loadSavedState() {
    // Load Contacted Candidates State
    try {
        const savedContacted = localStorage.getItem(STORAGE_CONTACTED_KEY);
        if (savedContacted) {
            contactedCandidateIds = new Set(JSON.parse(savedContacted));
        }
    } catch (e) {
        console.error("Failed to load contacted state", e);
    }

    // Load Custom Message Templates
    try {
        const savedTemplates = localStorage.getItem(STORAGE_TEMPLATES_KEY);
        if (savedTemplates) {
            const parsed = JSON.parse(savedTemplates);
            if (parsed.company) COMPANY_NAME = parsed.company;
            if (parsed.whatsapp) WHATSAPP_TEMPLATE = parsed.whatsapp;
            if (parsed.emailSubject) EMAIL_SUBJECT_TEMPLATE = parsed.emailSubject;
            if (parsed.emailBody) EMAIL_BODY_TEMPLATE = parsed.emailBody;
        }
    } catch (e) {
        console.error("Failed to load custom templates", e);
    }

    // Load Simulator Mode preference
    try {
        if (localStorage.getItem(STORAGE_SIMULATOR_KEY) === "true") {
            document.body.classList.add("simulator-active");
        }
    } catch (e) {}
}

function saveContactedState() {
    try {
        localStorage.setItem(STORAGE_CONTACTED_KEY, JSON.stringify(Array.from(contactedCandidateIds)));
    } catch (e) {
        console.error("Failed to save contacted state", e);
    }
}

function saveTemplatesState() {
    try {
        const data = {
            company: COMPANY_NAME,
            whatsapp: WHATSAPP_TEMPLATE,
            emailSubject: EMAIL_SUBJECT_TEMPLATE,
            emailBody: EMAIL_BODY_TEMPLATE
        };
        localStorage.setItem(STORAGE_TEMPLATES_KEY, JSON.stringify(data));
    } catch (e) {
        console.error("Failed to save templates", e);
    }
}


// ==========================================================================
// 5. DOM ELEMENTS CACHE
// ==========================================================================
const elements = {
    // Desktop overlay & Simulator
    toggleSimulatorBtn: document.getElementById("toggle-simulator-btn"),

    // Header & Counters
    headerProgressCount: document.getElementById("header-progress-count"),
    progressBarFill: document.getElementById("progress-bar-fill"),

    // Card Elements
    cardContainer: document.getElementById("candidate-card"),
    indexLabel: document.getElementById("candidate-index-label"),
    statusBadge: document.getElementById("candidate-status-badge"),
    statusText: document.getElementById("status-text"),
    avatar: document.getElementById("candidate-avatar"),
    name: document.getElementById("candidate-name"),
    role: document.getElementById("candidate-role"),
    exp: document.getElementById("candidate-exp"),
    location: document.getElementById("candidate-location"),
    phoneLink: document.getElementById("phone-link"),
    phoneValue: document.getElementById("candidate-phone"),
    emailLink: document.getElementById("email-link"),
    emailValue: document.getElementById("candidate-email"),
    notes: document.getElementById("candidate-notes"),

    // Footer Buttons
    callActionBtn: document.getElementById("call-action-btn"),
    followupActionBtn: document.getElementById("followup-action-btn"),
    waOnlyBtn: document.getElementById("wa-only-btn"),
    emailOnlyBtn: document.getElementById("email-only-btn"),
    toggleContactedBtn: document.getElementById("toggle-contacted-btn"),
    toggleContactedText: document.getElementById("toggle-contacted-text"),
    prevCandidateBtn: document.getElementById("prev-candidate-btn"),
    nextCandidateBtn: document.getElementById("next-candidate-btn"),

    // Drawer Elements
    listDrawerBtn: document.getElementById("list-drawer-btn"),
    listDrawer: document.getElementById("list-drawer"),
    closeDrawerBtn: document.getElementById("close-drawer-btn"),
    drawerCandidatesList: document.getElementById("drawer-candidates-list"),
    candidateSearchInput: document.getElementById("candidate-search-input"),
    countFilterAll: document.getElementById("count-filter-all"),
    countFilterPending: document.getElementById("count-filter-pending"),
    countFilterContacted: document.getElementById("count-filter-contacted"),
    resetProgressBtn: document.getElementById("reset-progress-btn"),

    // Templates Modal
    templatesBtn: document.getElementById("templates-btn"),
    templatesModal: document.getElementById("templates-modal"),
    closeTemplatesBtn: document.getElementById("close-templates-btn"),
    templateCompanyInput: document.getElementById("template-company"),
    templateWaInput: document.getElementById("template-whatsapp"),
    templateEmailSubInput: document.getElementById("template-email-subject"),
    templateEmailBodyInput: document.getElementById("template-email-body"),
    previewWaText: document.getElementById("preview-whatsapp-text"),
    previewEmailSubText: document.getElementById("preview-email-subject-text"),
    previewEmailBodyText: document.getElementById("preview-email-body-text"),
    saveTemplatesBtn: document.getElementById("save-templates-btn"),
    resetTemplatesBtn: document.getElementById("reset-templates-btn"),

    // Post-Call Modal
    postCallModal: document.getElementById("post-call-modal"),
    closePostCallBtn: document.getElementById("close-post-call-btn"),
    postCallStudentName: document.getElementById("post-call-student-name"),
    postCallContactTarget: document.getElementById("post-call-contact-target"),
    postCallDualBtn: document.getElementById("post-call-dual-btn"),
    postCallWaBtn: document.getElementById("post-call-wa-btn"),
    postCallEmailBtn: document.getElementById("post-call-email-btn"),
    postCallNextBtn: document.getElementById("post-call-next-btn"),

    // Toast
    toast: document.getElementById("toast"),
    toastMessage: document.getElementById("toast-message")
};


// ==========================================================================
// 6. TEMPLATE PARSER & URL GENERATORS
// ==========================================================================
function parseTemplate(templateString, candidate) {
    if (!templateString) return "";
    return templateString
        .replace(/{name}/g, candidate.name)
        .replace(/{role}/g, candidate.role)
        .replace(/{next_step}/g, candidate.nextStep)
        .replace(/{company}/g, COMPANY_NAME);
}

function getCleanPhoneNumber(phoneStr) {
    // Remove spaces, hyphens, parentheses, but preserve leading +
    return phoneStr.replace(/[^\d+]/g, '');
}

function getTelUrl(candidate) {
    const cleanPhone = getCleanPhoneNumber(candidate.phone);
    return `tel:${cleanPhone}`;
}

function getWhatsAppUrl(candidate) {
    const cleanPhone = getCleanPhoneNumber(candidate.phone);
    const text = parseTemplate(WHATSAPP_TEMPLATE, candidate);
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

function getMailtoUrl(candidate) {
    const subject = parseTemplate(EMAIL_SUBJECT_TEMPLATE, candidate);
    const body = parseTemplate(EMAIL_BODY_TEMPLATE, candidate);
    return `mailto:${candidate.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}


// ==========================================================================
// 7. CARD RENDERING & UI UPDATES
// ==========================================================================
function renderActiveCandidate() {
    const candidate = CANDIDATES_DATA[activeCandidateIndex];
    if (!candidate) return;

    const isContacted = contactedCandidateIds.has(candidate.id);

    // Index & Progress Bar
    elements.indexLabel.textContent = `Candidate ${activeCandidateIndex + 1} of ${CANDIDATES_DATA.length}`;
    const progressPercent = ((contactedCandidateIds.size / CANDIDATES_DATA.length) * 100).toFixed(0);
    elements.headerProgressCount.textContent = `${contactedCandidateIds.size}/${CANDIDATES_DATA.length}`;
    elements.progressBarFill.style.width = `${((activeCandidateIndex + 1) / CANDIDATES_DATA.length) * 100}%`;

    // Status Badge
    if (isContacted) {
        elements.cardContainer.classList.add("is-contacted");
        elements.statusBadge.className = "status-badge status-contacted";
        elements.statusText.textContent = "Contacted";
        elements.toggleContactedText.textContent = "Mark Pending";
    } else {
        elements.cardContainer.classList.remove("is-contacted");
        elements.statusBadge.className = "status-badge status-pending";
        elements.statusText.textContent = "Pending";
        elements.toggleContactedText.textContent = "Mark Done";
    }

    // Profile Details
    elements.avatar.textContent = getInitials(candidate.name);
    elements.name.textContent = candidate.name;
    elements.role.textContent = candidate.role;
    elements.exp.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${candidate.experience}`;
    elements.location.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> ${candidate.location}`;

    // Contact Links
    elements.phoneValue.textContent = candidate.phone;
    elements.phoneLink.href = getTelUrl(candidate);

    elements.emailValue.textContent = candidate.email;
    elements.emailLink.href = getMailtoUrl(candidate);

    // Notes
    elements.notes.textContent = candidate.nextStep;

    // Navigation buttons state
    elements.prevCandidateBtn.disabled = activeCandidateIndex === 0;
    elements.nextCandidateBtn.disabled = activeCandidateIndex === CANDIDATES_DATA.length - 1;
}

function getInitials(name) {
    const parts = name.split(" ");
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}


// ==========================================================================
// 8. CORE ACTIONS (CALL, DUAL FOLLOW-UP, WHATSAPP, EMAIL)
// ==========================================================================
function markActiveCandidateAsContacted() {
    const candidate = CANDIDATES_DATA[activeCandidateIndex];
    if (!candidate) return;

    contactedCandidateIds.add(candidate.id);
    saveContactedState();
    renderActiveCandidate();
    updateQueueDrawer();
}

function toggleActiveCandidateContacted() {
    const candidate = CANDIDATES_DATA[activeCandidateIndex];
    if (!candidate) return;

    if (contactedCandidateIds.has(candidate.id)) {
        contactedCandidateIds.delete(candidate.id);
        showToast(`Marked ${candidate.name} as Pending`);
    } else {
        contactedCandidateIds.add(candidate.id);
        showToast(`Marked ${candidate.name} as Contacted ✓`);
    }

    saveContactedState();
    renderActiveCandidate();
    updateQueueDrawer();
}

let postCallCandidateTarget = null;
let postCallTimer = null;

function handleCallAction() {
    const candidate = CANDIDATES_DATA[activeCandidateIndex];
    if (!candidate) return;

    postCallCandidateTarget = candidate;
    const telUrl = getTelUrl(candidate);
    markActiveCandidateAsContacted();
    showToast(`Dialing ${candidate.name}...`);

    // Listen for user returning to browser after phone call ends
    const onReturnFromCall = () => {
        window.removeEventListener("focus", onReturnFromCall);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        clearTimeout(postCallTimer);
        setTimeout(() => {
            if (postCallCandidateTarget) {
                openPostCallModal(postCallCandidateTarget);
            }
        }, 500);
    };

    const onVisibilityChange = () => {
        if (document.visibilityState === "visible") {
            onReturnFromCall();
        }
    };

    window.addEventListener("focus", onReturnFromCall);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Fallback: Open post-call prompt automatically after 3 seconds
    clearTimeout(postCallTimer);
    postCallTimer = setTimeout(() => {
        if (postCallCandidateTarget) {
            openPostCallModal(postCallCandidateTarget);
        }
    }, 3200);

    // Trigger Phone Call Dialer
    window.location.href = telUrl;
}

function openPostCallModal(candidate) {
    elements.postCallStudentName.textContent = `Call Ended for ${candidate.name}`;
    elements.postCallContactTarget.textContent = candidate.name;
    elements.postCallModal.classList.add("active");
}

function closePostCallModal() {
    elements.postCallModal.classList.remove("active");
    postCallCandidateTarget = null;
}

function handleDualFollowupAction() {
    const candidate = CANDIDATES_DATA[activeCandidateIndex];
    if (!candidate) return;

    const waUrl = getWhatsAppUrl(candidate);
    const mailtoUrl = getMailtoUrl(candidate);

    markActiveCandidateAsContacted();
    showToast(`Launching WhatsApp & Email for ${candidate.name}...`);

    // 1. Open WhatsApp in new tab/app window
    window.open(waUrl, "_blank");

    // 2. Open default mail client via location change after tiny delay
    setTimeout(() => {
        window.location.href = mailtoUrl;
    }, 300);
}

function handleWhatsAppAction() {
    const candidate = CANDIDATES_DATA[activeCandidateIndex];
    if (!candidate) return;

    const waUrl = getWhatsAppUrl(candidate);
    markActiveCandidateAsContacted();
    showToast(`Opening WhatsApp for ${candidate.name}...`);

    window.open(waUrl, "_blank");
}

function handleEmailAction() {
    const candidate = CANDIDATES_DATA[activeCandidateIndex];
    if (!candidate) return;

    const mailtoUrl = getMailtoUrl(candidate);
    markActiveCandidateAsContacted();
    showToast(`Opening Email client for ${candidate.name}...`);

    window.location.href = mailtoUrl;
}


// ==========================================================================
// 9. QUEUE DRAWER & FILTERS
// ==========================================================================
function updateQueueDrawer() {
    // Calculate counts
    const totalCount = CANDIDATES_DATA.length;
    const contactedCount = contactedCandidateIds.size;
    const pendingCount = totalCount - contactedCount;

    elements.countFilterAll.textContent = totalCount;
    elements.countFilterPending.textContent = pendingCount;
    elements.countFilterContacted.textContent = contactedCount;

    // Filter & Search candidate list
    const filtered = CANDIDATES_DATA.filter(candidate => {
        const isContacted = contactedCandidateIds.has(candidate.id);
        
        // Filter match
        if (currentFilter === "pending" && isContacted) return false;
        if (currentFilter === "contacted" && !isContacted) return false;

        // Search match
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const nameMatch = candidate.name.toLowerCase().includes(query);
            const roleMatch = candidate.role.toLowerCase().includes(query);
            return nameMatch || roleMatch;
        }

        return true;
    });

    // Render list HTML
    if (filtered.length === 0) {
        elements.drawerCandidatesList.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 0.88rem;">No candidates match your filter.</div>`;
        return;
    }

    elements.drawerCandidatesList.innerHTML = filtered.map(cand => {
        const originalIndex = CANDIDATES_DATA.findIndex(c => c.id === cand.id);
        const isSelected = originalIndex === activeCandidateIndex;
        const isContacted = contactedCandidateIds.has(cand.id);

        return `
            <div class="drawer-item ${isSelected ? 'selected' : ''}" onclick="selectCandidateFromDrawer(${originalIndex})">
                <div class="drawer-item-info">
                    <div class="drawer-avatar">${getInitials(cand.name)}</div>
                    <div>
                        <div class="drawer-item-title">${cand.name} ${isContacted ? '<span style="color:var(--call-green)">✓</span>' : ''}</div>
                        <div class="drawer-item-sub">${cand.role}</div>
                    </div>
                </div>
                <div class="status-badge ${isContacted ? 'status-contacted' : 'status-pending'}">
                    ${isContacted ? 'Contacted' : 'Pending'}
                </div>
            </div>
        `;
    }).join("");
}

// Expose selection to global for inline onclick
window.selectCandidateFromDrawer = function(index) {
    if (index >= 0 && index < CANDIDATES_DATA.length) {
        activeCandidateIndex = index;
        renderActiveCandidate();
        closeDrawer();
        showToast(`Switched to ${CANDIDATES_DATA[index].name}`);
    }
};

function openDrawer() {
    updateQueueDrawer();
    elements.listDrawer.classList.add("active");
}

function closeDrawer() {
    elements.listDrawer.classList.remove("active");
}


// ==========================================================================
// 10. TEMPLATE EDITOR MODAL & PREVIEW
// ==========================================================================
function openTemplatesModal() {
    elements.templateCompanyInput.value = COMPANY_NAME;
    elements.templateWaInput.value = WHATSAPP_TEMPLATE;
    elements.templateEmailSubInput.value = EMAIL_SUBJECT_TEMPLATE;
    elements.templateEmailBodyInput.value = EMAIL_BODY_TEMPLATE;

    updateTemplatePreview();
    elements.templatesModal.classList.add("active");
}

function closeTemplatesModal() {
    elements.templatesModal.classList.remove("active");
}

function updateTemplatePreview() {
    const currentCandidate = CANDIDATES_DATA[activeCandidateIndex] || CANDIDATES_DATA[0];

    const tempCompany = elements.templateCompanyInput.value || COMPANY_NAME;
    const tempWa = elements.templateWaInput.value || WHATSAPP_TEMPLATE;
    const tempSub = elements.templateEmailSubInput.value || EMAIL_SUBJECT_TEMPLATE;
    const tempBody = elements.templateEmailBodyInput.value || EMAIL_BODY_TEMPLATE;

    const dummyCand = {
        name: currentCandidate.name,
        role: currentCandidate.role,
        nextStep: currentCandidate.nextStep,
        company: tempCompany
    };

    elements.previewWaText.textContent = parseTemplate(tempWa, dummyCand);
    elements.previewEmailSubText.textContent = parseTemplate(tempSub, dummyCand);
    elements.previewEmailBodyText.textContent = parseTemplate(tempBody, dummyCand);
}

function saveCustomTemplates() {
    COMPANY_NAME = elements.templateCompanyInput.value.trim() || "TechCorp Talent";
    WHATSAPP_TEMPLATE = elements.templateWaInput.value.trim() || WHATSAPP_TEMPLATE;
    EMAIL_SUBJECT_TEMPLATE = elements.templateEmailSubInput.value.trim() || EMAIL_SUBJECT_TEMPLATE;
    EMAIL_BODY_TEMPLATE = elements.templateEmailBodyInput.value.trim() || EMAIL_BODY_TEMPLATE;

    saveTemplatesState();
    renderActiveCandidate();
    closeTemplatesModal();
    showToast("Message templates updated!");
}

function resetCustomTemplates() {
    COMPANY_NAME = "TechCorp Talent";
    WHATSAPP_TEMPLATE = "Hi {name}! 👋 Following up regarding your application for the {role} position at {company}. Next step: {next_step}. Let me know your availability!";
    EMAIL_SUBJECT_TEMPLATE = "Application Update: {role} at {company}";
    EMAIL_BODY_TEMPLATE = "Hi {name},\n\nIt was great connecting with you about the {role} role at {company}.\n\nAs a quick follow-up, here is our next step: {next_step}.\n\nPlease reply to this email with your preferred times for a conversation.\n\nBest regards,\nTalent Acquisition Team\n{company}";

    saveTemplatesState();
    openTemplatesModal();
    showToast("Reset templates to default.");
}


// ==========================================================================
// 11. TOAST & UTILITIES
// ==========================================================================
let toastTimeout;
function showToast(message) {
    clearTimeout(toastTimeout);
    elements.toastMessage.textContent = message;
    elements.toast.classList.add("show");
    toastTimeout = setTimeout(() => {
        elements.toast.classList.remove("show");
    }, 2800);
}

function navigateCandidate(direction) {
    const card = elements.cardContainer;
    
    if (direction === "next" && activeCandidateIndex < CANDIDATES_DATA.length - 1) {
        card.classList.add("card-slide-next");
        setTimeout(() => {
            activeCandidateIndex++;
            renderActiveCandidate();
            card.classList.remove("card-slide-next");
        }, 150);
    } else if (direction === "prev" && activeCandidateIndex > 0) {
        card.classList.add("card-slide-prev");
        setTimeout(() => {
            activeCandidateIndex--;
            renderActiveCandidate();
            card.classList.remove("card-slide-prev");
        }, 150);
    }
}


// ==========================================================================
// 12. EVENT LISTENERS SETUP
// ==========================================================================
function setupEventListeners() {
    // Simulator Toggle
    elements.toggleSimulatorBtn.addEventListener("click", () => {
        document.body.classList.toggle("simulator-active");
        const isActive = document.body.classList.contains("simulator-active");
        localStorage.setItem(STORAGE_SIMULATOR_KEY, isActive);
    });

    // Primary Action Buttons
    elements.callActionBtn.addEventListener("click", handleCallAction);
    elements.followupActionBtn.addEventListener("click", handleDualFollowupAction);

    // Sub Buttons
    elements.waOnlyBtn.addEventListener("click", handleWhatsAppAction);
    elements.emailOnlyBtn.addEventListener("click", handleEmailAction);
    elements.toggleContactedBtn.addEventListener("click", toggleActiveCandidateContacted);

    // Navigation
    elements.prevCandidateBtn.addEventListener("click", () => navigateCandidate("prev"));
    elements.nextCandidateBtn.addEventListener("click", () => navigateCandidate("next"));

    // Queue Drawer
    elements.listDrawerBtn.addEventListener("click", openDrawer);
    elements.closeDrawerBtn.addEventListener("click", closeDrawer);
    elements.listDrawer.addEventListener("click", (e) => {
        if (e.target === elements.listDrawer) closeDrawer();
    });

    // Drawer Filters & Search
    elements.candidateSearchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        updateQueueDrawer();
    });

    document.querySelectorAll(".filter-pill").forEach(pill => {
        pill.addEventListener("click", (e) => {
            document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
            e.target.classList.add("active");
            currentFilter = e.target.getAttribute("data-filter");
            updateQueueDrawer();
        });
    });

    elements.resetProgressBtn.addEventListener("click", () => {
        if (confirm("Reset contact progress for all candidates?")) {
            contactedCandidateIds.clear();
            saveContactedState();
            renderActiveCandidate();
            updateQueueDrawer();
            showToast("Progress reset for all candidates.");
        }
    });

    // Templates Modal
    elements.templatesBtn.addEventListener("click", openTemplatesModal);
    elements.closeTemplatesBtn.addEventListener("click", closeTemplatesModal);
    elements.templatesModal.addEventListener("click", (e) => {
        if (e.target === elements.templatesModal) closeTemplatesModal();
    });

    // Live preview update on input
    const templateInputs = [
        elements.templateCompanyInput,
        elements.templateWaInput,
        elements.templateEmailSubInput,
        elements.templateEmailBodyInput
    ];
    templateInputs.forEach(input => {
        input.addEventListener("input", updateTemplatePreview);
    });

    elements.saveTemplatesBtn.addEventListener("click", saveCustomTemplates);
    elements.resetTemplatesBtn.addEventListener("click", resetCustomTemplates);

    // Post-Call Modal Listeners
    elements.closePostCallBtn.addEventListener("click", closePostCallModal);
    elements.postCallModal.addEventListener("click", (e) => {
        if (e.target === elements.postCallModal) closePostCallModal();
    });
    elements.postCallDualBtn.addEventListener("click", () => {
        closePostCallModal();
        handleDualFollowupAction();
    });
    elements.postCallWaBtn.addEventListener("click", () => {
        closePostCallModal();
        handleWhatsAppAction();
    });
    elements.postCallEmailBtn.addEventListener("click", () => {
        closePostCallModal();
        handleEmailAction();
    });
    elements.postCallNextBtn.addEventListener("click", () => {
        closePostCallModal();
        navigateCandidate("next");
    });

    // Touch Swipe Navigation gesture support on Card
    let touchStartX = 0;
    let touchEndX = 0;

    elements.cardContainer.addEventListener("touchstart", (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    elements.cardContainer.addEventListener("touchend", (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipeGesture();
    }, { passive: true });

    function handleSwipeGesture() {
        const swipeThreshold = 50;
        if (touchEndX < touchStartX - swipeThreshold) {
            navigateCandidate("next");
        } else if (touchEndX > touchStartX + swipeThreshold) {
            navigateCandidate("prev");
        }
    }
}

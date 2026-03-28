'use strict';

/**
 * CLIENT-SIDE UI LOGIC: ARCA Master Infrastructure v3.0
 * Native Google Services Fusion & Material Design 3 Implementation
 */

const sanitizeHTML = (str) => {
    if(!str) return '';
    const span = document.createElement('span');
    span.textContent = str;
    return span.innerHTML;
};

const TriageState = { 
    payload: { text: '', image: null, audio: null, location: null },
    isProcessing: false
};

const ARCA_API = {
    removeChip: (type, btn) => {
        TriageState.payload[type] = null;
        btn.parentElement.remove();
        document.getElementById("btn-" + type).classList.remove('active');
        if (type === 'image') document.getElementById('file-upload').value = '';
        announce('Removed ' + type + ' attachment.');
    }
};
window.ARIA_API = ARCA_API; // Maintain compatibility with existing UI hooks

function announce(msg) {
    const live = document.getElementById('a11y-announcer');
    if(live) live.textContent = msg;
}

document.addEventListener('DOMContentLoaded', () => {

    const ui = {
        processBtn: document.getElementById('process-btn'),
        inputSection: document.querySelector('.input-section'),
        processingSection: document.getElementById('processing-view'),
        outputSection: document.getElementById('output-view'),
        resetBtn: document.getElementById('reset-btn'),
        intentOutput: document.getElementById('intent-output'),
        actionOutput: document.getElementById('action-output'),
        confirmationOutput: document.getElementById('confirmation-output'),
        urgencyBadge: document.getElementById('urgency-badge'),
        urgencyText: document.getElementById('urgency-text'),
        chaosInput: document.getElementById('chaos-input'),
        ambientOutput: document.getElementById('ambient-output'),
        intelOutput: document.getElementById('intel-output'),
        attachmentsArea: document.getElementById('attachments-area'),
        outputHeading: document.getElementById('output-heading')
    };

    // Initialize A11y Announcer if missing
    if(!document.getElementById('a11y-announcer')) {
        const ann = document.createElement('div');
        ann.id = 'a11y-announcer';
        ann.className = 'sr-only';
        ann.setAttribute('aria-live', 'polite');
        document.body.appendChild(ann);
    }

    // --- DOODLE SIGNAL HANDLERS ---
    
    document.querySelectorAll('.doodle-letter').forEach(letter => {
        letter.addEventListener('click', () => {
            const signal = letter.getAttribute('data-signal');
            letter.classList.add('signal-trigger-animation');
            setTimeout(() => letter.classList.remove('signal-trigger-animation'), 400);

            switch(signal) {
                case 'acoustic':
                    document.getElementById('btn-audio').click();
                    announce('ARCA: Acoustic Signal Vector Activated.');
                    break;
                case 'routing':
                    document.getElementById('btn-sensor').click();
                    announce('ARCA: Routing & GPS Signal Vector Pinged.');
                    break;
                case 'context':
                    ui.processBtn.click();
                    announce('ARCA: Querying Global Cloud Context Signals...');
                    break;
                case 'alert':
                    document.getElementById('family-alert-btn').click();
                    announce('ARCA: Broadcasting Emergency Alert Signal.');
                    break;
            }
        });
    });

    // --- INPUT HANDLERS ---
    
    document.querySelectorAll('.prompt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
             ui.chaosInput.value = btn.getAttribute('data-text');
             announce('Scenario loaded: ' + btn.textContent);
             if(!TriageState.payload.location) {
                 // Simulate acquisition
                 TriageState.payload.location = { lat: 40.7128, lon: -74.0060 };
                 addChip('sensor', '<ion-icon name="location" aria-hidden="true"></ion-icon> GPS SECURED: NYC CLUSTER');
                 document.getElementById('btn-sensor').classList.add('active');
             }
        });
    });

    document.getElementById('btn-sensor').addEventListener('click', () => {
        if ("geolocation" in navigator) {
            announce('Acquiring high-accuracy Google Maps location...');
            document.getElementById('btn-sensor').style.animation = 'pulse 1s infinite';
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    document.getElementById('btn-sensor').style.animation = 'none';
                    TriageState.payload.location = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                    addChip('sensor', '<ion-icon name="location" aria-hidden="true"></ion-icon> ' + pos.coords.latitude.toFixed(4) + ', ' + pos.coords.longitude.toFixed(4));
                    document.getElementById('btn-sensor').classList.add('active');
                    announce('Location locked via Google Geolocation API.');
                },
                () => {
                    document.getElementById('btn-sensor').style.animation = 'none';
                    alert("Location access denied. Dispatch accuracy will be reduced.");
                }
            );
        }
    });

    // --- PROCESSING & API CORE ---

    ui.processBtn.addEventListener('click', async () => {
        if(TriageState.isProcessing) return;
        TriageState.payload.text = ui.chaosInput.value.trim();
        
        if(!TriageState.payload.text && !TriageState.payload.image && !TriageState.payload.audio) {
            ui.chaosInput.focus();
            announce('Error: Input required for ARCA triage.');
            return;
        }

        TriageState.isProcessing = true;
        document.querySelector('.test-prompts').classList.add('hidden');
        ui.inputSection.classList.add('hidden');
        ui.processingSection.classList.remove('hidden');
        ui.processingSection.classList.add('slide-up');
        
        // Progress Mock
        const steps = document.querySelectorAll('.step');
        let stepIdx = 0;
        const interval = setInterval(() => {
            if(stepIdx < steps.length) {
                steps[stepIdx].className = 'step active';
                if(stepIdx > 0) steps[stepIdx-1].className = 'step done';
                stepIdx++;
            } else {
                clearInterval(interval);
            }
        }, 800);

        try {
            const response = await fetch('/api/triage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(TriageState.payload)
            });

            if(!response.ok) throw new Error("ARCA Engine Downstream Failure");
            const data = await response.json();
            
            clearInterval(interval);
            renderOutput(data);
        } catch(err) {
            announce('Critical failure in ARCA command stream.');
            alert(err.message);
            location.reload();
        } finally {
            TriageState.isProcessing = false;
        }
    });

    // --- OUTPUT RENDERING ENGINE (MAPS v3.0) ---

    function renderOutput(res) {
        ui.processingSection.classList.add('hidden');
        ui.outputSection.classList.remove('hidden');
        ui.outputSection.classList.add('slide-up');
        ui.outputHeading.focus();

        // 1. URGENCY & BRANDING
        const tier = res.triage?.urgency_tier || 'LOW';
        let color = '#4285F4'; // Google Blue
        if(tier === 'CRITICAL') color = '#EA4335'; // Google Red
        else if(tier === 'HIGH' || tier === 'MEDIUM') color = '#FBBC04'; // Google Yellow
        else color = '#34A853'; // Google Green

        // SILENT OVERRIDE
        if(res.triage?.silent_mode) color = '#800000'; 

        setUrgencyUI(tier, color);

        // 2. CONTEXT CARD
        ui.intentOutput.innerHTML = `
            <strong>Infrastructure Node:</strong> ${sanitizeHTML(res.arca_version)}<br>
            <strong>Intent:</strong> ${sanitizeHTML(res.triage?.intent_class)}<br>
            <strong>Authentication:</strong> Google Workload Verified
        `;

        // 3. INTEL GRID (Weather/News/Maps)
        ui.intelOutput.innerHTML = '';
        const intel = [];
        
        // Weather Intel
        const w = res.weather_intelligence?.disaster_risk_scores || {};
        if(w.flood > 50) intel.push({icon:'water', text: `FLOOD RISK: ${w.flood}%`, color:'#4285F4'});
        if(w.wildfire > 50) intel.push({icon:'flame', text: `FIRE RISK: ${w.wildfire}%`, color:'#EA4335'});
        
        // News Intel
        res.news_intelligence?.corroborated_events?.forEach(ev => {
            intel.push({icon:'newspaper', text: `NEWS: ${ev.headline}`, color:'#FBBC04'});
        });

        // Maps Intel
        const gm = res.google_maps || {};
        if(gm.plus_code) intel.push({icon:'location', text: `PlusCode: ${gm.plus_code}`, color:'#4285F4'});
        if(gm.primary_dispatch_route?.eta_minutes) intel.push({icon:'time', text: `ETA: ${gm.primary_dispatch_route.eta_minutes}m`, color:'#34A853'});

        intel.forEach(item => {
            const tag = document.createElement('div');
            tag.className = 'ambient-tag';
            tag.style.borderLeft = `3px solid ${item.color}`;
            tag.innerHTML = `<ion-icon name="${item.icon}-outline"></ion-icon> ${sanitizeHTML(item.text)}`;
            ui.intelOutput.appendChild(tag);
        });

        // 4. ACTION PROTOCOL
        const steps = res.action_protocol?.immediate_0_4min || [];
        ui.actionOutput.textContent = steps.join('\n') || "Establishing secure perimeter...";

        // 5. CONFIRMATION
        const conf = res.confirmations || {};
        ui.confirmationOutput.innerHTML = `
            <div style="font-size:1.1rem; margin-bottom:10px">${sanitizeHTML(conf.caller_message)}</div>
            <div style="font-size:0.8rem; color:var(--text-secondary); border-top:1px solid var(--panel-border); padding-top:5px">
                <em>Mirror: ${sanitizeHTML(conf.english_mirror)}</em><br>
                <strong>Brief:</strong> ${sanitizeHTML(conf.dispatcher_brief)}
            </div>
            <a href="${gm.maps_deeplink || '#'}" target="_blank" class="maps-link" style="color:#4285F4; display:block; margin-top:10px">
                <ion-icon name="map"></ion-icon> Open Google Maps Navigation
            </a>
        `;

        announce(`Triage complete. Level: ${tier}. Dispatching units via ${gm.primary_dispatch_route?.destination || 'nearest hub'}.`);
    }

    function setUrgencyUI(level, color) {
        ui.urgencyText.textContent = level;
        ui.urgencyBadge.style.color = color;
        ui.urgencyBadge.style.borderColor = color;
        ui.urgencyBadge.style.background = `${color}22`;
        
        const btn = document.querySelector('.dispatch-btn');
        btn.style.background = color;
        btn.style.boxShadow = `0 8px 30px ${color}66`;
    }

    // --- HELPERS ---

    function addChip(type, html) {
        const chip = document.createElement('div');
        chip.className = `attachment-chip chip-${type}`;
        chip.innerHTML = `${html} <button class='remove-btn' onclick='ARIA_API.removeChip("${type}", this)'><ion-icon name="close-circle"></ion-icon></button>`;
        ui.attachmentsArea.appendChild(chip);
    }

    function formatTime(s) { return Math.floor(s/60).toString().padStart(2,'0')+':'+(s%60).toString().padStart(2,'0'); }

    // --- RESET ---
    ui.resetBtn.addEventListener('click', () => {
        ui.outputSection.classList.add('hidden');
        ui.inputSection.classList.remove('hidden');
        document.querySelector('.test-prompts').classList.remove('hidden');
        ui.chaosInput.value = '';
        ui.attachmentsArea.innerHTML = '';
        TriageState.payload = { text: '', image: null, audio: null, location: null };
        announce('ARCA System Reset. Ready for input.');
    });

});

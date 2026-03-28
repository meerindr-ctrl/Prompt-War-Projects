'use strict';

/**
 * CLIENT-SIDE UI LOGIC: ARIA Emergency App - Global Scaled
 * Separated from Google ML intelligence to harden network security and scalability.
 */

const sanitizeHTML = (str) => {
    if(!str) return '';
    const span = document.createElement('span');
    span.textContent = str;
    return span.innerHTML;
};

const TriageState = {
    payload: { text: '', image: null, audio: null, location: null }
};

const ARIA_CLIENT_API = {
    removeChip: (type, btn) => {
        TriageState.payload[type] = null;
        btn.parentElement.remove();
        document.getElementById("btn-" + type).classList.remove('active');
        if (type === 'image') document.getElementById('file-upload').value = '';
    }
};
window.ARIA_API = ARIA_CLIENT_API;

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
        attachmentsArea: document.getElementById('attachments-area'),
        outputHeading: document.getElementById('output-heading')
    };

    document.querySelectorAll('.prompt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
             ui.chaosInput.value = btn.getAttribute('data-text');
             if(!TriageState.payload.location) {
                 TriageState.payload.location = { lat: "40.7128", lon: "-74.0060" };
                 addChip('sensor', '<ion-icon name="location" aria-hidden="true"></ion-icon> GPS SECURED: 40.7128, -74.0060');
                 document.getElementById('btn-sensor').classList.add('active');
             }
        });
    });

    document.getElementById('btn-sensor').addEventListener('click', () => {
        if ("geolocation" in navigator) {
            document.getElementById('btn-sensor').style.animation = 'pulse 1s infinite';
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    document.getElementById('btn-sensor').style.animation = 'none';
                    const lat = pos.coords.latitude.toFixed(5);
                    const lon = pos.coords.longitude.toFixed(5);
                    TriageState.payload.location = { lat, lon };
                    addChip('sensor', '<ion-icon name="location" aria-hidden="true"></ion-icon> ' + sanitizeHTML(lat) + ', ' + sanitizeHTML(lon));
                    document.getElementById('btn-sensor').classList.add('active');
                },
                (err) => {
                    document.getElementById('btn-sensor').style.animation = 'none';
                    alert("Secure GPS blocked. Check browser permissions.");
                },
                { timeout: 10000, enableHighAccuracy: true }
            );
        }
    });

    document.getElementById('file-upload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(file) {
            if(file.size > 8 * 1024 * 1024) return alert("Image exceeds 8MB parsing limit.");
            const reader = new FileReader();
            reader.onload = (ev) => {
                TriageState.payload.image = ev.target.result;
                addChip('image', '<img src="' + ev.target.result + '" alt="Visually parsed trauma data"><span class="sr-only">Image Securely Loaded</span>');
                document.getElementById('btn-image').classList.add('active');
            };
            reader.readAsDataURL(file);
        }
    });

    let mediaRecorder; let audioChunks = []; let recordInterval; let recordSeconds = 0;

    document.getElementById('btn-audio').addEventListener('click', async () => {
        if(document.getElementById('btn-audio').classList.contains('active')) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = (e) => { if(e.data.size > 0) audioChunks.push(e.data); };
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                TriageState.payload.audio = URL.createObjectURL(audioBlob); 
                addChip('audio', '<ion-icon name="mic" aria-hidden="true"></ion-icon> Audio Signature (' + formatTime(recordSeconds) + ')');
                document.getElementById('btn-audio').classList.add('active');
                document.getElementById('audio-visualizer').classList.add('hidden');
                clearInterval(recordInterval);
                stream.getTracks().forEach(t => t.stop());
                audioChunks = [];
            };

            document.getElementById('audio-visualizer').classList.remove('hidden');
            recordSeconds = 0;
            document.getElementById('recording-time').textContent = '00:00';
            recordInterval = setInterval(() => {
                recordSeconds++;
                document.getElementById('recording-time').textContent = formatTime(recordSeconds);
            }, 1000);
            mediaRecorder.start();
        } catch (err) { alert('Mic blocked.'); }
    });

    document.getElementById('btn-stop-audio').addEventListener('click', () => {
        if(mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
    });

    function formatTime(sec) {
        return Math.floor(sec / 60).toString().padStart(2, '0') + ':' + (sec % 60).toString().padStart(2, '0');
    }

    function addChip(type, htmlContent) {
        const existing = document.querySelector(".chip-" + type);
        if(existing) existing.remove();
        const chip = document.createElement('div');
        chip.className = "attachment-chip chip-" + type;
        chip.innerHTML = htmlContent + " <button class='remove-btn' aria-label='Drop payload' onclick='ARIA_API.removeChip(\"" + type + "\", this)'><ion-icon name='close-circle' aria-hidden='true'></ion-icon></button>";
        ui.attachmentsArea.appendChild(chip);
    }

    ui.processBtn.addEventListener('click', async () => {
        TriageState.payload.text = ui.chaosInput.value.trim();
        if(!TriageState.payload.text && !TriageState.payload.image && !TriageState.payload.audio && !TriageState.payload.location) {
            ui.chaosInput.focus();
            return;
        }

        document.querySelector('.test-prompts').classList.add('hidden');
        ui.inputSection.classList.add('hidden');
        ui.processingSection.classList.remove('hidden');
        ui.processingSection.classList.add('slide-up');
        document.querySelectorAll('.step')[0].classList.add('active'); 

        try {
            const response = await fetch('/api/triage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(TriageState.payload)
            });

            if(!response.ok) throw new Error("API Failure.");
            const secureData = await response.json();

            document.querySelectorAll('.step').forEach(s => s.classList.replace('active', 'done'));
            document.querySelectorAll('.step ion-icon').forEach(i => i.name = 'checkmark-done-circle');
            
            setTimeout(() => renderOutput(secureData), 750);

        } catch(error) {
            alert(error.message);
            ui.resetBtn.click();
        }
    });

    function renderOutput(result) {
        ui.processingSection.classList.add('hidden');
        ui.outputSection.classList.remove('hidden');
        ui.outputSection.classList.add('slide-up');
        ui.outputHeading.focus();

        let tColor = '#eab308';
        if (result.triage && result.triage.urgency_tier === 'CRITICAL') tColor = '#ef4444';
        if (result.triage && result.triage.urgency_tier === 'HIGH') tColor = '#f97316';
        if (result.triage && result.triage.urgency_tier === 'LOW') tColor = '#22c55e';
        if (result.triage && (result.triage.silent_mode || (result.triage.intent_class || '').toLowerCase().includes("threat"))) tColor = '#800000';

        setUrgency((result.triage && result.triage.urgency_tier) || 'UNKNOWN', tColor);
        
        ui.intentOutput.innerHTML = "<strong>Protocol:</strong> " + sanitizeHTML(result.country_protocol) + "<br/>" +
                                     "<strong>Intent:</strong> " + sanitizeHTML(result.triage && result.triage.intent_class) + "<br/>" +
                                     "<strong>Language Node:</strong> " + sanitizeHTML(result.language_detected);
        
        ui.actionOutput.textContent = JSON.stringify(result, null, 2); 
        ui.confirmationOutput.innerHTML = "<strong>Sender:</strong> " + sanitizeHTML(result.confirmation_multilingual && result.confirmation_multilingual.caller_message) + "<br/>" +
                                           "<strong>Dispatcher Mirror:</strong> " + sanitizeHTML(result.confirmation_multilingual && result.confirmation_multilingual.english_mirror); 

        ui.ambientOutput.innerHTML = '';
        const tags = [];
        if(result.dispatch && result.dispatch.primary_unit) tags.push({icon:'car', text: "Primary: " + result.dispatch.primary_unit});
        if(result.extracted_intelligence && result.extracted_intelligence.time_critical_window) tags.push({icon:'timer', text: "Window: " + result.extracted_intelligence.time_critical_window});
        if(result.triage && result.triage.silent_mode) tags.push({icon:'mic-off', text: 'SILENT DISPATCH ENABLED'});
        
        tags.forEach(item => {
            const tag = document.createElement('div');
            tag.className = 'ambient-tag';
            tag.innerHTML = "<ion-icon name='" + item.icon + "-outline' aria-hidden='true'></ion-icon> " + sanitizeHTML(item.text);
            ui.ambientOutput.appendChild(tag);
        });
    }

    function setUrgency(level, color) {
        ui.urgencyText.textContent = level;
        ui.urgencyBadge.style.color = color;
        ui.urgencyBadge.style.borderColor = color;
        
        const bigint = parseInt(color.replace('#', ''), 16) || 0;
        const rgb = ((bigint >> 16) & 255) + ", " + ((bigint >> 8) & 255) + ", " + (bigint & 255);
        ui.urgencyBadge.style.background = "rgba(" + rgb + ", 0.15)";
        
        const dispatchBtn = document.querySelector('.dispatch-btn');
        dispatchBtn.style.background = color;
        dispatchBtn.style.boxShadow = "0 6px 20px rgba(" + rgb + ", 0.4)";
    }

    ui.resetBtn.addEventListener('click', () => {
        ui.outputSection.classList.add('hidden');
        ui.outputSection.classList.remove('slide-up');
        document.querySelector('.test-prompts').classList.remove('hidden');
        
        document.querySelectorAll('.step').forEach(s => {
            s.className = 'step pending';
            s.querySelector('ion-icon').name = 'checkmark-circle';
        });

        ui.chaosInput.value = '';
        ui.attachmentsArea.innerHTML = '';
        document.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('active'));
        
        TriageState.payload = { text: '', image: null, audio: null, location: null };
        ui.inputSection.classList.remove('hidden');
    });

    document.querySelector('.dispatch-btn').addEventListener('click', (e) => {
        const btn = e.currentTarget;
        const oText = btn.innerHTML;
        btn.innerHTML = '<ion-icon name="checkmark-done" aria-hidden="true"></ion-icon> High-Priority Link Dispatched';
        setTimeout(() => btn.innerHTML = oText, 3500);
    });

    document.getElementById('family-alert-btn').addEventListener('click', async () => {
        let mapsLink = "No GPS signal acquired yet.";
        const payloadText = ui.chaosInput.value.trim();
        if (TriageState.payload.location) {
            mapsLink = "https://maps.google.com/?q=" + TriageState.payload.location.lat + "," + TriageState.payload.location.lon;
        } else {
            if ('geolocation' in navigator) {
                try {
                    const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, {timeout: 5000}));
                    mapsLink = "https://maps.google.com/?q=" + pos.coords.latitude + "," + pos.coords.longitude;
                } catch(e) {}
            }
        }
        
        const shareData = {
            title: '🚨 EMERGENCY ALERT',
            text: "🚨 URGENT: I need help!" + (payloadText ? ' (' + payloadText + ')' : '') + "\n\nMy exact location: " + mapsLink
        };

        if (navigator.share) {
            try { await navigator.share(shareData); } catch (err) { if(err.name !== 'AbortError') console.error(err); }
        } else {
            try { await navigator.clipboard.writeText(shareData.text); alert('🚨 Emergency info copied to clipboard. Paste and send to family.'); } catch(e) {}
        }
    });

});

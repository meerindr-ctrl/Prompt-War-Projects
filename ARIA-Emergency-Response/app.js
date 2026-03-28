document.addEventListener('DOMContentLoaded', () => {
    const processBtn = document.getElementById('process-btn');
    const inputSection = document.querySelector('.input-section');
    const processingSection = document.getElementById('processing-view');
    const outputSection = document.getElementById('output-view');
    const resetBtn = document.getElementById('reset-btn');

    const intentOutput = document.getElementById('intent-output');
    const actionOutput = document.getElementById('action-output');
    const confirmationOutput = document.getElementById('confirmation-output');
    const urgencyBadge = document.getElementById('urgency-badge');
    const urgencyText = document.getElementById('urgency-text');
    const chaosInput = document.getElementById('chaos-input');
    const ambientOutput = document.getElementById('ambient-output');
    const attachmentsArea = document.getElementById('attachments-area');
    
    // Multi-modal state
    let payload = {
        text: '',
        image: null,
        audio: null,
        location: null
    };

    // ----- UI Test Scenarios -----
    document.querySelectorAll('.prompt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
             chaosInput.value = btn.getAttribute('data-text');
             // ping sensor automatically for immersion
             if(!payload.location) {
                 payload.location = { lat: "40.7128", lon: "-74.0060" };
                 addChip('sensor', `<ion-icon name="location"></ion-icon> 40.7128, -74.0060`);
                 document.getElementById('btn-sensor').classList.add('active');
             }
        });
    });

    // ----- Sensor Logic -----
    document.getElementById('btn-sensor').addEventListener('click', () => {
        if ("geolocation" in navigator) {
            document.getElementById('btn-sensor').style.animation = 'pulse 1s infinite';
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    document.getElementById('btn-sensor').style.animation = 'none';
                    const lat = position.coords.latitude.toFixed(5);
                    const lon = position.coords.longitude.toFixed(5);
                    payload.location = { lat, lon };
                    addChip('sensor', `<ion-icon name="location"></ion-icon> ${lat}, ${lon}`);
                    document.getElementById('btn-sensor').classList.add('active');
                },
                (err) => {
                    document.getElementById('btn-sensor').style.animation = 'none';
                    alert('Sensor access denied: ' + err.message);
                },
                { timeout: 10000 }
            );
        } else {
            alert('Geolocation is not supported by this browser.');
        }
    });

    // ----- Image Upload Logic -----
    document.getElementById('file-upload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                payload.image = ev.target.result;
                addChip('image', `<img src="${ev.target.result}" alt="upload"> Attached Image`);
                document.getElementById('btn-image').classList.add('active');
            };
            reader.readAsDataURL(file);
        }
    });

    // ----- Audio Recording Logic -----
    let mediaRecorder;
    let audioChunks = [];
    let recordInterval;
    let recordSeconds = 0;
    
    const audioVis = document.getElementById('audio-visualizer');
    const recTime = document.getElementById('recording-time');

    document.getElementById('btn-audio').addEventListener('click', async () => {
        if(document.getElementById('btn-audio').classList.contains('active')) {
            alert('You already recorded an audio clip. Remove it first to re-record.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            
            mediaRecorder.ondataavailable = (e) => {
                if(e.data.size > 0) audioChunks.push(e.data);
            };
            
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                payload.audio = URL.createObjectURL(audioBlob);
                addChip('audio', `<ion-icon name="mic"></ion-icon> Audio Note (${formatTime(recordSeconds)})`);
                document.getElementById('btn-audio').classList.add('active');
                
                // Cleanup UI
                audioVis.classList.add('hidden');
                clearInterval(recordInterval);
                stream.getTracks().forEach(t => t.stop());
                audioChunks = [];
            };

            // Start UI
            audioVis.classList.remove('hidden');
            recordSeconds = 0;
            recTime.textContent = '00:00';
            recordInterval = setInterval(() => {
                recordSeconds++;
                recTime.textContent = formatTime(recordSeconds);
            }, 1000);

            mediaRecorder.start();
        } catch (err) {
            alert('Microphone access denied or unavailable.');
        }
    });

    document.getElementById('btn-stop-audio').addEventListener('click', () => {
        if(mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
    });

    function formatTime(sec) {
        const m = Math.floor(sec / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    // ----- Chip Management -----
    function addChip(type, htmlContent) {
        const existing = document.querySelector(`.chip-${type}`);
        if(existing) existing.remove();

        const chip = document.createElement('div');
        chip.className = `attachment-chip chip-${type}`;
        chip.innerHTML = `
            ${htmlContent}
            <button class="remove-btn" onclick="removeChip('${type}', this)"><ion-icon name="close-circle"></ion-icon></button>
        `;
        attachmentsArea.appendChild(chip);
    }

    window.removeChip = (type, btn) => {
        payload[type] = null;
        btn.parentElement.remove();
        document.getElementById(`btn-${type}`).classList.remove('active');
        if (type === 'image') document.getElementById('file-upload').value = '';
    };

    // ----- Deep Context Triaging & Output Logic -----
    processBtn.addEventListener('click', () => {
        payload.text = document.getElementById('chaos-input').value.trim();
        
        if(!payload.text && !payload.image && !payload.audio && !payload.location) {
            inputSection.style.transform = 'translateY(10px)';
            setTimeout(() => inputSection.style.transform = 'translateY(-10px)', 100);
            setTimeout(() => inputSection.style.transform = 'translateY(0)', 200);
            return;
        }

        document.querySelector('.test-prompts').classList.add('hidden');
        inputSection.classList.add('hidden');
        processingSection.classList.remove('hidden');
        processingSection.classList.add('slide-up');

        const steps = document.querySelectorAll('.step');
        let stepIndex = 0;
        
        const advanceStep = () => {
            if(stepIndex > 0) {
                steps[stepIndex-1].classList.remove('active');
                steps[stepIndex-1].classList.add('done');
                steps[stepIndex-1].querySelector('ion-icon').name = 'checkmark-done-circle';
            }
            if(stepIndex < steps.length) {
                steps[stepIndex].classList.remove('pending');
                steps[stepIndex].classList.add('active');
                setTimeout(advanceStep, 600 + Math.random() * 600);
                stepIndex++;
            } else {
                setTimeout(showOutput, 500);
            }
        };

        advanceStep();
    });

    function getGPSPayload() {
        return payload.location ? `LAT ${payload.location.lat}, LON ${payload.location.lon}` : 'NO GPS SIGNAL - Using Cell Triangulation';
    }

    function showOutput() {
        processingSection.classList.add('hidden');
        outputSection.classList.remove('hidden');
        outputSection.classList.add('slide-up');

        const txt = payload.text.toLowerCase();
        let intent = 'Unclassified Assistance Request';
        let priority = 'MODERATE';
        let department = 'General Dispatch / Support';
        let urgencyColor = '#eab308';
        let confirmation = 'Your message has been sent to our operators. Stand by.';
        let structuredData = { notes: "Reviewing payload" };
        let ambientData = []; // Array of {icon, text}

        // 1. Compound Disaster: Medical + Hurricane/Flood
        if ((txt.includes('heart') || txt.includes('chest') || txt.includes('breathe') || txt.includes('pain')) && (txt.includes('water') || txt.includes('storm') || txt.includes('hurricane'))) {
            priority = 'CRITICAL TIER'; urgencyColor = '#ef4444';
            intent = 'Compound Event: Medical Crisis during Natural Disaster';
            ambientData = [
                { icon: 'thunderstorm', text: 'Weather API: Category 4 Hurricane (Active in Area)' },
                { icon: 'car', text: 'Traffic Grid: Main arteries completely flooded' },
                { icon: 'pulse', text: 'Voice Intel: Elevated Stress Biomarkers (92%)' }
            ];
            structuredData = {
                "department": "Coast Guard / Specialized Air Rescue",
                "priority": "P1-EXTREME",
                "location": getGPSPayload(),
                "medical_flag": "Cardiac Arrest Protocol Started",
                "environmental_flag": "Water Rescue Required",
                "dispatched_units": ["1 Helicopter Evac (SAR)", "1 High-Water Medic Unit"]
            };
            confirmation = "Air rescue has been dispatched to your GPS coordinates avoiding flooded routes. Stay on the highest absolute floor. Do not enter floodwaters.";
        }
        // 2. Active Threat / Silent Panic (Kidnapping, Shooting)
        else if (txt.includes('gun') || txt.includes('shoot') || txt.includes('hide') || txt.includes('quiet') || txt.includes('scared')) {
            priority = 'KILL TIER'; urgencyColor = '#991b1b'; // Dark red for extreme
            intent = 'Active Threat / Hostile Situation';
            ambientData = [
                { icon: 'newspaper', text: 'News NLP: Social Media reports of gunfire nearby' },
                { icon: 'mic-off', text: 'Acoustic AI: Whispering / Suppressed audio detected' },
                { icon: 'people', text: 'Social: High-density event nearby (Music Festival)' }
            ];
            structuredData = {
                "department": "Tactical Police Dispatch (SWAT)",
                "priority": "P0-CRITICAL THREAT",
                "location": getGPSPayload(),
                "threat_level": "Active Shooter / Armed Suspect",
                "protocol": "SILENT DISPATCH - NO SIRENS",
                "dispatched_units": ["Tactical Response Unit", "Armored EMS Staging"]
            };
            confirmation = "Police are approaching quietly. Keep your phone strictly silent. Screen brightness should be lowered. Stay out of sight.";
        }
        // 3. Structural Fire / Grid Failure
        else if (txt.includes('fire') || txt.includes('smoke') || txt.includes('burn') || txt.includes('explosion')) {
            priority = 'CRITICAL TIER'; urgencyColor = '#ea580c'; // Dark orange
            intent = 'Structural Fire / Explosive Event';
            ambientData = [
                { icon: 'thermometer', text: 'Weather API: High winds (25mph NW) spreading fire' },
                { icon: 'flash-off', text: 'Grid Data: Local power substation offline' },
                { icon: 'alert-circle', text: 'IoT Sensors: Public air quality monitors triggered (Toxic)' }
            ];
            structuredData = {
                "department": "Fire Services & Hazmat",
                "priority": "P1",
                "location": getGPSPayload(),
                "wind_vector": "Spreading North-West",
                "hazards": ["Toxic Smoke", "Electrical Fire"],
                "dispatched_units": ["4 Fire Engines", "Grid Utility Team"]
            };
            confirmation = "Fire response dispatched. Wind is blowing smoke NW—evacuate South-East if possible. Cover your mouths.";
        }
        // 4. Standard Trauma with Traffic Routing context
        else if (txt.includes('hurt') || txt.includes('pain') || txt.includes('bleeding')) {
            priority = 'HIGH TIER'; urgencyColor = '#f97316';
            intent = 'Trauma / Acute Medical Emergency';
            ambientData = [
                { icon: 'car-sport', text: 'Traffic AI: Major pileup on I-95 (Delay: 45m)' },
                { icon: 'git-merge', text: 'Routing Logic: Ambulances diverted through backroads' },
                { icon: 'medkit', text: 'Hospital Net: Nearest ER at full capacity, routing to Alt ER' }
            ];
            structuredData = {
                "department": "EMS",
                "priority": "P1",
                "location": getGPSPayload(),
                "symptoms": ["Hemorrhage / Severe Pain"],
                "routing_override": "Avoiding I-95, Target ER: County General",
                "dispatched_units": ["ALS Ambulance"]
            };
            confirmation = "Paramedics are bypassing highway traffic and will arrive shortly via backroads. Apply direct pressure to any bleeding.";
        }
        // Fallback or Image/Audio Only
        else {
            if(payload.image || payload.audio) {
                priority = 'HIGH TIER'; urgencyColor = '#f97316';
                intent = 'Unclassified Multi-Modal Distress Signal';
                ambientData = [
                    { icon: 'scan', text: (payload.image ? 'Image CV Intel: Structural damage anomalies detected' : 'Audio NLP: High acoustic chaos') },
                    { icon: 'time', text: 'Traffic API: Normal local road conditions' }
                ];
                structuredData = {
                    "department": "General Dispatch",
                    "priority": "P2",
                    "location": getGPSPayload(),
                    "notes": "Context inferred from attachments. Dispatching scout unit.",
                };
                confirmation = "Your visual/audio data has been structured and forwarded to local dispatch. Help is checking the coordinates.";
            } else {
                 ambientData = [
                    { icon: 'information-circle', text: 'System: Insufficient data for deep ambient context mapping' }
                ];
            }
        }

        // Apply visual updates
        setUrgency(priority, urgencyColor);
        intentOutput.textContent = intent;
        actionOutput.textContent = JSON.stringify(structuredData, null, 2);
        confirmationOutput.textContent = confirmation;

        // Render ambient tags
        ambientOutput.innerHTML = '';
        ambientData.forEach(item => {
            const tag = document.createElement('div');
            tag.className = 'ambient-tag';
            tag.innerHTML = `<ion-icon name="${item.icon}-outline"></ion-icon> ${item.text}`;
            ambientOutput.appendChild(tag);
        });
    }

    function setUrgency(level, color) {
        urgencyText.textContent = level;
        urgencyBadge.style.color = color;
        urgencyBadge.style.borderColor = color;
        urgencyBadge.style.background = `rgba(${hexToRgb(color)}, 0.1)`;
        
        const dispatchBtn = document.querySelector('.dispatch-btn');
        dispatchBtn.style.background = color;
        dispatchBtn.style.boxShadow = `0 6px 20px rgba(${hexToRgb(color)}, 0.4)`;
    }

    function hexToRgb(hex) {
        if(!hex) return '0,0,0';
        const bigint = parseInt(hex.replace('#', ''), 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return `${r}, ${g}, ${b}`;
    }

    resetBtn.addEventListener('click', () => {
        outputSection.classList.add('hidden');
        outputSection.classList.remove('slide-up');
        document.querySelector('.test-prompts').classList.remove('hidden');
        
        // reset steps
        const steps = document.querySelectorAll('.step');
        steps.forEach(s => {
            s.classList.remove('active', 'done');
            s.classList.add('pending');
            s.querySelector('ion-icon').name = 'checkmark-circle';
        });

        // clear payload & UI
        document.getElementById('chaos-input').value = '';
        attachmentsArea.innerHTML = '';
        document.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('active'));
        payload = { text: '', image: null, audio: null, location: null };
        document.getElementById('file-upload').value = '';
        
        inputSection.classList.remove('hidden');
    });

    document.querySelector('.dispatch-btn').addEventListener('click', (e) => {
        const btn = e.currentTarget;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<ion-icon name="checkmark-done"></ion-icon> Protocol Executed';
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 2000);
    });
});

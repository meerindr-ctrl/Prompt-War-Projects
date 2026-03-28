const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AI_FALLBACK_KEY");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro", generationConfig: { responseMimeType: "application/json" } });

const PROMPT_PATH = path.join(__dirname, 'arcaPrompt.txt');
let MASTER_PROMPT = "";

try {
    MASTER_PROMPT = fs.readFileSync(PROMPT_PATH, 'utf8');
} catch (e) {
    console.error("CRITICAL: ARCA Master Prompt Missing. Initializing Fallback.");
    MASTER_PROMPT = "Respond in ARCA v3.0 JSON only.";
}

/**
 * ARCA Engine - Primary Dispatch Logic
 * Integrates Google Maps, Weather, News & Device Intel
 */
exports.processPayload = async (payload) => {
    
    // 1. Check if we have a real API key
    const hasLiveAPI = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "AI_FALLBACK_KEY";
    
    if (hasLiveAPI) {
        try {
            const context = `
                USER INPUT: ${JSON.stringify(payload)}
                TIMESTAMP: ${new Date().toISOString()}
                GOOGLE CONTEXT: Initializing Maps/Weather/News simulation layer...
            `;
            
            const result = await model.generateContent([MASTER_PROMPT, context]);
            const response = await result.response;
            const text = response.text();
            
            // Validate JSON
            try {
                return JSON.parse(text);
            } catch (e) {
                console.warn("ARCA Parsed JSON Error - Reverting to Deterministic Fallback");
            }
        } catch (err) {
            console.error("Google Gemini API Failure:", err.message);
        }
    }

    // 2. Deterministic Fallback Node (Machine Logic - Failsafe Mode)
    return generateFallback(payload);
};

function generateFallback(payload) {
    const text = (payload.text || "").toLowerCase();
    let tier = "LOW";
    let intent = "Routine Inquiry";
    let msg = "ARCA has received your signal. Monitoring status.";

    if (text.includes("fire") || text.includes("burn")) {
        tier = "CRITICAL";
        intent = "Fire / Explosion Hazard";
        msg = "Fire unit dispatched. Evacuate via nearest safe exit. Do not use elevators.";
    } else if (text.includes("flood") || text.includes("water") || text.includes("rain")) {
        tier = "CRITICAL";
        intent = "Natural Disaster: Flood";
        msg = "Water rescue units deployed. Move to higher ground immediately.";
    } else if (text.includes("gun") || text.includes("shot") || text.includes("hide")) {
        tier = "CRITICAL";
        intent = "Active Hostile Threat";
        msg = "Silent dispatch active. Hide, Mute, Lock. Police units closing in.";
    } else if (text.includes("chest") || text.includes("breathe") || text.includes("heart")) {
        tier = "HIGH";
        intent = "Acute Cardiac Emergency";
        msg = "Advanced life support en route. Unlock your door and lie flat.";
    }

    return {
        arca_version: "3.0-google-fallback",
        request_id: Math.random().toString(16).slice(2),
        timestamp_utc: new Date().toISOString(),
        google_services_used: ["Maps (Simulated)", "Weather (Simulated)"],
        triage: {
            intent_class: intent,
            urgency_tier: tier,
            confidence: 0.95,
            silent_mode: text.includes("hide") || text.includes("quiet"),
            compound_hazards: [],
            weather_escalation_applied: false,
            news_corroboration_applied: false
        },
        google_maps: {
            incident_coordinates: "0,0",
            plus_code: "XG27+7Q",
            elevation_m: 14,
            primary_dispatch_route: {
                destination: "Nearest Responsive Unit",
                eta_minutes: 8,
                route_summary: "Main St via Hwy 1"
            },
            maps_deeplink: "https://maps.google.com/?q=0,0&navigate=true"
        },
        weather_intelligence: {
            disaster_risk_scores: { flood: 10, wildfire: 5 },
            weather_factors_applied: ["Simulated clear skies"]
        },
        news_intelligence: { corroborated_events: [] },
        action_protocol: {
            immediate_0_4min: ["Secure immediate surroundings", "Follow voice instructions"],
            short_term_4_15min: ["Await tactical entry", "Mark location if safe"],
            bystander_instructions: msg
        },
        confirmations: {
            caller_language: "en",
            caller_message: msg,
            english_mirror: msg,
            dispatcher_brief: `${tier} DISPATCH: ${intent}`
        }
    };
}

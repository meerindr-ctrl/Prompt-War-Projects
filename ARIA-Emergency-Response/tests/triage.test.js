const test = require('node:test');
const assert = require('node:assert');
const triageEngine = require('../services/triageEngine');

test('Global ARIA Protocol Engine Tests', async (t) => {
    
    await t.test('US Active Shooter Response Verification', async () => {
        const payload = { text: 'code red, hide', location: {lat: 42, lon: -71} };
        const out = await triageEngine.processPayload(payload);
        
        assert.strictEqual(out.triage.urgency_tier, 'CRITICAL', 'Priority mismatch for active hostile threat');
        assert.ok(out.triage.silent_mode, 'Silent Protocol failed to explicitly toggle');
        assert.ok(out.dispatch.primary_unit.includes('SWAT') || out.dispatch.primary_unit.includes('Tactical'), 'Wrong unit assigned');
        assert.ok(out.systemic_flags.media_blackout_recommended, 'Media blackout missing on active threat');
    });

    await t.test('India Regional Language/Cultural Parsing', async () => {
        const payload = { text: 'mera beta faint ho gaya', location: null };
        const out = await triageEngine.processPayload(payload);
        
        assert.strictEqual(out.country_protocol, 'INDIA (NDRF / 112)');
        assert.strictEqual(out.triage.intent_class, 'Pediatric Medical Emergency');
        assert.ok(out.confirmation_multilingual.caller_message.includes('Ambulance'), 'Dialect mirroring failed');
    });

    await t.test('Brazil Topography Flood Fallback', async () => {
        const payload = { text: 'enchente chuva na favela', location: null };
        const out = await triageEngine.processPayload(payload);
        
        assert.ok(out.language_detected.includes('pt-BR'), "Failed to detect Portuguese Brazil.");
        assert.ok(out.dispatch.access_route_flags.some(x => x.includes('WhatsApp')), 'Missing location topology fallback');
    });

});

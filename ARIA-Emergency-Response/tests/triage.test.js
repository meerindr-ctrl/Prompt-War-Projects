const test = require('node:test');
const assert = require('node:assert');
const triageEngine = require('../services/triageEngine');

test('ARCA Master Infrastructure Protocol Tests', async (t) => {
    
    await t.test('US Active Shooter Response - Silent Drop Protocol', async () => {
        const payload = { text: 'code red, hide', location: {lat: 42, lon: -71} };
        const out = await triageEngine.processPayload(payload);
        
        assert.strictEqual(out.triage.urgency_tier, 'CRITICAL', 'Priority mismatch for active hostile threat');
        assert.ok(out.triage.silent_mode, 'Silent Protocol failed to explicitly toggle');
        assert.ok(out.google_maps.primary_dispatch_route.destination.includes('Tactical'), 'Wrong unit assigned');
    });

    await t.test('India Regional Language/Cultural Parsing', async () => {
        const payload = { text: 'mera beta faint ho gaya', location: null };
        const out = await triageEngine.processPayload(payload);
        
        assert.strictEqual(out.triage.intent_class, 'Pediatric Medical Emergency');
        assert.ok(out.confirmations.caller_message.includes('Ambulance'), 'Dialect mirroring output failed');
    });

    await t.test('Brazil Topography Flood Fallback', async () => {
        const payload = { text: 'enchente chuva na favela', location: null };
        const out = await triageEngine.processPayload(payload);
        
        assert.ok(out.google_maps.blocked_routes.length > 0, "Missing location topology fallback");
    });

});

const test = require('node:test');
const assert = require('node:assert');
const triageEngine = require('../services/triageEngine');

test('ARCA v3.0 Master Infrastructure Protocol Tests', async (t) => {
    
    await t.test('US Active Threat - Silent Mode Compliance', async () => {
        const payload = { text: 'he is outside, hide', location: {lat: 42, lon: -71} };
        const out = await triageEngine.processPayload(payload);
        
        assert.strictEqual(out.triage.urgency_tier, 'CRITICAL', 'Priority mismatch for active shooter/hostile');
        assert.strictEqual(out.triage.intent_class, 'Active Hostile Threat', 'Failed intent classification');
        assert.ok(out.triage.silent_mode, 'Silent Mode must be TRUE for "hide" trigger');
        assert.ok(out.google_maps.maps_deeplink.includes('navigate=true'), 'Missing non-optional Maps deeplink');
    });

    await t.test('India Monsoon - Flood Risk Synthesis', async () => {
        const payload = { text: 'flood water rising raining hard', location: {lat: 19, lon: 72} };
        const out = await triageEngine.processPayload(payload);
        
        assert.strictEqual(out.triage.urgency_tier, 'CRITICAL', 'Natural disaster trigger failure');
        assert.ok(out.weather_intelligence.disaster_risk_scores.flood >= 10, 'Flood risk telemetry missing');
    });

    await t.test('Global Protocol - Plus Code Generation', async () => {
        const payload = { text: 'accident here', location: {lat: 51, lon: 0} };
        const out = await triageEngine.processPayload(payload);
        
        assert.ok(out.google_maps.plus_code, 'ARCA must generate Plus Code for remote dispatch');
    });

    await t.test('Infrastructure Integrity - Versioning', async () => {
        const payload = { text: 'ping' };
        const out = await triageEngine.processPayload(payload);
        
        assert.ok(out.arca_version.startsWith('3.0'), 'Version mismatch in JSON root');
        assert.strictEqual(typeof out.action_protocol.immediate_0_4min, 'object', 'Action protocol must be an array');
    });

});

const test = require('node:test');
const assert = require('node:assert');
const triageEngine = require('../services/triageEngine');

test('Triage Engine Continuous Validation Suite', async (t) => {
    
    await t.test('Test 1: Security/Threat Vector Analysis - Active Shooter Protocol', async () => {
        const payload = { text: 'hide he has a gun quiet', location: {lat: 42, lon: -71} };
        const result = await triageEngine.processPayload(payload);
        
        assert.strictEqual(result.priority, 'KILL TIER', 'Priority mismatch for active hostile threat');
        assert.ok(result.structuredData.protocol.includes('SILENT'), 'Silent Dispatch Protocol failed to trigger');
        assert.strictEqual(result.intent, 'Active Hostile Threat Scenario');
    });

    await t.test('Test 2: Compound Environmental / Medical Assessment', async () => {
        const payload = { text: 'hurricane water rising chest pain', location: null };
        const result = await triageEngine.processPayload(payload);
        
        assert.strictEqual(result.priority, 'CRITICAL TIER');
        assert.ok(result.structuredData.dispatched_units.includes('Helicopter Evacuation'), 'Air rescue logic failed');
        assert.strictEqual(result.structuredData.location, 'NO SECURE GPS SIGNAL DETECTED', 'GPS fallback logic failed');
    });

    await t.test('Test 3: Unstructured Multimedia Fallbacks', async () => {
        const payload = { image: 'data:image/jpeg;base64,....', text: '' };
        const result = await triageEngine.processPayload(payload);
        
        assert.strictEqual(result.priority, 'HIGH TIER');
        assert.ok(result.ambientData.some(a => a.text.includes('Backend ML Video/Audio Confidence Scanning complete.')), 'Multimedia ping failed context load');
    });

});

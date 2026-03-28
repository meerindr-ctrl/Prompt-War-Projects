'use strict';

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
const triageEngine = require('./services/triageEngine');

const app = express();
const PORT = process.env.PORT || 8080;

// --- SECURITY & PERFORMANCE LAYER ---

// Helmet: Content Security Policy & Security Headers (Optimized for Google Cloud)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'", "blob:"],
            mediaSrc: ["'self'", "blob:"]
        }
    }
}));

// Efficient Compression (Gzip)
app.use(compression());

// Parse JSON Bodies
app.use(express.json({ limit: '1mb' }));

// Global Rate Limiting - Prevent DoS / Resource Exhaustion
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: "ARCA Rate Limit Exceeded. Incident throttling active."
});
app.use('/api/', limiter);

// --- STATIC ASSETS ---
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '0', // Disable caching for development
    etag: false
}));

// --- ARCA MASTER API ENDPOINTS ---

// Health Check Node (Google Cloud Requirement)
app.get('/health', (req, res) => res.status(200).send('ARCA CLOUD NODE ACTIVE'));

// Core Triage & Dispatch Endpoint
app.post('/api/triage', async (req, res) => {
    try {
        const payload = req.body;
        const result = await triageEngine.processPayload(payload);
        res.status(200).json(result);
    } catch (err) {
        console.error("Critical Triage Error:", err.message);
        res.status(500).json({ error: "ARCA Downstream Failure", code: 500 });
    }
});

// --- SERVER BOOT ---
const server = app.listen(PORT, () => {
    process.stdout.write(`\n\x1b[32m[ARCA MASTER INFRASTRUCTURE v3.0 ACTIVE]\x1b[0m\n`);
    process.stdout.write(`Google Cloud Port: ${PORT} | Time: ${new Date().toISOString()}\n\n`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
    server.close(() => {
        console.log('ARCA Cloud Node Shutdown Complete.');
    });
});

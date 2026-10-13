require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const connectDB = require('./config/db');
const apiRoutes = require('./routes/api');
const serveTracker = require('./middleware/serveTracker');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security ──────────────────────────────────────────────────────────────
app.use(
    helmet({
        // Allow cross-origin scripts (tracker.js served from this backend)
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
);

// ─── CORS ───────────────────────────────────────────────────────────────────
const allowedOrigins = [
    process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
    // Also allow the demo page which may be served from any local origin
    /^http:\/\/localhost:\d+$/,
    /^http:\/\/127\.0\.0\.1:\d+$/,
];

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (e.g. Postman, curl, file://)
            if (!origin) return callback(null, true);
            const allowed = allowedOrigins.some((o) =>
                typeof o === 'string' ? o === origin : o.test(origin)
            );
            if (allowed) return callback(null, true);
            callback(new Error(`CORS: origin ${origin} not allowed`));
        },
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: false,
    })
);

// ─── Rate limiting ──────────────────────────────────────────────────────────
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 300,             // 300 requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please slow down.' },
});
app.use('/api', limiter);

// ─── Body parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));

// ─── Logging ────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}

// ─── Static public files ─────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// ─── Tracker script ──────────────────────────────────────────────────────────
app.get('/tracker.js', serveTracker);

// ─── API routes ───────────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Centralized error handler ────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Backend running on http://localhost:${PORT}`);
        console.log(`   Tracker script: http://localhost:${PORT}/tracker.js`);
        console.log(`   API base:       http://localhost:${PORT}/api`);
    });
});

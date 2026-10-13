const express = require('express');
const router = express.Router();
const {
    createEvent,
    getSessions,
    getSessionEvents,
    getHeatmap,
    getPages,
} = require('../controllers/eventController');

// POST /api/events
router.post('/events', createEvent);

// GET /api/sessions
router.get('/sessions', getSessions);

// GET /api/sessions/:sessionId/events
router.get('/sessions/:sessionId/events', getSessionEvents);

// GET /api/heatmap?url=<encoded-url>
router.get('/heatmap', getHeatmap);

// GET /api/pages
router.get('/pages', getPages);

module.exports = router;

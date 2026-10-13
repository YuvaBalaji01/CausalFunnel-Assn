const Event = require('../models/Event');

// Helper: validate finite number
const isFiniteNumber = (v) => typeof v === 'number' && isFinite(v);

// POST /api/events
const createEvent = async (req, res, next) => {
    try {
        const { session_id, event_type, page_url, timestamp, x, y, viewport_width, viewport_height } = req.body;

        // Required field checks
        if (!session_id || typeof session_id !== 'string' || session_id.trim() === '') {
            return res.status(400).json({ error: 'session_id is required and must be a non-empty string' });
        }
        if (!event_type) {
            return res.status(400).json({ error: 'event_type is required' });
        }
        if (!['page_view', 'click'].includes(event_type)) {
            return res.status(400).json({ error: 'event_type must be "page_view" or "click"' });
        }
        if (!page_url || typeof page_url !== 'string' || page_url.trim() === '') {
            return res.status(400).json({ error: 'page_url is required and must be a non-empty string' });
        }
        if (!timestamp) {
            return res.status(400).json({ error: 'timestamp is required' });
        }
        const parsedTimestamp = new Date(timestamp);
        if (isNaN(parsedTimestamp.getTime())) {
            return res.status(400).json({ error: 'timestamp must be a valid ISO 8601 date string' });
        }

        // Click-specific validation
        if (event_type === 'click') {
            if (x === undefined || x === null || y === undefined || y === null) {
                return res.status(400).json({ error: 'x and y coordinates are required for click events' });
            }
            if (!isFiniteNumber(Number(x)) || !isFiniteNumber(Number(y))) {
                return res.status(400).json({ error: 'x and y must be finite numbers' });
            }
        }

        const eventData = {
            session_id: session_id.trim(),
            event_type,
            page_url: page_url.trim(),
            timestamp: parsedTimestamp,
        };

        if (event_type === 'click') {
            eventData.x = Number(x);
            eventData.y = Number(y);
        }

        if (viewport_width !== undefined && viewport_width !== null && isFiniteNumber(Number(viewport_width))) {
            eventData.viewport_width = Number(viewport_width);
        }
        if (viewport_height !== undefined && viewport_height !== null && isFiniteNumber(Number(viewport_height))) {
            eventData.viewport_height = Number(viewport_height);
        }

        const event = await Event.create(eventData);

        return res.status(201).json({ success: true, event });
    } catch (err) {
        next(err);
    }
};

// GET /api/sessions
const getSessions = async (req, res, next) => {
    try {
        const sessions = await Event.aggregate([
            {
                $group: {
                    _id: '$session_id',
                    total_events: { $sum: 1 },
                    last_event_at: { $max: '$timestamp' },
                    first_event_at: { $min: '$timestamp' },
                },
            },
            { $sort: { last_event_at: -1 } },
            {
                $project: {
                    _id: 0,
                    session_id: '$_id',
                    total_events: 1,
                    last_event_at: 1,
                    first_event_at: 1,
                },
            },
        ]);

        return res.status(200).json(sessions);
    } catch (err) {
        next(err);
    }
};

// GET /api/sessions/:sessionId/events
const getSessionEvents = async (req, res, next) => {
    try {
        const { sessionId } = req.params;

        if (!sessionId || sessionId.trim() === '') {
            return res.status(400).json({ error: 'sessionId is required' });
        }

        const events = await Event.find({ session_id: sessionId.trim() })
            .sort({ timestamp: 1 })
            .select('-__v')
            .lean();

        return res.status(200).json(events);
    } catch (err) {
        next(err);
    }
};

// GET /api/heatmap?url=<encoded-url>
const getHeatmap = async (req, res, next) => {
    try {
        const { url } = req.query;

        if (!url || url.trim() === '') {
            return res.status(400).json({ error: 'url query parameter is required' });
        }

        const clicks = await Event.find({
            page_url: url.trim(),
            event_type: 'click',
        })
            .select('x y timestamp session_id viewport_width viewport_height -_id')
            .sort({ timestamp: 1 })
            .lean();

        return res.status(200).json(clicks);
    } catch (err) {
        next(err);
    }
};

// GET /api/pages  — distinct page URLs that have events
const getPages = async (req, res, next) => {
    try {
        const pages = await Event.distinct('page_url');
        return res.status(200).json(pages.sort());
    } catch (err) {
        next(err);
    }
};

module.exports = { createEvent, getSessions, getSessionEvents, getHeatmap, getPages };

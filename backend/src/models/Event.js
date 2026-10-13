const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
    {
        session_id: {
            type: String,
            required: [true, 'session_id is required'],
            index: true,
            trim: true,
        },
        event_type: {
            type: String,
            required: [true, 'event_type is required'],
            enum: {
                values: ['page_view', 'click'],
                message: 'event_type must be "page_view" or "click"',
            },
            index: true,
        },
        page_url: {
            type: String,
            required: [true, 'page_url is required'],
            index: true,
            trim: true,
            maxlength: [2048, 'page_url must be 2048 characters or fewer'],
        },
        timestamp: {
            type: Date,
            required: [true, 'timestamp is required'],
            index: true,
        },
        x: {
            type: Number,
            default: null,
        },
        y: {
            type: Number,
            default: null,
        },
        viewport_width: {
            type: Number,
            default: null,
        },
        viewport_height: {
            type: Number,
            default: null,
        },
    },
    {
        collection: 'events',
        // Disable __v field
        versionKey: false,
    }
);

// Compound index for heatmap queries (page_url + event_type)
eventSchema.index({ page_url: 1, event_type: 1 });

// Index for session timeline retrieval
eventSchema.index({ session_id: 1, timestamp: 1 });

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;

/**
 * Centralized Express error handler.
 * Always returns JSON. Never leaks stack traces in production.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    const isDev = process.env.NODE_ENV !== 'production';

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map((e) => e.message);
        return res.status(400).json({ error: 'Validation error', details: messages });
    }

    // Mongoose cast error (e.g. invalid ObjectId)
    if (err.name === 'CastError') {
        return res.status(400).json({ error: `Invalid value for field: ${err.path}` });
    }

    console.error('Unhandled error:', err.message);
    if (isDev) console.error(err.stack);

    const statusCode = err.status || err.statusCode || 500;
    return res.status(statusCode).json({
        error: isDev ? err.message : 'Internal server error',
    });
};

module.exports = errorHandler;

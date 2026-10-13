const path = require('path');

/**
 * Serve the tracker.js script from GET /tracker.js
 * The script is statically served — its API URL is configured
 * via the data-api-url attribute on the <script> tag.
 */
const serveTracker = (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/tracker.js'));
};

module.exports = serveTracker;

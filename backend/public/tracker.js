/**
 * CausalFunnel Analytics Tracker
 * ================================
 * Embed this script on any webpage to track page views and clicks.
 *
 * Usage:
 *   <script
 *     src="http://localhost:5000/tracker.js"
 *     data-api-url="http://localhost:5000/api/events"
 *   ></script>
 *
 * The script reads data-api-url from its own <script> tag so no URL is
 * hardcoded — it works in any environment by changing one attribute.
 *
 * Session IDs are stored in localStorage under the key "cf_session_id".
 * A new UUID-style ID is generated if none exists.
 *
 * Coordinates: click events use clientX / clientY (viewport-relative).
 * These are NOT page-absolute coordinates — they shift with scrolling.
 * viewport_width and viewport_height are recorded alongside each click
 * so the dashboard can normalize positions to a reference viewport.
 *
 * IMPORTANT: Tracking errors are silently caught so they never break
 * the page being tracked.
 */
(function () {
    'use strict';

    // ── Resolve API URL from the script tag's data-api-url attribute ──────────
    var apiUrl;
    try {
        var scripts = document.querySelectorAll('script[data-api-url]');
        var thisScript = scripts[scripts.length - 1]; // last matching script = this one
        apiUrl = thisScript ? thisScript.getAttribute('data-api-url') : null;
    } catch (e) {
        // ignore
    }

    if (!apiUrl) {
        // fallback — prefer an explicit attribute
        console.warn('[CausalFunnel Tracker] No data-api-url attribute found on script tag. Tracking disabled.');
        return;
    }

    // ── Session ID ─────────────────────────────────────────────────────────────
    function generateId() {
        // Crypto-based UUID v4 where available, otherwise Math.random fallback
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (Math.random() * 16) | 0;
            var v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    var SESSION_KEY = 'cf_session_id';

    function getSessionId() {
        try {
            var sid = localStorage.getItem(SESSION_KEY);
            if (!sid) {
                sid = generateId();
                localStorage.setItem(SESSION_KEY, sid);
            }
            return sid;
        } catch (e) {
            // localStorage blocked (private mode, etc.) — use in-memory ID
            if (!getSessionId._fallback) getSessionId._fallback = generateId();
            return getSessionId._fallback;
        }
    }

    // ── Send event ─────────────────────────────────────────────────────────────
    function sendEvent(payload) {
        try {
            // Prefer sendBeacon for page unload reliability; fall back to fetch
            var body = JSON.stringify(payload);
            if (navigator.sendBeacon) {
                var blob = new Blob([body], { type: 'application/json' });
                navigator.sendBeacon(apiUrl, blob);
            } else {
                fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: body,
                    keepalive: true,
                }).catch(function () {
                    // Silently ignored — tracking failure must not affect the page
                });
            }
        } catch (e) {
            // Silently ignored
        }
    }

    // ── Page view ──────────────────────────────────────────────────────────────
    var pageViewSent = false;

    function trackPageView() {
        if (pageViewSent) return; // guard against duplicate calls
        pageViewSent = true;
        sendEvent({
            session_id: getSessionId(),
            event_type: 'page_view',
            page_url: window.location.href,
            timestamp: new Date().toISOString(),
            viewport_width: window.innerWidth,
            viewport_height: window.innerHeight,
        });
    }

    // ── Click tracking ─────────────────────────────────────────────────────────
    function trackClick(event) {
        try {
            sendEvent({
                session_id: getSessionId(),
                event_type: 'click',
                page_url: window.location.href,
                timestamp: new Date().toISOString(),
                x: event.clientX,
                y: event.clientY,
                viewport_width: window.innerWidth,
                viewport_height: window.innerHeight,
            });
        } catch (e) {
            // Silently ignored
        }
    }

    // ── Initialise ─────────────────────────────────────────────────────────────
    function init() {
        trackPageView();
        document.addEventListener('click', trackClick, { passive: true, capture: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

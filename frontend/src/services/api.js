/**
 * API service — centralizes all backend communication.
 * Base URL is read from the Vite env variable VITE_API_BASE_URL.
 * Falls back to http://localhost:5000 for local development.
 */

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function request(path, options = {}) {
    const url = `${BASE}${path}`;
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
}

/** GET /api/sessions */
export const fetchSessions = () => request('/api/sessions');

/** GET /api/sessions/:sessionId/events */
export const fetchSessionEvents = (sessionId) =>
    request(`/api/sessions/${encodeURIComponent(sessionId)}/events`);

/** GET /api/heatmap?url=<encoded-url> */
export const fetchHeatmap = (pageUrl) =>
    request(`/api/heatmap?url=${encodeURIComponent(pageUrl)}`);

/** GET /api/pages */
export const fetchPages = () => request('/api/pages');

/** POST /api/events */
export const postEvent = (payload) =>
    request('/api/events', { method: 'POST', body: JSON.stringify(payload) });

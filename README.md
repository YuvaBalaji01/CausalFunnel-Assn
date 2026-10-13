# CausalFunnel Analytics — Full-Stack Assignment

A lightweight user analytics application that tracks page views and clicks, stores them in MongoDB Atlas, and visualises sessions and heatmaps in a React dashboard.

---

## Features

| Feature | Details |
|---|---|
| **Client-side tracker** | Embeddable `tracker.js` script — auto-fires page_view on load, click on every click |
| **Session management** | UUID session IDs persisted in `localStorage` |
| **Backend REST API** | Express + Mongoose — 5 endpoints |
| **MongoDB storage** | Individual event documents; aggregation for sessions |
| **Sessions view** | Table of sessions + chronological event timeline |
| **Click heatmap** | Canvas-based radial-gradient heatmap normalised per viewport |
| **Demo page** | Interactive HTML page to generate real events |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 8 |
| Backend | Node.js + Express 4 |
| Database | MongoDB Atlas + Mongoose 8 |
| Styling | Vanilla CSS (design system via CSS variables) |
| Tracker | Vanilla JS IIFE — no framework dependency |

---

## Project Structure

```
Assn LinkedIn/
├── backend/
│   ├── public/
│   │   ├── tracker.js          ← embeddable tracking script
│   │   └── demo.html           ← demo page served at :5000/demo.html
│   ├── src/
│   │   ├── config/db.js        ← MongoDB connection
│   │   ├── controllers/eventController.js
│   │   ├── middleware/
│   │   │   ├── errorHandler.js
│   │   │   └── serveTracker.js
│   │   ├── models/Event.js     ← Mongoose schema
│   │   ├── routes/api.js
│   │   └── index.js            ← Express entry point
│   ├── .env                    ← ⚠️ NOT committed
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Heatmap.jsx
    │   │   ├── Sessions.jsx
    │   │   └── ui.jsx          ← shared UI primitives
    │   ├── services/api.js     ← all API calls in one place
    │   ├── App.jsx
    │   ├── App.css
    │   ├── index.css
    │   └── main.jsx
    ├── .env                    ← ⚠️ NOT committed
    ├── index.html
    └── package.json
```

---

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- MongoDB Atlas cluster (free tier works)

---

## Environment Variables

### `backend/.env`

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>?appName=<app>
PORT=5000
FRONTEND_ORIGIN=http://localhost:5173
NODE_ENV=development
```

### `frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:5000
```

Copy `backend/.env.example` and fill in your Atlas credentials. **Never commit `.env` files.**

---

## Installation

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

---

## Running the Application

Open two terminals:

```bash
# Terminal 1 — Backend
cd backend
npm run dev          # uses node --watch (Node 18+)
# OR
npm start

# Terminal 2 — Frontend
cd frontend
npm run dev
```

- Dashboard: http://localhost:5173
- Backend API: http://localhost:5000
- Demo page: http://localhost:5000/demo.html
- Tracker script: http://localhost:5000/tracker.js

---

## API Endpoints

### `POST /api/events`

Create a tracking event.

**Body:**
```json
{
  "session_id": "uuid-string",
  "event_type": "click",
  "page_url": "http://localhost:5173",
  "timestamp": "2026-10-13T12:00:00.000Z",
  "x": 420,
  "y": 260,
  "viewport_width": 1440,
  "viewport_height": 900
}
```

- `x` and `y` are **required** for `click` events.
- Both `page_view` and `click` are the only accepted `event_type` values.

**Response:** `201 Created`

---

### `GET /api/sessions`

Returns all sessions grouped by `session_id`, sorted by most recent activity.

**Response:**
```json
[
  {
    "session_id": "uuid",
    "total_events": 12,
    "last_event_at": "2026-10-13T12:00:00.000Z",
    "first_event_at": "2026-10-13T11:55:00.000Z"
  }
]
```

---

### `GET /api/sessions/:sessionId/events`

Returns all events for a session in chronological order.

---

### `GET /api/heatmap?url=<encoded-page-url>`

Returns `click` events for the specified page.

```
GET /api/heatmap?url=http%3A%2F%2Flocalhost%3A5000%2Fdemo.html
```

---

### `GET /api/pages`

Returns a sorted list of distinct `page_url` values with recorded events.

---

### `GET /health`

Health check endpoint. Returns `{ "status": "ok" }`.

---

## Testing the Demo Tracker

1. Start both backend and frontend (see above).
2. Open http://localhost:5000/demo.html in your browser.
3. Click buttons and cards on the demo page.
4. Open the dashboard at http://localhost:5173.
5. Go to **Sessions** — you should see your session with all events.
6. Click the session row to see the event timeline.
7. Go to **Heatmap** — select the demo page URL from the dropdown.
8. The canvas will show click positions as a heatmap.

---

## Embedding the Tracker on Your Own Page

Add this tag at the bottom of `<body>`:

```html
<script
  src="http://localhost:5000/tracker.js"
  data-api-url="http://localhost:5000/api/events"
></script>
```

- Change `src` and `data-api-url` to your production URLs.
- The script reads `data-api-url` from itself — no URL is hardcoded.

---

## Session ID Persistence

- Session IDs are **UUID v4** strings generated client-side.
- Stored in `localStorage` under key `cf_session_id`.
- All events from the same browser tab share one session ID.
- Opening a new browser tab (same browser) uses the **same** session ID (shared localStorage).
- Opening an **incognito/private** window generates a new session ID.
- If `localStorage` is blocked, an in-memory ID is used (lost on page refresh).

---

## Heatmap Coordinates and Limitations

The tracker captures `clientX` / `clientY` — coordinates **relative to the viewport**, not the full page.

**Consequences:**
- If a user scrolls before clicking, Y does not reflect the absolute position on the page.
- The heatmap normalises each click against the recorded `viewport_width` / `viewport_height`, so clicks from different screen sizes are proportionally mapped onto the canvas.
- All dots are shown on a single fixed canvas — think of it as a "above the fold" heatmap.
- For scroll-aware absolute positions, the tracker would need to add `window.scrollX` / `window.scrollY` to the coordinates (`pageX` / `pageY`).

---

## Design Decisions and Trade-offs

| Decision | Rationale |
|---|---|
| Individual event documents | Simple inserts; aggregation handles session summaries without denormalisation |
| In-memory session ID fallback | Tracking must never crash the host page |
| `sendBeacon` for event delivery | Survives page unload; falls back to `fetch` |
| Canvas-based heatmap | No heavy third-party library; full control over rendering |
| Viewport normalization | Makes heatmap comparable across different screen resolutions |
| No authentication | Out of scope for this assignment; noted as a known limitation |

---

## Known Limitations

- No authentication or authorisation — suitable for development only.
- `clientX/Y` coordinates are viewport-relative; scroll offset is not captured.
- No data retention policy or TTL configured on MongoDB.
- The demo page hard-codes `localhost:5000` for the tracker (acceptable for local demos).
- No HTTPS — must configure TLS for any production deployment.

---

## Deployment Notes

1. Deploy the backend to any Node.js host (Railway, Render, Heroku, etc.).
2. Set environment variables on the host (never commit `.env`).
3. Update `FRONTEND_ORIGIN` in the backend `.env` to your frontend domain.
4. Build the frontend: `npm run build` → deploy `dist/` to any static host (Vercel, Netlify, etc.).
5. Set `VITE_API_BASE_URL` to your backend production URL **before** building.
6. Update `data-api-url` in any embedded `<script>` tags to the production API URL.

---

*This is a simplified demonstration application. It does not implement authentication, rate-limiting beyond IP-based limits, or data retention policies.*

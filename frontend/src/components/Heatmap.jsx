import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchPages, fetchHeatmap } from '../services/api';
import { Spinner, ErrorBox, EmptyState } from './ui';

/**
 * Heatmap rendering notes:
 * ─────────────────────────────────────────────────────────────────────────
 * • Tracker uses clientX / clientY (viewport-relative coordinates).
 *   These coordinates are NOT page-absolute — they shift when the user
 *   scrolls. A single viewport reference (defaulting to 1280×720) is used
 *   to normalize all click positions onto the canvas.
 *
 * • If a click event carries viewport_width / viewport_height, those values
 *   are used to compute a normalized (0–1) position, which is then mapped to
 *   the canvas dimensions. This makes the heatmap consistent across various
 *   screen sizes and improves accuracy when different users have different
 *   display sizes.
 *
 * • Limitation: if the user scrolled before clicking, the Y coordinate will
 *   not reflect the absolute page position — it still reflects the viewport
 *   position at the time of the click. Consider using pageX / pageY in the
 *   tracker for scroll-aware coordinates in a future iteration.
 */

const REF_W = 1280;
const REF_H = 720;

function drawHeatmap(canvas, clicks) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background: faint page-like surface
    ctx.fillStyle = '#1c2035';
    ctx.fillRect(0, 0, W, H);

    // Draw decorative page chrome lines
    ctx.strokeStyle = '#252840';
    ctx.lineWidth = 1;
    for (let y = 40; y < H; y += 40) {
        ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(W - 20, y); ctx.stroke();
    }

    if (!clicks.length) return;

    // Build density map at low resolution for performance
    const CELL = 12;
    const density = {};
    for (const c of clicks) {
        const refW = c.viewport_width || REF_W;
        const refH = c.viewport_height || REF_H;
        const nx = c.x / refW;
        const ny = c.y / refH;
        const px = Math.round((nx * W) / CELL) * CELL;
        const py = Math.round((ny * H) / CELL) * CELL;
        const key = `${px},${py}`;
        density[key] = (density[key] || 0) + 1;
    }

    const maxDensity = Math.max(...Object.values(density), 1);

    // Draw heatmap blobs
    for (const [key, count] of Object.entries(density)) {
        const [px, py] = key.split(',').map(Number);
        const refW = REF_W;  // canvas coords
        const nx = px / W;
        const ny = py / H;
        const cx = nx * W;
        const cy = ny * H;
        const intensity = count / maxDensity;
        const radius = 30 + intensity * 40;  // 30–70px

        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        const alpha = 0.15 + intensity * 0.55;

        // Colour progression: cool (blue-purple) → warm (teal → orange → red)
        if (intensity < 0.3) {
            gradient.addColorStop(0, `rgba(108,99,255,${alpha})`);
            gradient.addColorStop(1, 'rgba(108,99,255,0)');
        } else if (intensity < 0.6) {
            gradient.addColorStop(0, `rgba(0,212,170,${alpha})`);
            gradient.addColorStop(1, 'rgba(0,212,170,0)');
        } else if (intensity < 0.85) {
            gradient.addColorStop(0, `rgba(251,191,36,${alpha})`);
            gradient.addColorStop(1, 'rgba(251,191,36,0)');
        } else {
            gradient.addColorStop(0, `rgba(255,107,107,${alpha})`);
            gradient.addColorStop(1, 'rgba(255,107,107,0)');
        }

        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw individual click dots on top
    for (const c of clicks) {
        const refW = c.viewport_width || REF_W;
        const refH = c.viewport_height || REF_H;
        const nx = c.x / refW;
        const ny = c.y / refH;
        const cx = nx * W;
        const cy = ny * H;

        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(108,99,255,0.9)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    return maxDensity;
}

export default function Heatmap() {
    const [pages, setPages] = useState([]);
    const [pagesLoading, setPagesLoading] = useState(true);
    const [pagesError, setPagesError] = useState(null);
    const [selectedUrl, setSelectedUrl] = useState('');
    const [clicks, setClicks] = useState([]);
    const [clicksLoading, setClicksLoading] = useState(false);
    const [clicksError, setClicksError] = useState(null);
    const [maxDensity, setMaxDensity] = useState(1);

    const canvasRef = useRef(null);

    // Load page list
    useEffect(() => {
        fetchPages()
            .then((data) => {
                setPages(data);
                if (data.length) setSelectedUrl(data[0]);
            })
            .catch((err) => setPagesError(err.message))
            .finally(() => setPagesLoading(false));
    }, []);

    // Load click events when page changes
    const loadClicks = useCallback(async (url) => {
        if (!url) return;
        setClicksLoading(true);
        setClicksError(null);
        try {
            const data = await fetchHeatmap(url);
            setClicks(data);
        } catch (err) {
            setClicksError(err.message);
            setClicks([]);
        } finally {
            setClicksLoading(false);
        }
    }, []);

    useEffect(() => { loadClicks(selectedUrl); }, [selectedUrl, loadClicks]);

    // Render heatmap on canvas whenever clicks change
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const md = drawHeatmap(canvas, clicks);
        setMaxDensity(md || 1);
    }, [clicks]);

    // Resize canvas to match container width
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const resize = () => {
            const parentW = canvas.parentElement?.clientWidth || 800;
            canvas.width = parentW;
            canvas.height = Math.round(parentW * (9 / 16));
            drawHeatmap(canvas, clicks);
        };
        resize();
        const ro = new ResizeObserver(resize);
        if (canvas.parentElement) ro.observe(canvas.parentElement);
        return () => ro.disconnect();
    }, [clicks]);

    return (
        <div>
            <div className="page-header">
                <h1>Click Heatmap</h1>
                <p>Visualize where users click on each tracked page</p>
            </div>

            {/* Legend */}
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Intensity →</span>
                    {[
                        ['#6c63ff', 'Low'],
                        ['#00d4aa', 'Medium'],
                        ['#fbbf24', 'High'],
                        ['#ff6b6b', 'Very High'],
                    ].map(([color, label]) => (
                        <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text2)' }}>
                            <span style={{ width: 12, height: 12, borderRadius: '50%', background: color, display: 'inline-block' }} />
                            {label}
                        </span>
                    ))}
                    <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--muted)' }}>
                        ⚠️ Coords are viewport-relative (clientX/Y). See README for scroll limitations.
                    </span>
                </div>
            </div>

            {/* Toolbar */}
            <div className="toolbar">
                <span className="toolbar__label">Page URL:</span>
                {pagesLoading ? (
                    <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Loading pages…</span>
                ) : pagesError ? (
                    <span style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>Error: {pagesError}</span>
                ) : pages.length === 0 ? (
                    <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No pages tracked yet</span>
                ) : (
                    <div className="select-wrap">
                        <select
                            id="page-url-select"
                            value={selectedUrl}
                            onChange={(e) => setSelectedUrl(e.target.value)}
                            aria-label="Select a tracked page URL"
                        >
                            {pages.map((p) => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>
                )}

                <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => loadClicks(selectedUrl)}
                    disabled={!selectedUrl || clicksLoading}
                    aria-label="Refresh heatmap data"
                >
                    ↻ Refresh
                </button>

                {clicks.length > 0 && (
                    <span style={{ fontSize: '0.82rem', color: 'var(--text2)', marginLeft: 'auto' }}>
                        <strong style={{ color: 'var(--accent2)' }}>{clicks.length}</strong> click{clicks.length !== 1 ? 's' : ''} recorded
                        {maxDensity > 1 && <> · peak density: <strong>{maxDensity}</strong></>}
                    </span>
                )}
            </div>

            {clicksError && <ErrorBox message={clicksError} />}

            {/* Canvas */}
            <div className="heatmap-wrap">
                {clicksLoading && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, background: 'rgba(13,15,26,.6)' }}>
                        <Spinner />
                    </div>
                )}

                {!clicksLoading && !clicksError && clicks.length === 0 && selectedUrl && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                        <EmptyState
                            icon="🖱️"
                            title="No clicks recorded"
                            description="Open the demo page, click around, then refresh."
                        />
                    </div>
                )}

                {!selectedUrl && !pagesLoading && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                        <EmptyState
                            icon="📄"
                            title="No page selected"
                            description="Select a tracked page from the dropdown above."
                        />
                    </div>
                )}

                <canvas
                    ref={canvasRef}
                    className="heatmap-canvas"
                    aria-label="Click heatmap visualization"
                    role="img"
                />
            </div>

            {/* Attribution note */}
            <div style={{ marginTop: '1rem', fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                <strong>Coordinate system:</strong> The tracker records <code>clientX</code> / <code>clientY</code> at the time of the click.
                These are <em>viewport-relative</em> values — they do not account for page scroll position.
                Each dot's position is normalized against the viewport dimensions recorded with the event
                (falling back to a {REF_W}×{REF_H} reference). Clicks from different viewport sizes will be
                normalized proportionally.
            </div>
        </div>
    );
}

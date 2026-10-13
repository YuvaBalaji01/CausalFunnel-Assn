import { useState, useEffect, useCallback } from 'react';
import { fetchSessions, fetchSessionEvents } from '../services/api';
import { Spinner, ErrorBox, EmptyState, formatTime, relativeTime, truncate } from './ui';

function EventBadge({ type }) {
    const cls = type === 'click' ? 'badge--click' : 'badge--page-view';
    const icon = type === 'click' ? '🖱️' : '📄';
    return <span className={`badge ${cls}`}>{icon} {type}</span>;
}

function EventTimeline({ events }) {
    if (!events.length) {
        return <EmptyState icon="📋" title="No events" description="This session has no recorded events." />;
    }
    return (
        <ul className="timeline" aria-label="Session event timeline">
            {events.map((ev, i) => (
                <li key={i} className="timeline__item">
                    <div
                        className={`timeline__dot timeline__dot--${ev.event_type === 'click' ? 'click' : 'page-view'}`}
                        aria-hidden="true"
                    />
                    <div className="timeline__body">
                        <div className="timeline__type">
                            <EventBadge type={ev.event_type} />
                        </div>
                        <div className="timeline__meta" style={{ marginTop: '0.3rem' }}>
                            <div>🕒 {formatTime(ev.timestamp)}</div>
                            <div title={ev.page_url}>🔗 {truncate(ev.page_url, 70)}</div>
                            {ev.event_type === 'click' && ev.x != null && (
                                <div>📍 ({Math.round(ev.x)}, {Math.round(ev.y)})
                                    {ev.viewport_width ? ` · viewport ${ev.viewport_width}×${ev.viewport_height}` : ''}
                                </div>
                            )}
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    );
}

export default function Sessions() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [events, setEvents] = useState([]);
    const [eventsLoading, setEventsLoading] = useState(false);
    const [eventsError, setEventsError] = useState(null);

    const loadSessions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchSessions();
            setSessions(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadSessions(); }, [loadSessions]);

    const selectSession = async (sid) => {
        if (sid === selectedId) { setSelectedId(null); setEvents([]); return; }
        setSelectedId(sid);
        setEventsLoading(true);
        setEventsError(null);
        try {
            const data = await fetchSessionEvents(sid);
            setEvents(data);
        } catch (err) {
            setEventsError(err.message);
            setEvents([]);
        } finally {
            setEventsLoading(false);
        }
    };

    // Stats
    const totalEvents = sessions.reduce((s, x) => s + x.total_events, 0);
    const uniquePages = new Set(
        sessions.flatMap ? [] : []   // derived from events — approximation via session count
    ).size;

    return (
        <div>
            <div className="page-header">
                <h1>Sessions</h1>
                <p>All recorded user sessions · click a row to view the event timeline</p>
            </div>

            {/* Stats strip */}
            <div className="stats-strip">
                <div className="stat-card">
                    <div className="stat-card__label">Total Sessions</div>
                    <div className="stat-card__value accent">{sessions.length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card__label">Total Events</div>
                    <div className="stat-card__value teal">{totalEvents}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card__label">Avg Events / Session</div>
                    <div className="stat-card__value success">
                        {sessions.length ? (totalEvents / sessions.length).toFixed(1) : '—'}
                    </div>
                </div>
            </div>

            {error && <ErrorBox message={error} />}

            <div className="split-layout">
                {/* Session list */}
                <div>
                    <div className="section-title">
                        Session List
                        <button
                            className="btn btn--ghost btn--sm"
                            style={{ float: 'right', marginTop: '-2px' }}
                            onClick={loadSessions}
                            aria-label="Refresh sessions"
                        >
                            ↻ Refresh
                        </button>
                    </div>

                    {loading ? (
                        <Spinner />
                    ) : sessions.length === 0 ? (
                        <EmptyState
                            icon="📭"
                            title="No sessions yet"
                            description="Open the demo page and interact with it to generate events."
                        />
                    ) : (
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Session ID</th>
                                        <th>Events</th>
                                        <th>Last Active</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.map((s) => (
                                        <tr
                                            key={s.session_id}
                                            className={selectedId === s.session_id ? 'row--selected' : ''}
                                            onClick={() => selectSession(s.session_id)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td>
                                                <code className="mono" style={{ fontSize: '0.75rem', color: 'var(--text)' }}>
                                                    {s.session_id.slice(0, 20)}…
                                                </code>
                                            </td>
                                            <td>
                                                <span className="badge badge--page-view">{s.total_events}</span>
                                            </td>
                                            <td title={formatTime(s.last_event_at)} style={{ whiteSpace: 'nowrap' }}>
                                                {relativeTime(s.last_event_at)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Event timeline panel */}
                <div className="card" style={{ minHeight: '300px' }}>
                    <div className="section-title">
                        {selectedId
                            ? `Event Timeline · ${selectedId.slice(0, 16)}…`
                            : 'Event Timeline'}
                    </div>

                    {!selectedId && (
                        <EmptyState
                            icon="👆"
                            title="No session selected"
                            description="Click a session row on the left to view its events."
                        />
                    )}

                    {selectedId && eventsLoading && <Spinner />}
                    {selectedId && eventsError && <ErrorBox message={eventsError} />}
                    {selectedId && !eventsLoading && !eventsError && (
                        <EventTimeline events={events} />
                    )}
                </div>
            </div>
        </div>
    );
}

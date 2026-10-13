// Reusable UI primitives

export function Spinner() {
    return (
        <div className="state-box">
            <div className="spinner" role="status" aria-label="Loading" />
            <span className="state-box__desc">Loading…</span>
        </div>
    );
}

export function ErrorBox({ message }) {
    return (
        <div className="error-box" role="alert">
            <span>⚠️</span>
            <span>{message || 'Something went wrong.'}</span>
        </div>
    );
}

export function EmptyState({ icon = '📭', title, description }) {
    return (
        <div className="state-box">
            <div className="state-box__icon">{icon}</div>
            {title && <div className="state-box__title">{title}</div>}
            {description && <div className="state-box__desc">{description}</div>}
        </div>
    );
}

/**
 * Format an ISO timestamp into a human-readable local string.
 */
export function formatTime(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    } catch {
        return iso;
    }
}

/**
 * Relative time label (e.g. "3 minutes ago").
 */
export function relativeTime(iso) {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
}

/**
 * Truncate a string to maxLen characters.
 */
export function truncate(str, maxLen = 60) {
    if (!str) return '';
    return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

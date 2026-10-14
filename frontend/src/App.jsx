import { useState } from 'react';
import Sessions from './components/Sessions';
import Heatmap from './components/Heatmap';
import './App.css';

const TABS = [
  { id: 'sessions', label: '📋 Sessions' },
  { id: 'heatmap', label: '🔥 Heatmap' },
];

function Navbar({ activeTab, onTabChange }) {
  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar__brand">
        <span className="navbar__logo">⚡</span>
        Causal<span>Funnel</span>
        <a href="https://causalfunnel-assn-1.onrender.com/demo.html" target="_blank" rel="noreferrer"><span className="navbar__badge">Open Demo Page ↗ </span></a>
     
      </div>
      <div className="navbar__nav" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`navbar__link${activeTab === t.id ? ' active' : ''}`}
            onClick={() => onTabChange(t.id)}
            role="tab"
            aria-selected={activeTab === t.id}
            id={`tab-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('sessions');

  return (
    <div className="app-layout">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main
        className="main-content"
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === 'sessions' && <Sessions />}
        {activeTab === 'heatmap' && <Heatmap />}
      </main>
      <footer style={{ textAlign: 'center', padding: '1rem 2rem', borderTop: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.78rem' }}>
        CausalFunnel Analytics Dashboard{' '}
        <a href="https://causalfunnel-assn-1.onrender.com/demo.html" target="_blank" rel="noreferrer">Open Demo Page ↗</a>
      </footer>
    </div>
  );
}

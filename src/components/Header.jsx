import React from 'react';

export default function Header() {
    return (
        <header className="header">
            <div className="header-brand">
                <div className="header-logo">⚡</div>
                <div>
                    <h1 className="header-title">ClipForge</h1>
                    <p className="header-subtitle" style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Premium Clipper</p>
                </div>
            </div>
            <div className="keyboard-hints" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="time-badge" style={{ padding: '4px 8px', fontSize: '11px' }}>Space</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Play</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="time-badge" style={{ padding: '4px 8px', fontSize: '11px' }}>A</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Add</span>
                </div>
            </div>
        </header>
    );
}

import React from 'react';

export default function Header() {
    return (
        <header className="header">
            <div className="header-brand">
                <div className="header-logo">⚡</div>
                <div>
                    <h1 className="header-title">ClipForge</h1>
                    <p className="header-subtitle">YouTube Segment Downloader</p>
                </div>
            </div>
            <div className="keyboard-hints" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="kbd">Space</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Play/Pause</span>
                <span className="kbd">A</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Add Segment</span>
            </div>
        </header>
    );
}

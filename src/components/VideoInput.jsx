import React, { useState } from 'react';

export default function VideoInput({ onLoadVideo, isLoading, quality, onQualityChange }) {
    const [url, setUrl] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (url.trim()) {
            onLoadVideo(url.trim());
        }
    };

    return (
        <form className="video-input-wrapper" onSubmit={handleSubmit}>
            <input
                id="video-url-input"
                type="text"
                className="video-input"
                placeholder="Paste YouTube URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
                autoFocus
            />
            
            <div className="quality-select-wrapper">
                <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', fontWeight: '500' }}>
                    Quality:
                </span>
                <select 
                    className="quality-select"
                    value={quality}
                    onChange={(e) => onQualityChange(e.target.value)}
                    disabled={isLoading}
                >
                    <option value="best">Best</option>
                    <option value="1080p">1080p</option>
                    <option value="720p">720p</option>
                    <option value="480p">480p</option>
                    <option value="360p">360p</option>
                </select>
            </div>

            <button
                id="load-video-btn"
                type="submit"
                className="btn btn-primary"
                disabled={!url.trim() || isLoading}
            >
                {isLoading ? 'Loading...' : '🔍 Load'}
            </button>
        </form>
    );
}

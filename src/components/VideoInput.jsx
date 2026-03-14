import React, { useState } from 'react';

export default function VideoInput({ onLoadVideo, isLoading }) {
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
                placeholder="Paste YouTube URL here — e.g. https://youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
                autoFocus
            />
            <button
                id="load-video-btn"
                type="submit"
                className="btn btn-primary"
                disabled={!url.trim() || isLoading}
            >
                {isLoading ? (
                    <>
                        <span style={{ animation: 'pulse 1s infinite' }}>⏳</span>
                        Loading...
                    </>
                ) : (
                    <>🔍 Load Video</>
                )}
            </button>
        </form>
    );
}

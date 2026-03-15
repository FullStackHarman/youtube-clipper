import React, { useState, useRef, useCallback, useEffect } from 'react';
import Header from './components/Header.jsx';
import VideoInput from './components/VideoInput.jsx';
import VideoPlayer from './components/VideoPlayer.jsx';
import TimelineSlider from './components/TimelineSlider.jsx';
import SegmentList from './components/SegmentList.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import { formatTime, extractVideoId } from './utils/formatTime.js';

let segmentIdCounter = 0;

export default function App() {
    // ===== State =====
    const [videoUrl, setVideoUrl] = useState('');
    const [videoInfo, setVideoInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [segments, setSegments] = useState([]);
    const [activeSegmentIndex, setActiveSegmentIndex] = useState(-1);
    const [currentRange, setCurrentRange] = useState([0, 30]);
    const [quality, setQuality] = useState('best');
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(null);
    const [toast, setToast] = useState(null);

    const playerRef = useRef(null);

    // ===== Toast Helper =====
    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    // ===== Load Video Metadata =====
    const handleLoadVideo = useCallback(async (url) => {
        setIsLoading(true);
        setVideoInfo(null);
        setSegments([]);
        setProgress(null);

        try {
            const res = await fetch('/api/metadata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });

            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to load video');
                setVideoUrl(url);
                setVideoInfo(data);
                setCurrentRange([0, Math.min(30, data.duration)]);
                showToast(`Loaded: ${data.title}`);
            } else {
                const text = await res.text();
                console.error('Non-JSON response:', text);
                throw new Error(`Server returned non-JSON response. Is the backend running? (Status: ${res.status})`);
            }
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    // ===== Add Segment =====
    const handleAddSegment = useCallback(() => {
        if (!videoInfo) return;
        const [start, end] = currentRange;
        if (start >= end) {
            showToast('Invalid segment: start must be before end', 'error');
            return;
        }

        const newSegment = {
            id: `seg_${++segmentIdCounter}`,
            start,
            end,
        };

        setSegments((prev) => [...prev, newSegment]);
        showToast(`Segment added: ${formatTime(start)} → ${formatTime(end)}`);
    }, [currentRange, videoInfo, showToast]);

    // ===== Delete Segment =====
    const handleDeleteSegment = useCallback((index) => {
        setSegments((prev) => prev.filter((_, i) => i !== index));
        setActiveSegmentIndex(-1);
    }, []);

    // ===== Edit Segment =====
    const handleEditSegment = useCallback((index, updated) => {
        setSegments((prev) =>
            prev.map((seg, i) => (i === index ? { ...seg, ...updated } : seg))
        );
        showToast('Segment updated');
    }, [showToast]);

    // ===== Reorder Segments =====
    const handleReorder = useCallback((fromIndex, toIndex) => {
        setSegments((prev) => {
            const updated = [...prev];
            const [moved] = updated.splice(fromIndex, 1);
            updated.splice(toIndex, 0, moved);
            return updated;
        });
    }, []);

    // ===== Select / Preview Segment =====
    const handleSelectSegment = useCallback((index) => {
        setActiveSegmentIndex(index);
        const seg = segments[index];
        if (seg && playerRef.current) {
            playerRef.current.seekTo(seg.start);
            playerRef.current.play();
        }
    }, [segments]);

    // ===== Clear All =====
    const handleClearAll = useCallback(() => {
        setSegments([]);
        setActiveSegmentIndex(-1);
        showToast('All segments cleared');
    }, [showToast]);

    // ===== Download / Process =====
    const handleDownload = useCallback(async () => {
        if (segments.length === 0 || !videoUrl) return;

        setProcessing(true);
        setProgress({ step: 'downloading', progress: 0, message: 'Starting...' });

        try {
            // Start processing
            const res = await fetch('/api/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: videoUrl,
                    quality: quality,
                    segments: segments.map((s) => ({ start: s.start, end: s.end })),
                }),
            });

            const contentType = res.headers.get('content-type');
            let data;
            if (contentType && contentType.includes('application/json')) {
                data = await res.json();
            } else {
                const text = await res.text();
                console.error('Non-JSON response:', text);
                throw new Error(`Server error: received HTML/text instead of JSON. (Status: ${res.status})`);
            }

            if (!res.ok) throw new Error(data.error || 'Processing failed');

            const { jobId } = data;

            // Listen for progress via SSE
            const evtSource = new EventSource(`/api/progress/${jobId}`);

            evtSource.onmessage = (event) => {
                const progressData = JSON.parse(event.data);
                setProgress(progressData);

                if (progressData.step === 'done') {
                    evtSource.close();
                    // Trigger download
                    const link = document.createElement('a');
                    link.href = `/api/file/${jobId}`;
                    link.download = 'clipforge_output.mp4';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    showToast('Download started! 🎉');
                    setTimeout(() => {
                        setProcessing(false);
                    }, 2000);
                }

                if (progressData.step === 'error') {
                    evtSource.close();
                    setProcessing(false);
                    showToast(progressData.message, 'error');
                }
            };

            evtSource.onerror = () => {
                evtSource.close();
                // Don't set error immediately — the job might still succeed
                // We'll check progress once more
                setTimeout(async () => {
                    try {
                        const checkRes = await fetch(`/api/file/${jobId}`, { method: 'HEAD' });
                        if (checkRes.ok) {
                            setProgress({ step: 'done', progress: 100, message: 'Processing complete!' });
                            const link = document.createElement('a');
                            link.href = `/api/file/${jobId}`;
                            link.download = 'clipforge_output.mp4';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            showToast('Download started! 🎉');
                        } else {
                            setProgress({ step: 'error', progress: 0, message: 'Connection lost during processing' });
                        }
                    } catch {
                        setProgress({ step: 'error', progress: 0, message: 'Connection lost during processing' });
                    }
                    setProcessing(false);
                }, 2000);
            };
        } catch (err) {
            setProgress({ step: 'error', progress: 0, message: err.message });
            setProcessing(false);
        }
    }, [segments, videoUrl, showToast]);

    // ===== Keyboard Shortcuts =====
    useEffect(() => {
        const handleKey = (e) => {
            // Don't trigger if typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.code === 'Space') {
                e.preventDefault();
                playerRef.current?.togglePlay();
            }
            if (e.code === 'KeyA' && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                handleAddSegment();
            }
        };

        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [handleAddSegment]);

    // ===== Calculate total duration of segments =====
    const totalSegmentDuration = segments.reduce(
        (sum, seg) => sum + (seg.end - seg.start),
        0
    );

    const videoId = videoInfo ? extractVideoId(videoUrl) : null;

    const handleSliderSlide = useCallback((time) => {
        if (playerRef.current) {
            playerRef.current.seekTo(time);
        }
    }, []);

    return (
        <div className="app-container">
            <Header />

            <div className="main-content">
                {/* ===== Left Panel ===== */}
                <div className="left-panel">
                    <VideoInput 
                        onLoadVideo={handleLoadVideo} 
                        isLoading={isLoading} 
                        quality={quality}
                        onQualityChange={setQuality}
                    />

                    <VideoPlayer ref={playerRef} videoId={videoId} />

                    {videoInfo && (
                        <div className="video-info-bar fade-in">
                            <span style={{ fontSize: '16px' }}>🎥</span>
                            <span className="video-info-title">{videoInfo.title}</span>
                            <span className="video-info-duration">
                                {formatTime(videoInfo.duration)}
                            </span>
                        </div>
                    )}

                    {videoInfo && (
                        <TimelineSlider
                            duration={videoInfo.duration}
                            currentRange={currentRange}
                            onRangeChange={setCurrentRange}
                            segments={segments}
                            onSlide={handleSliderSlide}
                        />
                    )}

                    {videoInfo && (
                        <div className="action-bar fade-in">
                            <button
                                id="add-segment-btn"
                                className="btn btn-primary"
                                onClick={handleAddSegment}
                                disabled={processing}
                            >
                                ✂️ Add Segment
                            </button>

                            <button
                                id="download-btn"
                                className="btn btn-primary"
                                onClick={handleDownload}
                                disabled={segments.length === 0 || processing}
                                style={{
                                    background: segments.length > 0 && !processing
                                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                        : undefined,
                                    boxShadow: segments.length > 0 && !processing
                                        ? '0 4px 15px rgba(16, 185, 129, 0.3)'
                                        : undefined,
                                }}
                            >
                                {processing ? 'Processing...' : `⬇️ Download ${segments.length > 0 ? `(${segments.length} clips)` : ''}`}
                            </button>

                            {segments.length > 0 && (
                                <span style={{
                                    fontSize: '13px',
                                    color: 'var(--text-muted)',
                                    marginLeft: 'auto',
                                }}>
                                    Total: {formatTime(totalSegmentDuration)}
                                </span>
                            )}
                        </div>
                    )}

                    {progress && <ProgressBar progress={progress} />}
                </div>

                {/* ===== Right Panel ===== */}
                <SegmentList
                    segments={segments}
                    activeIndex={activeSegmentIndex}
                    onSelect={handleSelectSegment}
                    onDelete={handleDeleteSegment}
                    onEdit={handleEditSegment}
                    onReorder={handleReorder}
                    onClearAll={handleClearAll}
                />
            </div>

            {/* ===== Toast Notification ===== */}
            {toast && (
                <div className={`toast ${toast.type}`}>
                    <span>{toast.type === 'error' ? '❌' : '✅'}</span>
                    {toast.message}
                </div>
            )}
        </div>
    );
}

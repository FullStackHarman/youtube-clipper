import React, { useEffect, useRef, useCallback } from 'react';
import noUiSlider from 'nouislider';
import 'nouislider/dist/nouislider.css';
import { formatTime } from '../utils/formatTime.js';

export default function TimelineSlider({
    duration,
    currentRange,
    onRangeChange,
    segments,
}) {
    const sliderRef = useRef(null);
    const sliderInstance = useRef(null);

    // Initialize / recreate slider when duration changes
    useEffect(() => {
        if (!duration || !sliderRef.current) return;

        // Destroy existing
        if (sliderInstance.current) {
            sliderInstance.current.destroy();
        }

        const slider = noUiSlider.create(sliderRef.current, {
            start: [currentRange[0], currentRange[1]],
            connect: true,
            range: {
                min: 0,
                max: duration,
            },
            step: 1,
            tooltips: [
                { to: (v) => formatTime(v) },
                { to: (v) => formatTime(v) },
            ],
            behaviour: 'drag-tap',
            pips: {
                mode: 'count',
                values: Math.min(Math.ceil(duration / 60) + 1, 12),
                format: { to: (v) => formatTime(v) },
                density: 3,
            },
        });

        slider.on('update', (values) => {
            onRangeChange([parseFloat(values[0]), parseFloat(values[1])]);
        });

        sliderInstance.current = slider;

        return () => {
            if (sliderInstance.current) {
                sliderInstance.current.destroy();
                sliderInstance.current = null;
            }
        };
    }, [duration]); // only re-create on duration change

    // Render segment markers
    const markers = segments.map((seg, i) => {
        const left = (seg.start / duration) * 100;
        const width = ((seg.end - seg.start) / duration) * 100;
        return (
            <div
                key={i}
                className="timeline-marker"
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`Segment ${i + 1}: ${formatTime(seg.start)} → ${formatTime(seg.end)}`}
            />
        );
    });

    return (
        <div className="timeline-section">
            <div className="timeline-controls">
                <div className="timeline-time-display">
                    <span className="time-badge">{formatTime(currentRange[0])}</span>
                    <span className="time-arrow">→</span>
                    <span className="time-badge">{formatTime(currentRange[1])}</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Selection: {formatTime(currentRange[1] - currentRange[0])}
                </span>
            </div>

            <div className="slider-wrapper">
                <div ref={sliderRef} id="timeline-slider" />
                {duration > 0 && (
                    <div className="timeline-markers">{markers}</div>
                )}
            </div>
        </div>
    );
}

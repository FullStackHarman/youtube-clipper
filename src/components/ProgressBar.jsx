import React from 'react';

const STEPS = [
    { key: 'downloading', label: 'Download', icon: '⬇️' },
    { key: 'cutting', label: 'Cut', icon: '✂️' },
    { key: 'merging', label: 'Merge', icon: '🔗' },
    { key: 'done', label: 'Done', icon: '✅' },
];

export default function ProgressBar({ progress }) {
    if (!progress) return null;

    const { step, progress: pct, message } = progress;
    const isError = step === 'error';
    const isDone = step === 'done';

    const currentStepIndex = STEPS.findIndex((s) => s.key === step);

    // Calculate overall progress
    let overallPct = 0;
    if (isDone) {
        overallPct = 100;
    } else if (isError) {
        overallPct = 0;
    } else {
        const stepsWeight = 100 / STEPS.length;
        overallPct = currentStepIndex * stepsWeight + (pct / 100) * stepsWeight;
    }

    return (
        <div className="progress-container fade-in">
            <div className="progress-steps">
                {STEPS.map((s, i) => {
                    let status = '';
                    if (isError) status = 'error';
                    else if (i < currentStepIndex || isDone) status = 'completed';
                    else if (i === currentStepIndex) status = 'active';

                    return (
                        <div key={s.key} className={`progress-step ${status}`}>
                            <div className="progress-step-dot">{s.icon}</div>
                            <span className="progress-step-label">{s.label}</span>
                        </div>
                    );
                })}
            </div>

            <div className="progress-bar-track">
                <div
                    className="progress-bar-fill"
                    style={{ width: `${overallPct}%` }}
                />
            </div>

            <p className={`progress-message ${isError ? 'progress-error' : ''}`}>
                {message}
            </p>

            {isDone && (
                <div style={{ textAlign: 'center', marginTop: '12px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--success)' }}>
                        Your video is ready! The download will start automatically.
                    </span>
                </div>
            )}
        </div>
    );
}

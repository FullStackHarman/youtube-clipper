import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { getMetadata, downloadVideo } from './services/ytdlp.js';
import { cutSegment, mergeSegments } from './services/ffmpeg.js';
import { metadataLimiter, processLimiter } from './middleware/rateLimiter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMP_DIR = path.join(__dirname, 'temp');
const MAX_DURATION = 3600; // 1 hour in seconds

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const app = express();
app.use(cors());
app.use(express.json());

// ============ SSE Progress Store ============
const jobProgress = new Map();

function updateProgress(jobId, step, progress, message) {
    const data = { step, progress, message, timestamp: Date.now() };
    jobProgress.set(jobId, data);
}

// ============ ROUTES ============

// Get video metadata
app.post('/api/metadata', metadataLimiter, async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Basic YouTube URL validation
        const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)/;
        if (!ytRegex.test(url)) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        const metadata = await getMetadata(url);

        if (metadata.duration > MAX_DURATION) {
            return res.status(400).json({
                error: `Video is too long (${Math.round(metadata.duration / 60)} min). Maximum allowed duration is 60 minutes.`,
            });
        }

        res.json(metadata);
    } catch (err) {
        console.error('Metadata error for URL:', req.body.url);
        console.error('Error detail:', err.message);
        res.status(500).json({ 
            error: 'Failed to fetch video metadata.',
            details: err.message
        });
    }
});

// SSE Progress endpoint
app.get('/api/progress/:jobId', (req, res) => {
    const { jobId } = req.params;

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });

    const interval = setInterval(() => {
        const data = jobProgress.get(jobId);
        if (data) {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
            if (data.step === 'done' || data.step === 'error') {
                clearInterval(interval);
                setTimeout(() => res.end(), 500);
            }
        }
    }, 300);

    req.on('close', () => {
        clearInterval(interval);
    });
});

// Process video segments
app.post('/api/process', processLimiter, async (req, res) => {
    const { url, segments } = req.body;

    if (!url || !segments || !Array.isArray(segments) || segments.length === 0) {
        return res.status(400).json({ error: 'URL and segments array are required' });
    }

    if (segments.length > 20) {
        return res.status(400).json({ error: 'Maximum 20 segments allowed' });
    }

    const jobId = uuidv4();
    const jobDir = path.join(TEMP_DIR, jobId);
    fs.mkdirSync(jobDir, { recursive: true });

    // Immediately return the job ID
    res.json({ jobId });

    // Process in background
    try {
        // Step 1: Download video
        updateProgress(jobId, 'downloading', 0, 'Starting video download...');
        const { quality } = req.body;
        const videoBasePath = path.join(jobDir, 'source');
        const videoPath = await downloadVideo(url, videoBasePath, quality, (pct) => {
            updateProgress(jobId, 'downloading', Math.round(pct), `Downloading video (${quality || 'best'})... ${Math.round(pct)}%`);
        });
        updateProgress(jobId, 'downloading', 100, 'Download complete');

        // Step 2: Cut segments
        const segmentPaths = [];
        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            const segPath = path.join(jobDir, `segment_${i}.mp4`);
            updateProgress(
                jobId,
                'cutting',
                Math.round(((i) / segments.length) * 100),
                `Cutting segment ${i + 1} of ${segments.length}...`
            );
            await cutSegment(videoPath, seg.start, seg.end, segPath);
            segmentPaths.push(segPath);
        }
        updateProgress(jobId, 'cutting', 100, 'All segments cut');

        // Step 3: Merge segments
        updateProgress(jobId, 'merging', 0, 'Merging segments...');
        const outputPath = path.join(jobDir, 'output.mp4');

        if (segmentPaths.length === 1) {
            // Just rename if single segment
            fs.copyFileSync(segmentPaths[0], outputPath);
        } else {
            await mergeSegments(segmentPaths, outputPath);
        }

        updateProgress(jobId, 'done', 100, 'Processing complete! Ready for download.');
    } catch (err) {
        console.error('Processing error:', err.message);
        updateProgress(jobId, 'error', 0, `Processing failed: ${err.message}`);
    }
});

// Download processed file
app.get('/api/file/:jobId', (req, res) => {
    const { jobId } = req.params;
    const filePath = path.join(TEMP_DIR, jobId, 'output.mp4');

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found or still processing' });
    }

    const stat = fs.statSync(filePath);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="clipforge_output.mp4"`);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
});

// ============ TEMP FILE CLEANUP ============
// Delete job directories older than 30 minutes
setInterval(() => {
    try {
        const entries = fs.readdirSync(TEMP_DIR);
        const now = Date.now();
        for (const entry of entries) {
            const dirPath = path.join(TEMP_DIR, entry);
            const stat = fs.statSync(dirPath);
            if (stat.isDirectory() && now - stat.mtimeMs > 30 * 60 * 1000) {
                fs.rmSync(dirPath, { recursive: true, force: true });
                jobProgress.delete(entry);
                console.log(`Cleaned up: ${entry}`);
            }
        }
    } catch { }
}, 5 * 60 * 1000); // Every 5 minutes

// ============ START SERVER ============
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 ClipForge server running at http://localhost:${PORT}`);
});

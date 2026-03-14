import { spawn } from 'child_process';
import path from 'path';

/**
 * Get video metadata using yt-dlp --dump-json
 */
export function getMetadata(url) {
    return new Promise((resolve, reject) => {
        const proc = spawn('yt-dlp', [
            '--dump-json',
            '--no-playlist',
            '--no-warnings',
            url,
        ]);

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error(`yt-dlp metadata failed: ${stderr}`));
            }
            try {
                const info = JSON.parse(stdout);
                resolve({
                    videoId: info.id,
                    title: info.title || 'Untitled',
                    duration: info.duration || 0,
                    thumbnail: info.thumbnail || info.thumbnails?.[info.thumbnails.length - 1]?.url || '',
                    uploader: info.uploader || '',
                    description: (info.description || '').substring(0, 200),
                });
            } catch (e) {
                reject(new Error(`Failed to parse yt-dlp output: ${e.message}`));
            }
        });

        proc.on('error', (err) => {
            reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
        });
    });
}

/**
 * Download video using yt-dlp
 * @param {string} url - YouTube video URL
 * @param {string} outputPath - Output file path (without extension)
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<string>} - Path to downloaded file
 */
export function downloadVideo(url, outputPath, onProgress) {
    return new Promise((resolve, reject) => {
        const outputTemplate = `${outputPath}.%(ext)s`;
        const proc = spawn('yt-dlp', [
            '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '--merge-output-format', 'mp4',
            '--no-playlist',
            '--no-warnings',
            '--newline',
            '--progress',
            '-o', outputTemplate,
            url,
        ]);

        let stderr = '';
        let lastProgress = 0;

        proc.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            for (const line of lines) {
                const match = line.match(/(\d+\.?\d*)%/);
                if (match) {
                    const pct = parseFloat(match[1]);
                    if (pct > lastProgress) {
                        lastProgress = pct;
                        onProgress?.(Math.min(pct, 100));
                    }
                }
            }
        });

        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error(`yt-dlp download failed: ${stderr}`));
            }
            // Find the actual output file
            const finalPath = `${outputPath}.mp4`;
            resolve(finalPath);
        });

        proc.on('error', (err) => {
            reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
        });
    });
}

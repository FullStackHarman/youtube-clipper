import { spawn } from 'child_process';
import path from 'path';

/**
 * Get video metadata using yt-dlp --dump-json
 */
export function getMetadata(url) {
    return new Promise((resolve, reject) => {
        const proc = spawn('/opt/homebrew/opt/python@3.11/bin/python3.11', [
            '-m', 'yt_dlp',
            '--dump-json',
            '--no-playlist',
            '--no-warnings',
            '--force-ipv4',
            '--no-check-certificates',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            '--extractor-args', 'youtube:player_client=android,web',
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
export function downloadVideo(url, outputPath, quality, onProgress) {
    return new Promise((resolve, reject) => {
        let formatStr = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';

        if (quality === '1080p') {
            formatStr = 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best';
        } else if (quality === '720p') {
            formatStr = 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best';
        } else if (quality === '480p') {
            formatStr = 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best';
        } else if (quality === '360p') {
            formatStr = 'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360][ext=mp4]/best';
        }

        const outputTemplate = `${outputPath}.%(ext)s`;
        const proc = spawn('/opt/homebrew/opt/python@3.11/bin/python3.11', [
            '-m', 'yt_dlp',
            '-f', formatStr,
            '--merge-output-format', 'mp4',
            '--no-playlist',
            '--no-warnings',
            '--newline',
            '--progress',
            '--force-ipv4',
            '--no-check-certificates',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            '--extractor-args', 'youtube:player_client=android,web',
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

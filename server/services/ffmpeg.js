import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Cut a segment from a video file using FFmpeg
 * @param {string} inputPath - Input video file path
 * @param {number} start - Start time in seconds
 * @param {number} end - End time in seconds
 * @param {string} outputPath - Output segment file path
 * @returns {Promise<void>}
 */
export function cutSegment(inputPath, start, end, outputPath) {
    return new Promise((resolve, reject) => {
        const proc = spawn('ffmpeg', [
            '-y',
            '-ss', String(start),
            '-to', String(end),
            '-i', inputPath,
            '-c', 'copy',
            '-avoid_negative_ts', '1',
            outputPath,
        ]);

        let stderr = '';

        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error(`FFmpeg cut failed: ${stderr.slice(-500)}`));
            }
            resolve();
        });

        proc.on('error', (err) => {
            reject(new Error(`Failed to spawn FFmpeg: ${err.message}`));
        });
    });
}

/**
 * Merge multiple video segments into a single file using FFmpeg concat
 * @param {string[]} segmentPaths - Array of segment file paths
 * @param {string} outputPath - Output merged file path
 * @returns {Promise<void>}
 */
export function mergeSegments(segmentPaths, outputPath) {
    return new Promise((resolve, reject) => {
        // Create the concat list file
        const listPath = outputPath.replace('.mp4', '_list.txt');
        const listContent = segmentPaths
            .map((p) => `file '${p}'`)
            .join('\n');

        fs.writeFileSync(listPath, listContent);

        const proc = spawn('ffmpeg', [
            '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', listPath,
            '-c', 'copy',
            outputPath,
        ]);

        let stderr = '';

        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (code) => {
            // Clean up list file
            try { fs.unlinkSync(listPath); } catch { }

            if (code !== 0) {
                return reject(new Error(`FFmpeg merge failed: ${stderr.slice(-500)}`));
            }
            resolve();
        });

        proc.on('error', (err) => {
            reject(new Error(`Failed to spawn FFmpeg: ${err.message}`));
        });
    });
}

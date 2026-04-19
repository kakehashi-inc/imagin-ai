import { execFileSync, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';

// Locate ffmpeg binary: check ffmpeg-static package first, then system PATH
function findFfmpegPath(): string | null {
    // Try ffmpeg-static package
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const ffmpegStatic = require('ffmpeg-static') as string;
        if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
            return ffmpegStatic;
        }
    } catch {
        // ffmpeg-static not installed
    }

    // Try system ffmpeg
    try {
        execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
        return 'ffmpeg';
    } catch {
        // ffmpeg not on PATH
    }

    return null;
}

let cachedFfmpegPath: string | null | undefined;

function getFfmpegPath(): string | null {
    if (cachedFfmpegPath === undefined) {
        cachedFfmpegPath = findFfmpegPath();
    }
    return cachedFfmpegPath;
}

// Extract the first frame from a video file and save as JPEG thumbnail
export function extractVideoThumbnail(videoPath: string, outputPath: string, maxSize: number): boolean {
    const ffmpeg = getFfmpegPath();
    if (!ffmpeg) {
        console.warn('ffmpeg not available, skipping video thumbnail extraction');
        return false;
    }

    try {
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        execFileSync(
            ffmpeg,
            [
                '-i',
                videoPath,
                '-ss',
                '00:00:01',
                '-frames:v',
                '1',
                '-vf',
                `scale=${maxSize}:${maxSize}:force_original_aspect_ratio=decrease`,
                '-y',
                outputPath,
            ],
            { stdio: 'ignore', timeout: 30000 }
        );

        return fs.existsSync(outputPath);
    } catch (err) {
        console.error('Failed to extract video thumbnail:', err);
        return false;
    }
}

// Check if ffmpeg is available
export function isFfmpegAvailable(): boolean {
    return getFfmpegPath() !== null;
}

// Result of an in-memory PCM->MP3 encode attempt.
// Carries the failure reason so the caller can log/surface it, instead of being lost as `null`.
export type EncodePcmResult = { ok: true; data: Buffer } | { ok: false; reason: string };

// Encode raw PCM buffer to MP3 using ffmpeg (libmp3lame).
export function encodePcmToMp3(
    pcm: Buffer,
    sampleRate: number,
    channels: number,
    bitsPerSample: number
): EncodePcmResult {
    const ffmpeg = getFfmpegPath();
    if (!ffmpeg) {
        return { ok: false, reason: 'ffmpeg binary not available' };
    }

    const formatMap: Record<number, string> = { 8: 'u8', 16: 's16le', 24: 's24le', 32: 's32le' };
    const pcmFormat = formatMap[bitsPerSample] ?? 's16le';

    try {
        // Output: MP3 CBR 160 kbps, 48 kHz, mono (speech-oriented preset)
        const result = spawnSync(
            ffmpeg,
            [
                '-hide_banner',
                '-loglevel',
                'error',
                // Input (raw PCM from Gemini TTS)
                '-f',
                pcmFormat,
                '-ar',
                String(sampleRate),
                '-ac',
                String(channels),
                '-i',
                'pipe:0',
                // Output (MP3)
                '-codec:a',
                'libmp3lame',
                '-b:a',
                '160k',
                '-ar',
                '48000',
                '-ac',
                '1',
                '-f',
                'mp3',
                'pipe:1',
            ],
            {
                input: pcm,
                maxBuffer: 256 * 1024 * 1024,
                timeout: 60000,
            }
        );

        if (result.error) {
            return { ok: false, reason: `ffmpeg spawn error: ${result.error.message}` };
        }
        if (result.status !== 0) {
            const stderr = result.stderr?.toString().trim() ?? '';
            return {
                ok: false,
                reason: `ffmpeg exited with status ${result.status}${stderr ? `: ${stderr}` : ''}`,
            };
        }
        if (!result.stdout || result.stdout.length === 0) {
            return { ok: false, reason: 'ffmpeg produced empty output' };
        }
        return { ok: true, data: result.stdout };
    } catch (err) {
        return { ok: false, reason: err instanceof Error ? err.message : String(err) };
    }
}

// Wrap raw PCM in a minimal WAV (RIFF) container. Pure JS, no external dependencies,
// so this serves as a guaranteed-playable fallback when MP3 encoding fails.
// Returns a Buffer containing a 44-byte WAV header followed by the original PCM.
export function wrapPcmAsWav(pcm: Buffer, sampleRate: number, channels: number, bitsPerSample: number): Buffer {
    const byteRate = (sampleRate * channels * bitsPerSample) / 8;
    const blockAlign = (channels * bitsPerSample) / 8;
    const dataSize = pcm.length;
    const header = Buffer.alloc(44);

    header.write('RIFF', 0, 'ascii');
    header.writeUInt32LE(36 + dataSize, 4); // ChunkSize
    header.write('WAVE', 8, 'ascii');
    header.write('fmt ', 12, 'ascii');
    header.writeUInt32LE(16, 16); // Subchunk1Size (PCM)
    header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36, 'ascii');
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcm]);
}

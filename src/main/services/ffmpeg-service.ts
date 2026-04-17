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

// Encode raw PCM buffer to MP3 using ffmpeg (libmp3lame). Returns null on failure.
export function encodePcmToMp3(
    pcm: Buffer,
    sampleRate: number,
    channels: number,
    bitsPerSample: number
): Buffer | null {
    const ffmpeg = getFfmpegPath();
    if (!ffmpeg) {
        console.warn('ffmpeg not available, cannot encode PCM to MP3');
        return null;
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

        if (result.status !== 0) {
            const stderr = result.stderr?.toString() ?? '';
            console.error(`ffmpeg PCM->MP3 encoding failed (status=${result.status}): ${stderr}`);
            return null;
        }

        return result.stdout;
    } catch (err) {
        console.error('Failed to encode PCM to MP3:', err);
        return null;
    }
}

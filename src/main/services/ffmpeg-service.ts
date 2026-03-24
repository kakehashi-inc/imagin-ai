import { execFileSync } from 'child_process';
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

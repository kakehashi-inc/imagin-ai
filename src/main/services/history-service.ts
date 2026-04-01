import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import archiver from 'archiver';
import type { HistoryEntry, GenerationParams } from '../../shared/types';
import { THUMBNAIL_SIZE, THUMBNAIL_DIR_NAME, HISTORY_IMAGES_DIR } from '../../shared/constants';
import { loadSettings, ensureHistoryDir } from './settings-service';
import { extractVideoThumbnail } from './ffmpeg-service';

// --- Directory helpers ---

function getHistoryDir(): string {
    return ensureHistoryDir();
}

function getImagesDir(): string {
    return path.join(getHistoryDir(), HISTORY_IMAGES_DIR);
}

function getThumbDir(): string {
    return path.join(getHistoryDir(), THUMBNAIL_DIR_NAME);
}

function ensureDirs(): void {
    const imagesDir = getImagesDir();
    const thumbDir = getThumbDir();
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
    if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });
}

// --- Metadata helpers ---

function readMetadata(jsonPath: string): HistoryEntry | null {
    try {
        if (fs.existsSync(jsonPath)) {
            const raw = fs.readFileSync(jsonPath, 'utf-8');
            return JSON.parse(raw) as HistoryEntry;
        }
    } catch (err) {
        console.error(`Failed to read metadata from ${jsonPath}:`, err);
    }
    return null;
}

function writeMetadata(id: string, entry: HistoryEntry): void {
    ensureDirs();
    const metaPath = path.join(getImagesDir(), `${id}.json`);
    fs.writeFileSync(metaPath, JSON.stringify(entry, null, 2), 'utf-8');
}

// --- Public API ---

// Cached sorted entries (invalidated on create/delete)
let cachedEntries: HistoryEntry[] | null = null;

function invalidateCache(): void {
    cachedEntries = null;
}

// Load and sort all entries (uses cache if available)
function loadAllEntries(): HistoryEntry[] {
    if (cachedEntries) return cachedEntries;

    const imagesDir = getImagesDir();
    const entries: HistoryEntry[] = [];

    try {
        if (!fs.existsSync(imagesDir)) return entries;
        const files = fs.readdirSync(imagesDir);
        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            const entry = readMetadata(path.join(imagesDir, file));
            if (entry) entries.push(entry);
        }
    } catch (err) {
        console.error('Failed to read history directory:', err);
    }

    entries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    cachedEntries = entries;
    return entries;
}

// Get all history entries sorted by updatedAt descending
export function getAllHistory(): HistoryEntry[] {
    return loadAllEntries();
}

// Get a page of history entries (offset-based pagination)
export function getHistoryPage(offset: number, limit: number): { entries: HistoryEntry[]; total: number } {
    const all = loadAllEntries();
    return {
        entries: all.slice(offset, offset + limit),
        total: all.length,
    };
}

// Get total history count (fast, uses cache)
export function getHistoryCount(): number {
    return loadAllEntries().length;
}

// Create history entries from generation result (one entry per image)
export function createHistoryEntries(
    params: GenerationParams,
    modelDisplayName: string,
    imageBuffers: Buffer[],
    _mimeType: string,
    elapsedMs?: number
): HistoryEntry[] {
    invalidateCache();
    const now = new Date().toISOString();
    const entries: HistoryEntry[] = [];

    ensureDirs();

    for (let i = 0; i < imageBuffers.length; i++) {
        const id = uuidv4();

        // Save image as PNG
        const imagePath = path.join(getImagesDir(), `${id}.png`);
        fs.writeFileSync(imagePath, imageBuffers[i]);

        // Generate thumbnail as JPEG
        const thumbPath = path.join(getThumbDir(), `${id}.jpg`);
        generateThumbnail(imageBuffers[i], thumbPath);

        // Get image dimensions
        let imageWidth = 0;
        let imageHeight = 0;
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { nativeImage } = require('electron');
            const img = nativeImage.createFromBuffer(imageBuffers[i]);
            const size = img.getSize();
            imageWidth = size.width;
            imageHeight = size.height;
        } catch {
            // Ignore dimension read errors
        }

        const entry: HistoryEntry = {
            id,
            createdAt: now,
            updatedAt: now,
            model: params.model,
            modelDisplayName,
            prompt: params.prompt,
            negativePrompt: params.negativePrompt,
            aspectRatio: params.aspectRatio,
            quality: params.quality,
            numberOfImages: params.numberOfImages,
            referenceImagePaths: params.referenceImagePaths,
            generatedImagePaths: [imagePath],
            imageWidth,
            imageHeight,
            fileSize: imageBuffers[i].length,
            elapsedMs,
        };

        writeMetadata(id, entry);
        entries.push(entry);
    }

    return entries;
}

// Create history entry from video generation result
export function createVideoHistoryEntry(
    params: GenerationParams,
    modelDisplayName: string,
    videoBuffer: Buffer,
    elapsedMs?: number
): HistoryEntry {
    invalidateCache();
    const now = new Date().toISOString();
    const id = uuidv4();

    ensureDirs();

    // Save video as MP4
    const videoPath = path.join(getImagesDir(), `${id}.mp4`);
    fs.writeFileSync(videoPath, videoBuffer);

    // Generate thumbnail from the video using ffmpeg
    const thumbPath = path.join(getThumbDir(), `${id}.jpg`);
    extractVideoThumbnail(videoPath, thumbPath, THUMBNAIL_SIZE);

    const entry: HistoryEntry = {
        id,
        createdAt: now,
        updatedAt: now,
        model: params.model,
        modelDisplayName,
        prompt: params.prompt,
        negativePrompt: params.negativePrompt,
        aspectRatio: params.aspectRatio,
        quality: params.quality,
        numberOfImages: 1,
        referenceImagePaths: params.referenceImagePaths,
        generatedImagePaths: [videoPath],
        fileSize: videoBuffer.length,
        mediaType: 'video',
        videoDuration: params.duration,
        videoResolution: params.resolution,
        seed: params.seed,
        elapsedMs,
    };

    writeMetadata(id, entry);
    return entry;
}

// Create history entry from audio generation result
export function createAudioHistoryEntry(
    params: GenerationParams,
    modelDisplayName: string,
    audioBuffer: Buffer,
    audioTexts?: string[],
    elapsedMs?: number
): HistoryEntry {
    invalidateCache();
    const now = new Date().toISOString();
    const id = uuidv4();

    ensureDirs();

    // Save audio as MP3
    const audioPath = path.join(getImagesDir(), `${id}.mp3`);
    fs.writeFileSync(audioPath, audioBuffer);

    const entry: HistoryEntry = {
        id,
        createdAt: now,
        updatedAt: now,
        model: params.model,
        modelDisplayName,
        prompt: params.prompt,
        negativePrompt: '',
        aspectRatio: params.aspectRatio,
        quality: params.quality,
        numberOfImages: 1,
        referenceImagePaths: params.referenceImagePaths,
        generatedImagePaths: [audioPath],
        fileSize: audioBuffer.length,
        mediaType: 'audio',
        audioTexts,
        elapsedMs,
    };

    writeMetadata(id, entry);
    return entry;
}

// Generate a thumbnail using Electron nativeImage (JPEG, max long side THUMBNAIL_SIZE px)
function generateThumbnail(imageBuffer: Buffer, thumbPath: string): void {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { nativeImage } = require('electron');
        const img = nativeImage.createFromBuffer(imageBuffer);
        const size = img.getSize();

        // Scale so that the long side = THUMBNAIL_SIZE, maintaining aspect ratio
        const longSide = Math.max(size.width, size.height);
        const scale = longSide > THUMBNAIL_SIZE ? THUMBNAIL_SIZE / longSide : 1;
        const width = Math.round(size.width * scale);
        const height = Math.round(size.height * scale);

        const resized = img.resize({ width, height, quality: 'good' });
        // Always save as JPEG
        fs.writeFileSync(thumbPath, resized.toJPEG(60));
    } catch (err) {
        console.error('Failed to generate thumbnail:', err);
        fs.writeFileSync(thumbPath, imageBuffer);
    }
}

// Get thumbnail data as base64 data URL
export function getThumbnailDataUrl(imagePath: string): string {
    try {
        // Derive thumbnail path: same uuid, .jpg in thumbnails dir
        const baseName = path.basename(imagePath, path.extname(imagePath));
        const thumbPath = path.join(getThumbDir(), `${baseName}.jpg`);

        if (fs.existsSync(thumbPath)) {
            const data = fs.readFileSync(thumbPath);
            return `data:image/jpeg;base64,${data.toString('base64')}`;
        }

        // Fallback: read original image
        return getImageDataUrl(imagePath);
    } catch (err) {
        console.error('Failed to read thumbnail:', err);
        return '';
    }
}

// Get image data as base64 data URL
export function getImageDataUrl(imagePath: string): string {
    try {
        if (fs.existsSync(imagePath)) {
            const data = fs.readFileSync(imagePath);
            const ext = path.extname(imagePath).toLowerCase();
            let mime = 'image/png';
            if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
            else if (ext === '.mp4') mime = 'video/mp4';
            return `data:${mime};base64,${data.toString('base64')}`;
        }
    } catch (err) {
        console.error('Failed to read image:', err);
    }
    return '';
}

// Get file path for video playback (returns file:// URL)
export function getVideoFileUrl(videoPath: string): string {
    if (fs.existsSync(videoPath)) {
        return `file://${videoPath}`;
    }
    return '';
}

// Delete a single history entry
export function deleteHistoryEntry(id: string): void {
    invalidateCache();
    const pngPath = path.join(getImagesDir(), `${id}.png`);
    const mp4Path = path.join(getImagesDir(), `${id}.mp4`);
    const mp3Path = path.join(getImagesDir(), `${id}.mp3`);
    const jsonPath = path.join(getImagesDir(), `${id}.json`);
    const thumbPath = path.join(getThumbDir(), `${id}.jpg`);

    for (const p of [pngPath, mp4Path, mp3Path, jsonPath, thumbPath]) {
        try {
            if (fs.existsSync(p)) fs.unlinkSync(p);
        } catch (err) {
            console.error(`Failed to delete ${p}:`, err);
        }
    }
}

// Delete all history entries
export function deleteAllHistory(): void {
    invalidateCache();
    const imagesDir = getImagesDir();
    const thumbDir = getThumbDir();

    for (const dir of [imagesDir, thumbDir]) {
        try {
            if (!fs.existsSync(dir)) continue;
            const files = fs.readdirSync(dir);
            for (const file of files) {
                fs.unlinkSync(path.join(dir, file));
            }
        } catch (err) {
            console.error(`Failed to delete files in ${dir}:`, err);
            throw err;
        }
    }
}

// Export all history to a ZIP file
export function exportAllHistory(outputPath: string, onProgress?: (percent: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        const historyDir = getHistoryDir();
        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', { zlib: { level: 6 } });

        output.on('close', () => resolve());
        archive.on('error', (err: Error) => reject(err));

        if (onProgress) {
            archive.on('progress', (progress: { entries: { total: number; processed: number } }) => {
                const total = progress.entries.total;
                const processed = progress.entries.processed;
                const percent = total > 0 ? Math.round((processed / total) * 100) : 0;
                onProgress(percent);
            });
        }

        archive.pipe(output);
        archive.directory(historyDir, false);
        archive.finalize();
    });
}

// Move history directory
export function moveHistoryDir(newDir: string): void {
    invalidateCache();
    const settings = loadSettings();
    const oldDir = settings.historyDir;

    if (oldDir === newDir) return;

    if (!fs.existsSync(newDir)) {
        fs.mkdirSync(newDir, { recursive: true });
    }

    try {
        const items = fs.readdirSync(oldDir, { withFileTypes: true });
        for (const item of items) {
            const srcPath = path.join(oldDir, item.name);
            const destPath = path.join(newDir, item.name);
            fs.renameSync(srcPath, destPath);
        }
    } catch (err) {
        console.error('Failed to move history:', err);
        throw err;
    }
}

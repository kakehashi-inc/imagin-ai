import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import archiver from 'archiver';
import type { HistoryEntry, GenerationParams } from '../../shared/types';
import { HISTORY_METADATA_FILE, HISTORY_IMAGES_DIR, THUMBNAIL_DIR_NAME, THUMBNAIL_SIZE } from '../../shared/constants';
import { loadSettings, ensureHistoryDir } from './settings-service';

function getHistoryDir(): string {
    return ensureHistoryDir();
}

function getEntryDir(id: string): string {
    return path.join(getHistoryDir(), id);
}

function getImagesDir(id: string): string {
    return path.join(getEntryDir(id), HISTORY_IMAGES_DIR);
}

function getThumbnailDir(id: string): string {
    return path.join(getEntryDir(id), THUMBNAIL_DIR_NAME);
}

// Read a single history entry metadata
function readMetadata(entryDir: string): HistoryEntry | null {
    const metaPath = path.join(entryDir, HISTORY_METADATA_FILE);
    try {
        if (fs.existsSync(metaPath)) {
            const raw = fs.readFileSync(metaPath, 'utf-8');
            return JSON.parse(raw) as HistoryEntry;
        }
    } catch (err) {
        console.error(`Failed to read metadata from ${entryDir}:`, err);
    }
    return null;
}

// Save metadata for a history entry
function writeMetadata(id: string, entry: HistoryEntry): void {
    const entryDir = getEntryDir(id);
    if (!fs.existsSync(entryDir)) {
        fs.mkdirSync(entryDir, { recursive: true });
    }
    const metaPath = path.join(entryDir, HISTORY_METADATA_FILE);
    fs.writeFileSync(metaPath, JSON.stringify(entry, null, 2), 'utf-8');
}

// Get all history entries sorted by updatedAt descending
export function getAllHistory(): HistoryEntry[] {
    const historyDir = getHistoryDir();
    const entries: HistoryEntry[] = [];

    try {
        const dirs = fs.readdirSync(historyDir, { withFileTypes: true });
        for (const dirent of dirs) {
            if (dirent.isDirectory() && dirent.name !== THUMBNAIL_DIR_NAME) {
                const entry = readMetadata(path.join(historyDir, dirent.name));
                if (entry) {
                    entries.push(entry);
                }
            }
        }
    } catch (err) {
        console.error('Failed to read history directory:', err);
    }

    // Sort by updatedAt descending
    entries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return entries;
}

// Get total history count
export function getHistoryCount(): number {
    return getAllHistory().length;
}

// Create a new history entry from generation result
export function createHistoryEntry(
    params: GenerationParams,
    modelDisplayName: string,
    imageBuffers: Buffer[],
    mimeType: string
): HistoryEntry {
    const id = uuidv4();
    const now = new Date().toISOString();
    const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';

    // Create directories
    const imagesDir = getImagesDir(id);
    const thumbDir = getThumbnailDir(id);
    fs.mkdirSync(imagesDir, { recursive: true });
    fs.mkdirSync(thumbDir, { recursive: true });

    // Save images and generate thumbnails
    const imagePaths: string[] = [];
    for (let i = 0; i < imageBuffers.length; i++) {
        const fileName = `image_${i + 1}.${ext}`;
        const imagePath = path.join(imagesDir, fileName);
        fs.writeFileSync(imagePath, imageBuffers[i]);
        imagePaths.push(imagePath);

        // Generate simple thumbnail by saving the original
        // (Native image resizing without sharp - we use Electron's nativeImage in thumbnail service)
        const thumbPath = path.join(thumbDir, fileName);
        generateThumbnail(imageBuffers[i], thumbPath);
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
        outputMimeType: params.outputMimeType,
        safetyFilterLevel: params.safetyFilterLevel,
        referenceImagePaths: params.referenceImagePaths,
        generatedImagePaths: imagePaths,
    };

    writeMetadata(id, entry);
    return entry;
}

// Generate a thumbnail using Electron nativeImage
function generateThumbnail(imageBuffer: Buffer, thumbPath: string): void {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { nativeImage } = require('electron');
        const img = nativeImage.createFromBuffer(imageBuffer);
        const size = img.getSize();

        // Calculate resize dimensions maintaining aspect ratio
        let width = THUMBNAIL_SIZE;
        let height = THUMBNAIL_SIZE;
        if (size.width > size.height) {
            height = Math.round((THUMBNAIL_SIZE * size.height) / size.width);
        } else {
            width = Math.round((THUMBNAIL_SIZE * size.width) / size.height);
        }

        const resized = img.resize({ width, height, quality: 'good' });
        const ext = path.extname(thumbPath).toLowerCase();
        if (ext === '.jpg' || ext === '.jpeg') {
            fs.writeFileSync(thumbPath, resized.toJPEG(80));
        } else {
            fs.writeFileSync(thumbPath, resized.toPNG());
        }
    } catch (err) {
        console.error('Failed to generate thumbnail:', err);
        // Fallback: save original as thumbnail
        fs.writeFileSync(thumbPath, imageBuffer);
    }
}

// Get thumbnail data as base64 data URL
export function getThumbnailDataUrl(imagePath: string): string {
    try {
        // Derive thumbnail path from image path
        const dir = path.dirname(imagePath);
        const parentDir = path.dirname(dir);
        const fileName = path.basename(imagePath);
        const thumbPath = path.join(parentDir, THUMBNAIL_DIR_NAME, fileName);

        if (fs.existsSync(thumbPath)) {
            const data = fs.readFileSync(thumbPath);
            const ext = path.extname(thumbPath).toLowerCase();
            const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
            return `data:${mime};base64,${data.toString('base64')}`;
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
            const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
            return `data:${mime};base64,${data.toString('base64')}`;
        }
    } catch (err) {
        console.error('Failed to read image:', err);
    }
    return '';
}

// Delete a single history entry
export function deleteHistoryEntry(id: string): void {
    const entryDir = getEntryDir(id);
    if (fs.existsSync(entryDir)) {
        fs.rmSync(entryDir, { recursive: true, force: true });
    }
}

// Delete all history entries
export function deleteAllHistory(): void {
    const historyDir = getHistoryDir();
    try {
        const dirs = fs.readdirSync(historyDir, { withFileTypes: true });
        for (const dirent of dirs) {
            if (dirent.isDirectory()) {
                fs.rmSync(path.join(historyDir, dirent.name), { recursive: true, force: true });
            }
        }
    } catch (err) {
        console.error('Failed to delete all history:', err);
        throw err;
    }
}

// Export all history to a ZIP file
export function exportAllHistory(
    outputPath: string,
    onProgress?: (percent: number) => void
): Promise<void> {
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
    const settings = loadSettings();
    const oldDir = settings.historyDir;

    if (oldDir === newDir) return;

    // Ensure new directory exists
    if (!fs.existsSync(newDir)) {
        fs.mkdirSync(newDir, { recursive: true });
    }

    // Move contents
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

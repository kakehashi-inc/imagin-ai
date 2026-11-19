import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import archiver from 'archiver';
import type { ApiProvider, GenerationParams, HistoryEntry, MediaType } from '../../shared/types';
import {
    HISTORY_IMAGES_DIR,
    MODEL_DEFINITIONS,
    THUMBNAIL_DIR_NAME,
    THUMBNAIL_SIZE,
    resolveApiModelId,
} from '../../shared/constants';
import { ensureHistoryDir, loadSettings } from './settings-service';
import { extractImageThumbnail, extractVideoThumbnail } from './ffmpeg-service';

// =============================================================================
// Directory helpers
// =============================================================================

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

// =============================================================================
// Migration helpers (legacy flat schema -> new per-provider sub-object schema)
// =============================================================================

// Derive mediaType from a model id when an older record is missing the field.
function inferMediaTypeFromModelId(modelId: string): MediaType {
    if (modelId.startsWith('veo-')) return 'video';
    if (modelId.startsWith('lyria-')) return 'music';
    if (modelId.includes('-tts')) return 'voice';
    return 'image';
}

// Derive provider from a model id when an older record is missing the field.
// Legacy data is always Gemini; the prefix-based check is a defense in depth.
function inferProviderFromModelId(modelId: string): ApiProvider {
    if (modelId.startsWith('gpt-image-')) return 'openai';
    return 'gemini';
}

// Migrate one history entry from the legacy flat schema into the new per-provider
// sub-object schema. Returns { entry, migrated } so the caller can decide
// whether to rewrite the JSON file on disk.
function migrateHistoryEntry(raw: unknown): { entry: HistoryEntry; migrated: boolean } {
    const r = (raw ?? {}) as Record<string, unknown>;
    const hasNewShape = typeof r.provider === 'string' && (r.gemini !== undefined || r.openai !== undefined);
    if (hasNewShape) {
        return { entry: r as unknown as HistoryEntry, migrated: false };
    }

    const model = typeof r.model === 'string' ? r.model : '';
    const provider = inferProviderFromModelId(model);
    const mediaType = (typeof r.mediaType === 'string' ? r.mediaType : inferMediaTypeFromModelId(model)) as MediaType;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const legacyGemini: any = {
        negativePrompt: typeof r.negativePrompt === 'string' ? r.negativePrompt : '',
        aspectRatio: r.aspectRatio,
        quality: r.quality,
    };
    if (r.videoDuration !== undefined) legacyGemini.videoDuration = r.videoDuration;
    if (r.videoResolution !== undefined) legacyGemini.videoResolution = r.videoResolution;
    if (r.seed !== undefined) legacyGemini.seed = r.seed;
    if (Array.isArray(r.audioTexts)) legacyGemini.audioTexts = r.audioTexts;
    if (typeof r.styleInstruction === 'string') legacyGemini.styleInstruction = r.styleInstruction;
    if (typeof r.voice === 'string') legacyGemini.voice = r.voice;

    const entry: HistoryEntry = {
        id: typeof r.id === 'string' ? r.id : uuidv4(),
        createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
        updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : new Date().toISOString(),
        provider,
        model,
        modelDisplayName: typeof r.modelDisplayName === 'string' ? r.modelDisplayName : model,
        mediaType,
        prompt: typeof r.prompt === 'string' ? r.prompt : '',
        numberOfImages: typeof r.numberOfImages === 'number' ? r.numberOfImages : 1,
        referenceImagePaths: Array.isArray(r.referenceImagePaths) ? (r.referenceImagePaths as string[]) : [],
        generatedImagePaths: Array.isArray(r.generatedImagePaths) ? (r.generatedImagePaths as string[]) : [],
        imageWidth: typeof r.imageWidth === 'number' ? r.imageWidth : undefined,
        imageHeight: typeof r.imageHeight === 'number' ? r.imageHeight : undefined,
        fileSize: typeof r.fileSize === 'number' ? r.fileSize : undefined,
        elapsedMs: typeof r.elapsedMs === 'number' ? r.elapsedMs : undefined,
        editMode: false,
    };
    if (provider === 'gemini') {
        entry.gemini = legacyGemini;
    }
    return { entry, migrated: true };
}

// =============================================================================
// Metadata read / write
// =============================================================================

function readMetadata(jsonPath: string): HistoryEntry | null {
    try {
        if (!fs.existsSync(jsonPath)) return null;
        const raw = fs.readFileSync(jsonPath, 'utf-8');
        const parsed = JSON.parse(raw);
        const { entry, migrated } = migrateHistoryEntry(parsed);
        if (migrated) {
            // Persist the upgraded shape so we only pay the migration cost once.
            try {
                fs.writeFileSync(jsonPath, JSON.stringify(entry, null, 2), 'utf-8');
            } catch (writeErr) {
                console.warn(`Failed to persist migrated history entry ${jsonPath}:`, writeErr);
            }
        }
        return entry;
    } catch (err) {
        console.error(`Failed to read metadata from ${jsonPath}:`, err);
        return null;
    }
}

function writeMetadata(id: string, entry: HistoryEntry): void {
    ensureDirs();
    const metaPath = path.join(getImagesDir(), `${id}.json`);
    fs.writeFileSync(metaPath, JSON.stringify(entry, null, 2), 'utf-8');
}

// =============================================================================
// Cache and queries
// =============================================================================

let cachedEntries: HistoryEntry[] | null = null;

function invalidateCache(): void {
    cachedEntries = null;
}

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

export function getAllHistory(): HistoryEntry[] {
    return loadAllEntries();
}

export function getHistoryPage(offset: number, limit: number): { entries: HistoryEntry[]; total: number } {
    const all = loadAllEntries();
    return { entries: all.slice(offset, offset + limit), total: all.length };
}

export function getHistoryCount(): number {
    return loadAllEntries().length;
}

// =============================================================================
// Entry creation (image / video / audio)
// =============================================================================

function buildBaseFields(
    params: GenerationParams,
    modelDisplayName: string
): Pick<
    HistoryEntry,
    | 'provider'
    | 'model'
    | 'apiModelId'
    | 'modelDisplayName'
    | 'prompt'
    | 'numberOfImages'
    | 'referenceImagePaths'
    | 'editMode'
> {
    return {
        provider: params.provider,
        model: params.model,
        apiModelId: resolveApiModelId(params.model),
        modelDisplayName,
        prompt: params.prompt,
        numberOfImages: params.numberOfImages,
        referenceImagePaths: params.referenceImagePaths,
        editMode: params.editMode,
    };
}

// Pull provider-specific sub-object from generation params straight into the
// history entry. Keeps history rehydration straightforward: same shape both ways.
function pickProviderSubObject(params: GenerationParams): Pick<HistoryEntry, 'gemini' | 'openai'> {
    if (params.provider === 'gemini' && params.gemini) {
        const g = params.gemini;
        return {
            gemini: {
                negativePrompt: g.negativePrompt,
                aspectRatio: g.aspectRatio,
                quality: g.quality,
                videoDuration: g.duration,
                videoResolution: g.resolution,
                // `seed` is intentionally omitted: the renderer never collects
                // one, and no response exposes one either. If a response
                // surfaces a seed, it can be merged in at the call site.
                styleInstruction: g.styleInstruction,
                voice: g.voice,
            },
        };
    }
    if (params.provider === 'openai' && params.openai) {
        return { openai: { ...params.openai } };
    }
    return {};
}

// Merge per-buffer response metadata into the gemini/openai sub-object that
// pickProviderSubObject just built. The dispatcher hands us a tagged shape
// (`{ gemini }` or `{ openai }`) per buffer; we spread it onto the matching
// branch so the rest of the entry stays intact.
function mergePerItemMeta(
    sub: Pick<HistoryEntry, 'gemini' | 'openai'>,
    itemMeta?: {
        gemini?: Partial<NonNullable<HistoryEntry['gemini']>>;
        openai?: Partial<NonNullable<HistoryEntry['openai']>>;
    }
): Pick<HistoryEntry, 'gemini' | 'openai'> {
    if (!itemMeta) return sub;
    const out: Pick<HistoryEntry, 'gemini' | 'openai'> = { ...sub };
    if (itemMeta.gemini && out.gemini) {
        out.gemini = { ...out.gemini, ...itemMeta.gemini };
    }
    if (itemMeta.openai && out.openai) {
        out.openai = { ...out.openai, ...itemMeta.openai };
    }
    return out;
}

function extToMime(ext: string): string {
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'webp') return 'image/webp';
    return 'image/png';
}

function imageExtensionFromMime(mimeType: string): string {
    const m = mimeType.toLowerCase();
    if (m.includes('jpeg')) return 'jpg';
    if (m.includes('webp')) return 'webp';
    return 'png';
}

// Tagged per-buffer response metadata. Either `gemini` or `openai` is set
// depending on the active provider. Defined here (rather than imported from
// generation-service) so this module stays free of cross-imports between
// services.
export type HistoryItemMeta = {
    gemini?: Partial<NonNullable<HistoryEntry['gemini']>>;
    openai?: Partial<NonNullable<HistoryEntry['openai']>>;
};

// Create one history entry per generated image. Filename extension is derived
// from the response mimeType so JPEG/WebP outputs aren't mis-labeled as PNG.
// `perItemMeta[i]` is merged onto entry[i] so response-side fields (usage,
// interaction id, etc.) survive to the JSON file.
export function createHistoryEntries(
    params: GenerationParams,
    modelDisplayName: string,
    imageBuffers: Buffer[],
    mimeType: string,
    elapsedMs?: number,
    perItemMeta?: HistoryItemMeta[]
): HistoryEntry[] {
    invalidateCache();
    const now = new Date().toISOString();
    const entries: HistoryEntry[] = [];

    ensureDirs();
    const ext = imageExtensionFromMime(mimeType);

    for (let i = 0; i < imageBuffers.length; i++) {
        const id = uuidv4();
        const imagePath = path.join(getImagesDir(), `${id}.${ext}`);
        fs.writeFileSync(imagePath, imageBuffers[i]);

        const thumbPath = path.join(getThumbDir(), `${id}.jpg`);
        generateThumbnail(imageBuffers[i], imagePath, thumbPath);

        const dimensions = readImageDimensions(imageBuffers[i]);
        const imageWidth = dimensions?.width ?? 0;
        const imageHeight = dimensions?.height ?? 0;

        const sub = mergePerItemMeta(pickProviderSubObject(params), perItemMeta?.[i]);

        const entry: HistoryEntry = {
            id,
            createdAt: now,
            updatedAt: now,
            ...buildBaseFields(params, modelDisplayName),
            mediaType: 'image',
            generatedImagePaths: [imagePath],
            imageWidth,
            imageHeight,
            fileSize: imageBuffers[i].length,
            elapsedMs,
            ...sub,
        };

        writeMetadata(id, entry);
        entries.push(entry);
    }
    return entries;
}

export function createVideoHistoryEntry(
    params: GenerationParams,
    modelDisplayName: string,
    video: Buffer,
    elapsedMs?: number,
    itemMeta?: HistoryItemMeta
): HistoryEntry {
    invalidateCache();
    const now = new Date().toISOString();
    const id = uuidv4();

    ensureDirs();

    const videoPath = path.join(getImagesDir(), `${id}.mp4`);
    fs.writeFileSync(videoPath, video);
    const fileSize = video.length;

    const thumbPath = path.join(getThumbDir(), `${id}.jpg`);
    extractVideoThumbnail(videoPath, thumbPath, THUMBNAIL_SIZE);

    const sub = mergePerItemMeta(pickProviderSubObject(params), itemMeta);

    const entry: HistoryEntry = {
        id,
        createdAt: now,
        updatedAt: now,
        ...buildBaseFields(params, modelDisplayName),
        numberOfImages: 1,
        mediaType: 'video',
        generatedImagePaths: [videoPath],
        fileSize,
        elapsedMs,
        ...sub,
    };

    writeMetadata(id, entry);
    return entry;
}

function audioExtensionFromMime(mimeType: string): string {
    const m = mimeType.toLowerCase();
    if (m.includes('wav') || m.includes('wave') || m.includes('x-wav')) return 'wav';
    if (m.includes('mpeg') || m.includes('mp3')) return 'mp3';
    if (m.includes('ogg')) return 'ogg';
    if (m.includes('flac')) return 'flac';
    if (m.includes('webm')) return 'webm';
    if (m.includes('aac') || m.includes('mp4')) return 'm4a';
    return 'mp3';
}

export function createAudioHistoryEntry(
    params: GenerationParams,
    modelDisplayName: string,
    audioBuffer: Buffer,
    mimeType: string,
    audioTexts?: string[],
    elapsedMs?: number,
    itemMeta?: HistoryItemMeta
): HistoryEntry {
    invalidateCache();
    const now = new Date().toISOString();
    const id = uuidv4();

    ensureDirs();

    const ext = audioExtensionFromMime(mimeType);
    const audioPath = path.join(getImagesDir(), `${id}.${ext}`);
    fs.writeFileSync(audioPath, audioBuffer);

    const inferredMediaType = MODEL_DEFINITIONS.find(m => m.id === params.model)?.mediaType;
    const mediaType: MediaType = inferredMediaType === 'voice' ? 'voice' : 'music';

    const sub = mergePerItemMeta(pickProviderSubObject(params), itemMeta);

    const baseEntry: HistoryEntry = {
        id,
        createdAt: now,
        updatedAt: now,
        ...buildBaseFields(params, modelDisplayName),
        numberOfImages: 1,
        mediaType,
        generatedImagePaths: [audioPath],
        fileSize: audioBuffer.length,
        elapsedMs,
        ...sub,
    };

    // audioTexts only applies to the gemini sub-object; merge it in.
    if (audioTexts && audioTexts.length > 0 && baseEntry.gemini) {
        baseEntry.gemini = { ...baseEntry.gemini, audioTexts };
    }

    writeMetadata(id, baseEntry);
    return baseEntry;
}

// =============================================================================
// Thumbnails and viewers
// =============================================================================

// Width/height of a WebP image from its RIFF header: the lossy ('VP8 '),
// lossless ('VP8L') and extended ('VP8X') bitstreams store them differently.
function readWebpDimensions(data: Buffer): { width: number; height: number } | null {
    if (data.length < 30 || data.toString('ascii', 0, 4) !== 'RIFF' || data.toString('ascii', 8, 12) !== 'WEBP') {
        return null;
    }
    const chunk = data.toString('ascii', 12, 16);
    if (chunk === 'VP8 ') {
        return { width: data.readUInt16LE(26) & 0x3fff, height: data.readUInt16LE(28) & 0x3fff };
    }
    if (chunk === 'VP8L') {
        const bits = data.readUInt32LE(21);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === 'VP8X') {
        return { width: data.readUIntLE(24, 3) + 1, height: data.readUIntLE(27, 3) + 1 };
    }
    return null;
}

// Pixel dimensions of a generated image. Electron's nativeImage decodes PNG and
// JPEG; WebP, which it cannot decode, is read from its file header. Returns
// null when the size cannot be determined.
export function readImageDimensions(data: Buffer): { width: number; height: number } | null {
    const webp = readWebpDimensions(data);
    if (webp) return webp;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy require so electron is only loaded when actually running in the main process
        const { nativeImage } = require('electron');
        const size = nativeImage.createFromBuffer(data).getSize();
        return size.width > 0 && size.height > 0 ? size : null;
    } catch {
        return null;
    }
}

// Whether a PNG can contain transparency: an alpha channel in the IHDR color
// type (4 = gray + alpha, 6 = RGBA) or a tRNS chunk ahead of the image data.
function pngHasAlpha(data: Buffer): boolean {
    const PNG_SIGNATURE = '89504e470d0a1a0a';
    if (data.length < 33 || data.toString('hex', 0, 8) !== PNG_SIGNATURE) return false;
    const colorType = data[25];
    if (colorType === 4 || colorType === 6) return true;
    // Walk the chunks (length, type, data, CRC) until the image data starts.
    let offset = 8;
    while (offset + 8 <= data.length) {
        const length = data.readUInt32BE(offset);
        const type = data.toString('ascii', offset + 4, offset + 8);
        if (type === 'tRNS') return true;
        if (type === 'IDAT' || type === 'IEND') return false;
        offset += 12 + length;
    }
    return false;
}

// Writes a JPEG thumbnail (long edge THUMBNAIL_SIZE) for a generated image.
// Images that may be transparent (WebP, PNG with alpha) are converted with
// ffmpeg, which lays them over a checkerboard because JPEG cannot keep the
// transparency; ffmpeg also decodes WebP, which nativeImage cannot (it returns
// an empty image rather than throwing). Opaque PNG and JPEG go through
// nativeImage, which is also the fallback for a transparent PNG when ffmpeg is
// unavailable.
function generateThumbnail(imageBuffer: Buffer, imagePath: string, thumbPath: string): void {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy require so electron is only loaded when actually running in the main process
        const { nativeImage } = require('electron');
        const img = nativeImage.createFromBuffer(imageBuffer);
        if (img.isEmpty() || pngHasAlpha(imageBuffer)) {
            const converted = extractImageThumbnail(imagePath, thumbPath, THUMBNAIL_SIZE);
            if (converted || img.isEmpty()) return;
        }
        const size = img.getSize();

        const longSide = Math.max(size.width, size.height);
        const scale = longSide > THUMBNAIL_SIZE ? THUMBNAIL_SIZE / longSide : 1;
        const width = Math.round(size.width * scale);
        const height = Math.round(size.height * scale);

        const resized = img.resize({ width, height, quality: 'good' });
        fs.writeFileSync(thumbPath, resized.toJPEG(60));
    } catch (err) {
        console.error('Failed to generate thumbnail:', err);
        fs.writeFileSync(thumbPath, imageBuffer);
    }
}

export function getThumbnailDataUrl(imagePath: string): string {
    try {
        const baseName = path.basename(imagePath, path.extname(imagePath));
        const thumbPath = path.join(getThumbDir(), `${baseName}.jpg`);

        // An empty thumbnail file (left by a failed conversion) is treated as
        // missing, so the image itself is shown instead.
        if (fs.existsSync(thumbPath) && fs.statSync(thumbPath).size > 0) {
            const data = fs.readFileSync(thumbPath);
            return `data:image/jpeg;base64,${data.toString('base64')}`;
        }
        return getImageDataUrl(imagePath);
    } catch (err) {
        console.error('Failed to read thumbnail:', err);
        return '';
    }
}

export function getImageDataUrl(imagePath: string): string {
    try {
        if (!fs.existsSync(imagePath)) return '';
        const data = fs.readFileSync(imagePath);
        const ext = path.extname(imagePath).toLowerCase().replace('.', '');
        const mime = ext === 'mp4' ? 'video/mp4' : extToMime(ext);
        return `data:${mime};base64,${data.toString('base64')}`;
    } catch (err) {
        console.error('Failed to read image:', err);
        return '';
    }
}

export function getVideoFileUrl(videoPath: string): string {
    if (fs.existsSync(videoPath)) {
        return `file://${videoPath}`;
    }
    return '';
}

// =============================================================================
// Mutations (delete / bulk delete / move / export)
// =============================================================================

export function deleteHistoryEntry(id: string): void {
    invalidateCache();
    const imagesDir = getImagesDir();
    const thumbPath = path.join(getThumbDir(), `${id}.jpg`);

    // The generated file extension varies per provider/media type, so glob the
    // directory for any file whose basename matches the id and remove all of them.
    try {
        if (fs.existsSync(imagesDir)) {
            const files = fs.readdirSync(imagesDir);
            for (const f of files) {
                if (path.basename(f, path.extname(f)) === id) {
                    try {
                        fs.unlinkSync(path.join(imagesDir, f));
                    } catch (err) {
                        console.error(`Failed to delete ${f}:`, err);
                    }
                }
            }
        }
        if (fs.existsSync(thumbPath)) {
            try {
                fs.unlinkSync(thumbPath);
            } catch (err) {
                console.error(`Failed to delete thumbnail ${thumbPath}:`, err);
            }
        }
    } catch (err) {
        console.error('Failed to enumerate images dir during delete:', err);
    }
}

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

export function exportAllHistory(outputPath: string, onProgress?: (percent: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        const historyDir = getHistoryDir();
        if (!fs.existsSync(historyDir)) {
            return reject(new Error(`History directory does not exist: ${historyDir}`));
        }

        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', { zlib: { level: 6 } });

        // Guard against double-settle: terminal events can fire on both the
        // write stream and the archive in quick succession.
        let settled = false;
        const finish = (err?: Error) => {
            if (settled) return;
            settled = true;
            if (err) reject(err);
            else resolve();
        };

        // Surface write-stream failures (invalid path, permission denied, disk
        // full) instead of letting the Promise hang as a stuck "0%" dialog.
        output.on('close', () => finish());
        output.on('error', (err: Error) => finish(err));
        archive.on('error', (err: Error) => finish(err));
        archive.on('warning', (err: archiver.ArchiverError) => {
            // ENOENT is non-fatal per archiver docs; everything else aborts.
            if (err.code !== 'ENOENT') finish(err);
        });

        if (onProgress) {
            archive.on('progress', (progress: { entries: { total: number; processed: number } }) => {
                const total = progress.entries.total;
                const processed = progress.entries.processed;
                const percent = total > 0 ? Math.round((processed / total) * 100) : 0;
                onProgress(percent);
            });
        }

        // Synchronous archiver setup can throw — route it through finish()
        // rather than letting it crash the main process.
        try {
            archive.pipe(output);
            archive.directory(historyDir, false);
            archive.finalize();
        } catch (err) {
            finish(err as Error);
        }
    });
}

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

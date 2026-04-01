import os from 'os';
import path from 'path';
import type { ModelDefinition, AspectRatio, Quality, VideoDuration, VideoResolution } from './types';

// Application directory name
export const APP_DIR_NAME = '.imaginai';

// Get home directory
export function getHomeDir(): string {
    return os.homedir();
}

// Get application root directory
export function getAppRootDir(): string {
    return path.join(getHomeDir(), APP_DIR_NAME);
}

// --- History limits ---
export const HISTORY_MAX_COUNT = 10000;

// Number of history entries to load per page (infinite scroll)
export const HISTORY_PAGE_SIZE = 50;

// --- Generation count range ---
export const GENERATION_COUNT_MIN = 1;
export const GENERATION_COUNT_MAX = 4;

// --- Default values ---
export const DEFAULT_ASPECT_RATIO: AspectRatio = '16:9';
export const DEFAULT_QUALITY: Quality = '1k';
export const DEFAULT_NUMBER_OF_IMAGES = 1;
export const DEFAULT_DURATION: VideoDuration = 4;
export const DEFAULT_RESOLUTION: VideoResolution = '720p';

// --- Cost reference date ---
export const COST_REFERENCE_DATE = '2026.4.2';

// --- Duration options ---
export const DURATION_OPTIONS: { value: VideoDuration; labelKey: string }[] = [
    { value: 4, labelKey: 'duration.4s' },
    { value: 6, labelKey: 'duration.6s' },
    { value: 8, labelKey: 'duration.8s' },
];

// --- Resolution options ---
export const RESOLUTION_OPTIONS: { value: VideoResolution; labelKey: string }[] = [
    { value: '720p', labelKey: 'resolution.720p' },
    { value: '1080p', labelKey: 'resolution.1080p' },
    { value: '4k', labelKey: 'resolution.4k' },
];

// --- Aspect ratio option groups (square, landscape, portrait) ---
export type AspectRatioGroup = 'square' | 'landscape' | 'portrait';

export const ASPECT_RATIO_OPTIONS: { value: AspectRatio; labelKey: string; group: AspectRatioGroup }[] = [
    // Square
    { value: '1:1', labelKey: 'aspectRatio.1:1', group: 'square' },
    // Landscape (wide)
    { value: '4:3', labelKey: 'aspectRatio.4:3', group: 'landscape' },
    { value: '3:2', labelKey: 'aspectRatio.3:2', group: 'landscape' },
    { value: '5:4', labelKey: 'aspectRatio.5:4', group: 'landscape' },
    { value: '16:9', labelKey: 'aspectRatio.16:9', group: 'landscape' },
    { value: '21:9', labelKey: 'aspectRatio.21:9', group: 'landscape' },
    { value: '4:1', labelKey: 'aspectRatio.4:1', group: 'landscape' },
    { value: '8:1', labelKey: 'aspectRatio.8:1', group: 'landscape' },
    // Portrait (tall)
    { value: '3:4', labelKey: 'aspectRatio.3:4', group: 'portrait' },
    { value: '2:3', labelKey: 'aspectRatio.2:3', group: 'portrait' },
    { value: '4:5', labelKey: 'aspectRatio.4:5', group: 'portrait' },
    { value: '9:16', labelKey: 'aspectRatio.9:16', group: 'portrait' },
    { value: '1:4', labelKey: 'aspectRatio.1:4', group: 'portrait' },
    { value: '1:8', labelKey: 'aspectRatio.1:8', group: 'portrait' },
];

export const ASPECT_RATIO_GROUP_ORDER: AspectRatioGroup[] = ['square', 'landscape', 'portrait'];

// --- Quality options ---
export const QUALITY_OPTIONS: { value: Quality; labelKey: string }[] = [
    { value: '512px', labelKey: 'quality.512px' },
    { value: '1k', labelKey: 'quality.1k' },
    { value: '2k', labelKey: 'quality.2k' },
    { value: '4k', labelKey: 'quality.4k' },
];

// --- Model definitions ---
// Sorted by cost: cheaper/faster first within each family.
// Nano Banana family first (Gemini-based, lower cost), then Imagen family.
export const DEFAULT_MODEL_ID = 'gemini-3.1-flash-image-preview';

export const MODEL_DEFINITIONS: ModelDefinition[] = [
    // Nano Banana family (flash -> flash 2 -> pro)
    // generateContent API: 1 image/req, negative prompt embedded in text prompt
    {
        id: 'gemini-2.5-flash-image',
        displayName: 'Nano Banana (gemini-2.5-flash-image)',
        provider: 'gemini',
        mediaType: 'image',
        apiEndpoint: 'generateContent',
        supportedAspectRatios: [
            '1:1',
            '4:3',
            '3:2',
            '5:4',
            '16:9',
            '21:9',
            '4:1',
            '8:1',
            '3:4',
            '2:3',
            '4:5',
            '9:16',
            '1:4',
            '1:8',
        ],
        supportedQualities: [],
        supportsImageInput: true,
        supportsNegativePrompt: true,
        apiNegativePrompt: false,
        maxImages: 1,
        costLabel: ['$0.039/image'],
    },
    {
        id: 'gemini-3.1-flash-image-preview',
        displayName: 'Nano Banana 2 (gemini-3.1-flash-image-preview)',
        provider: 'gemini',
        mediaType: 'image',
        apiEndpoint: 'generateContent',
        supportedAspectRatios: [
            '1:1',
            '4:3',
            '3:2',
            '5:4',
            '16:9',
            '21:9',
            '4:1',
            '8:1',
            '3:4',
            '2:3',
            '4:5',
            '9:16',
            '1:4',
            '1:8',
        ],
        supportedQualities: ['512px', '1k', '2k', '4k'],
        supportsImageInput: true,
        supportsNegativePrompt: true,
        apiNegativePrompt: false,
        maxImages: 1,
        costLabel: ['512px: $0.045/image', '1K: $0.067/image', '2K: $0.101/image', '4K: $0.151/image'],
    },
    {
        id: 'gemini-3-pro-image-preview',
        displayName: 'Nano Banana Pro (gemini-3-pro-image-preview)',
        provider: 'gemini',
        mediaType: 'image',
        apiEndpoint: 'generateContent',
        supportedAspectRatios: [
            '1:1',
            '4:3',
            '3:2',
            '5:4',
            '16:9',
            '21:9',
            '4:1',
            '8:1',
            '3:4',
            '2:3',
            '4:5',
            '9:16',
            '1:4',
            '1:8',
        ],
        supportedQualities: ['1k', '2k', '4k'],
        supportsImageInput: true,
        supportsNegativePrompt: true,
        apiNegativePrompt: false,
        maxImages: 1,
        costLabel: ['1K/2K: $0.134/image', '4K: $0.24/image'],
    },
    // Imagen 4 family (fast -> standard -> ultra)
    // predict API: text-to-image only, negative prompt embedded in text prompt
    // All Imagen models will shut down on 2026/6/24. Recommended migration: Nano Banana (gemini-2.5-flash-image)
    {
        id: 'imagen-4.0-fast-generate-001',
        displayName: 'Imagen 4 Fast (imagen-4.0-fast-generate-001)',
        provider: 'gemini',
        mediaType: 'image',
        apiEndpoint: 'predict',
        supportedAspectRatios: ['1:1', '4:3', '16:9', '3:4', '9:16'],
        supportedQualities: [],
        supportsImageInput: false,
        supportsNegativePrompt: true,
        apiNegativePrompt: false,
        maxImages: 4,
        costLabel: ['$0.02/image'],
        noteKey: 'model.note.imagenShutdown',
    },
    {
        id: 'imagen-4.0-generate-001',
        displayName: 'Imagen 4 (imagen-4.0-generate-001)',
        provider: 'gemini',
        mediaType: 'image',
        apiEndpoint: 'predict',
        supportedAspectRatios: ['1:1', '4:3', '16:9', '3:4', '9:16'],
        supportedQualities: ['1k', '2k'],
        supportsImageInput: false,
        supportsNegativePrompt: true,
        apiNegativePrompt: false,
        maxImages: 4,
        costLabel: ['$0.04/image'],
        noteKey: 'model.note.imagenShutdown',
    },
    {
        id: 'imagen-4.0-ultra-generate-001',
        displayName: 'Imagen 4 Ultra (imagen-4.0-ultra-generate-001)',
        provider: 'gemini',
        mediaType: 'image',
        apiEndpoint: 'predict',
        supportedAspectRatios: ['1:1', '4:3', '16:9', '3:4', '9:16'],
        supportedQualities: ['1k', '2k'],
        supportsImageInput: false,
        supportsNegativePrompt: true,
        apiNegativePrompt: false,
        maxImages: 4,
        costLabel: ['$0.06/image'],
        noteKey: 'model.note.imagenShutdown',
    },
    // Veo 3.1 family (lite -> fast -> standard)
    // predictLongRunning API: text-to-video, image-to-video, native audio generation
    {
        id: 'veo-3.1-lite-generate-preview',
        displayName: 'Veo 3.1 Lite (veo-3.1-lite-generate-preview)',
        provider: 'gemini',
        mediaType: 'video',
        apiEndpoint: 'predictLongRunning',
        supportedAspectRatios: ['16:9', '9:16'],
        supportedDurations: [4, 6, 8],
        supportedResolutions: ['720p', '1080p'],
        supportsNegativePrompt: true,
        apiNegativePrompt: false,
        supportsImageInput: true,
        supportsSeed: true,
        costLabel: ['720p: $0.05/sec', '1080p: $0.08/sec'],
    },
    {
        id: 'veo-3.1-fast-generate-preview',
        displayName: 'Veo 3.1 Fast (veo-3.1-fast-generate-preview)',
        provider: 'gemini',
        mediaType: 'video',
        apiEndpoint: 'predictLongRunning',
        supportedAspectRatios: ['16:9', '9:16'],
        supportedDurations: [4, 6, 8],
        supportedResolutions: ['720p', '1080p', '4k'],
        supportsNegativePrompt: true,
        apiNegativePrompt: true,
        supportsImageInput: true,
        supportsSeed: true,
        costLabel: ['720p/1080p: $0.15/sec', '4K: $0.35/sec'],
    },
    {
        id: 'veo-3.1-generate-preview',
        displayName: 'Veo 3.1 (veo-3.1-generate-preview)',
        provider: 'gemini',
        mediaType: 'video',
        apiEndpoint: 'predictLongRunning',
        supportedAspectRatios: ['16:9', '9:16'],
        supportedDurations: [4, 6, 8],
        supportedResolutions: ['720p', '1080p', '4k'],
        supportsNegativePrompt: true,
        apiNegativePrompt: true,
        supportsImageInput: true,
        supportsSeed: true,
        costLabel: ['720p/1080p: $0.40/sec', '4K: $0.60/sec'],
    },
    // Lyria 3 family (clip -> pro)
    // generateContent API: text-to-music, image-to-music, lyrics generation
    // Output: MP3, 48kHz stereo, SynthID watermarked
    {
        id: 'lyria-3-clip-preview',
        displayName: 'Lyria 3 Clip (lyria-3-clip-preview)',
        provider: 'gemini',
        mediaType: 'audio',
        apiEndpoint: 'generateContentAudio',
        supportedAspectRatios: [],
        supportsImageInput: true,
        supportsNegativePrompt: false,
        apiNegativePrompt: false,
        costLabel: ['$0.04/song'],
        noteKey: 'model.note.lyriaClip',
    },
    {
        id: 'lyria-3-pro-preview',
        displayName: 'Lyria 3 Pro (lyria-3-pro-preview)',
        provider: 'gemini',
        mediaType: 'audio',
        apiEndpoint: 'generateContentAudio',
        supportedAspectRatios: [],
        supportsImageInput: true,
        supportsNegativePrompt: false,
        apiNegativePrompt: false,
        costLabel: ['$0.08/song'],
        noteKey: 'model.note.lyriaPro',
    },
];

// --- IPC Channel definitions ---
export const IPC_CHANNELS = {
    // App info & settings
    APP_GET_INFO: 'app:getInfo',
    APP_SET_THEME: 'app:setTheme',
    APP_SET_LANGUAGE: 'app:setLanguage',
    // Window controls
    WINDOW_MINIMIZE: 'window:minimize',
    WINDOW_MAXIMIZE_OR_RESTORE: 'window:maximizeOrRestore',
    WINDOW_CLOSE: 'window:close',
    WINDOW_IS_MAXIMIZED: 'window:isMaximized',
    // Console bridge
    MAIN_CONSOLE: 'main:console',
    // Settings
    SETTINGS_GET: 'settings:get',
    SETTINGS_SAVE: 'settings:save',
    SETTINGS_GET_HISTORY_DIR: 'settings:getHistoryDir',
    SETTINGS_CHANGE_HISTORY_DIR: 'settings:changeHistoryDir',
    // API Key
    API_KEY_GET: 'apiKey:get',
    API_KEY_SAVE: 'apiKey:save',
    API_KEY_TEST: 'apiKey:test',
    // Generation
    GENERATION_EXECUTE: 'generation:execute',
    // History
    HISTORY_GET_ALL: 'history:getAll',
    HISTORY_GET_PAGE: 'history:getPage',
    HISTORY_DELETE: 'history:delete',
    HISTORY_DELETE_ALL: 'history:deleteAll',
    HISTORY_EXPORT_ALL: 'history:exportAll',
    HISTORY_SAVE_IMAGE_AS: 'history:saveImageAs',
    HISTORY_GET_COUNT: 'history:getCount',
    HISTORY_GET_THUMBNAIL: 'history:getThumbnail',
    HISTORY_GET_IMAGE: 'history:getImage',
    // File dialogs
    DIALOG_SELECT_IMAGES: 'dialog:selectImages',
    DIALOG_SELECT_DIRECTORY: 'dialog:selectDirectory',
    // Image viewer window
    IMAGE_VIEWER_OPEN: 'imageViewer:open',
    // Disk space
    DISK_CHECK_SPACE: 'disk:checkSpace',
    // Video viewer window
    VIDEO_VIEWER_OPEN: 'videoViewer:open',
    // Video save
    HISTORY_SAVE_VIDEO_AS: 'history:saveVideoAs',
    // Audio player window
    AUDIO_PLAYER_OPEN: 'audioPlayer:open',
    // Audio save
    HISTORY_SAVE_AUDIO_AS: 'history:saveAudioAs',
    // Events (main -> renderer)
    EXPORT_PROGRESS: 'export:progress',
    GENERATION_PROGRESS: 'generation:progress',
} as const;

// --- Thumbnail settings ---
export const THUMBNAIL_SIZE = 300;
export const THUMBNAIL_DIR_NAME = 'thumbnails';

// --- History directory structure ---
export const HISTORY_IMAGES_DIR = 'images';

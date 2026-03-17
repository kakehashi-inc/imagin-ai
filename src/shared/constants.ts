import os from 'os';
import path from 'path';
import type { ModelDefinition, AspectRatio, Quality } from './types';

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
export const HISTORY_MAX_COUNT = 200;

// --- Generation count range ---
export const GENERATION_COUNT_MIN = 1;
export const GENERATION_COUNT_MAX = 4;

// --- Default values ---
export const DEFAULT_ASPECT_RATIO: AspectRatio = '1:1';
export const DEFAULT_QUALITY: Quality = '1k';
export const DEFAULT_NUMBER_OF_IMAGES = 1;

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
    // generateContent API: no safety filter, 1 image/req
    // Negative prompt is embedded in the text prompt
    {
        id: 'gemini-2.5-flash-image',
        displayName: 'Nano Banana (gemini-2.5-flash-image)',
        provider: 'gemini',
        supportedAspectRatios: ['1:1', '4:3', '3:2', '5:4', '16:9', '21:9', '4:1', '8:1', '3:4', '2:3', '4:5', '9:16', '1:4', '1:8'],
        supportedQualities: [],

        supportsImageInput: true,
        supportsNegativePrompt: true,
        maxImages: 1,
    },
    {
        id: 'gemini-3.1-flash-image-preview',
        displayName: 'Nano Banana 2 (gemini-3.1-flash-image-preview)',
        provider: 'gemini',
        supportedAspectRatios: ['1:1', '4:3', '3:2', '5:4', '16:9', '21:9', '4:1', '8:1', '3:4', '2:3', '4:5', '9:16', '1:4', '1:8'],
        supportedQualities: ['512px', '1k', '2k', '4k'],

        supportsImageInput: true,
        supportsNegativePrompt: true,
        maxImages: 1,
    },
    {
        id: 'gemini-3-pro-image-preview',
        displayName: 'Nano Banana Pro (gemini-3-pro-image-preview)',
        provider: 'gemini',
        supportedAspectRatios: ['1:1', '4:3', '3:2', '5:4', '16:9', '21:9', '4:1', '8:1', '3:4', '2:3', '4:5', '9:16', '1:4', '1:8'],
        supportedQualities: ['1k', '2k', '4k'],

        supportsImageInput: true,
        supportsNegativePrompt: true,
        maxImages: 1,
    },
    // Imagen 4 family (fast -> standard -> ultra)
    // predict API: text-to-image only, negativePrompt deprecated (embedded in prompt text)
    {
        id: 'imagen-4.0-fast-generate-001',
        displayName: 'Imagen 4 Fast (imagen-4.0-fast-generate-001)',
        provider: 'gemini',
        supportedAspectRatios: ['1:1', '4:3', '16:9', '3:4', '9:16'],
        supportedQualities: [],

        supportsImageInput: false,
        supportsNegativePrompt: true,
        maxImages: 4,
    },
    {
        id: 'imagen-4.0-generate-001',
        displayName: 'Imagen 4 (imagen-4.0-generate-001)',
        provider: 'gemini',
        supportedAspectRatios: ['1:1', '4:3', '16:9', '3:4', '9:16'],
        supportedQualities: ['1k', '2k'],

        supportsImageInput: false,
        supportsNegativePrompt: true,
        maxImages: 4,
    },
    {
        id: 'imagen-4.0-ultra-generate-001',
        displayName: 'Imagen 4 Ultra (imagen-4.0-ultra-generate-001)',
        provider: 'gemini',
        supportedAspectRatios: ['1:1', '4:3', '16:9', '3:4', '9:16'],
        supportedQualities: ['1k', '2k'],

        supportsImageInput: false,
        supportsNegativePrompt: true,
        maxImages: 4,
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
    // Events (main -> renderer)
    EXPORT_PROGRESS: 'export:progress',
} as const;

// --- Thumbnail settings ---
export const THUMBNAIL_SIZE = 300;
export const THUMBNAIL_DIR_NAME = 'thumbnails';

// --- History directory structure ---
export const HISTORY_IMAGES_DIR = 'images';

import os from 'os';
import path from 'path';
import type { ModelDefinition, AspectRatio, Quality, OutputMimeType, SafetyFilterLevel } from './types';

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
export const DEFAULT_OUTPUT_MIME_TYPE: OutputMimeType = 'image/png';
export const DEFAULT_SAFETY_FILTER_LEVEL: SafetyFilterLevel = 'block_none';
export const DEFAULT_NUMBER_OF_IMAGES = 1;

// --- Aspect ratio options ---
export const ASPECT_RATIO_OPTIONS: { value: AspectRatio; labelKey: string }[] = [
    { value: '1:1', labelKey: 'aspectRatio.1:1' },
    { value: '9:16', labelKey: 'aspectRatio.9:16' },
    { value: '16:9', labelKey: 'aspectRatio.16:9' },
    { value: '3:4', labelKey: 'aspectRatio.3:4' },
    { value: '4:3', labelKey: 'aspectRatio.4:3' },
    { value: '2:3', labelKey: 'aspectRatio.2:3' },
    { value: '3:2', labelKey: 'aspectRatio.3:2' },
    { value: '4:5', labelKey: 'aspectRatio.4:5' },
    { value: '5:4', labelKey: 'aspectRatio.5:4' },
    { value: '21:9', labelKey: 'aspectRatio.21:9' },
];

// --- Quality options ---
export const QUALITY_OPTIONS: { value: Quality; labelKey: string }[] = [
    { value: '1k', labelKey: 'quality.1k' },
    { value: '2k', labelKey: 'quality.2k' },
    { value: '4k', labelKey: 'quality.4k' },
];

// --- Output format options ---
export const OUTPUT_MIME_TYPE_OPTIONS: { value: OutputMimeType; labelKey: string }[] = [
    { value: 'image/png', labelKey: 'outputFormat.png' },
    { value: 'image/jpeg', labelKey: 'outputFormat.jpeg' },
];

// --- Safety filter options ---
export const SAFETY_FILTER_OPTIONS: { value: SafetyFilterLevel; labelKey: string }[] = [
    { value: 'block_none', labelKey: 'safety.blockNone' },
    { value: 'block_few', labelKey: 'safety.blockFew' },
    { value: 'block_some', labelKey: 'safety.blockSome' },
    { value: 'block_most', labelKey: 'safety.blockMost' },
];

// --- Model definitions ---
// Sorted: Nano Banana family first, then Imagen family. Faster/cheaper first within each group.
export const MODEL_DEFINITIONS: ModelDefinition[] = [
    // Nano Banana family (flash -> flash 2 -> pro)
    {
        id: 'gemini-2.5-flash-image',
        displayName: 'Nano Banana (gemini-2.5-flash-image)',
        provider: 'gemini',
        supportedAspectRatios: ['1:1', '9:16', '16:9', '3:4', '4:3', '2:3', '3:2', '4:5', '5:4', '21:9'],
        supportedQualities: ['1k', '2k', '4k'],
        supportsImageInput: true,
    },
    {
        id: 'gemini-3.1-flash-image-preview',
        displayName: 'Nano Banana 2 (gemini-3.1-flash-image-preview)',
        provider: 'gemini',
        supportedAspectRatios: ['1:1', '9:16', '16:9', '3:4', '4:3', '2:3', '3:2', '4:5', '5:4', '21:9'],
        supportedQualities: ['1k', '2k', '4k'],
        supportsImageInput: true,
    },
    {
        id: 'gemini-3-pro-image-preview',
        displayName: 'Nano Banana Pro (gemini-3-pro-image-preview)',
        provider: 'gemini',
        supportedAspectRatios: ['1:1', '9:16', '16:9', '3:4', '4:3', '2:3', '3:2', '4:5', '5:4', '21:9'],
        supportedQualities: ['1k', '2k', '4k'],
        supportsImageInput: true,
    },
    // Imagen 4 family (fast -> standard -> ultra)
    {
        id: 'imagen-4.0-fast-generate-001',
        displayName: 'Imagen 4 Fast (imagen-4.0-fast-generate-001)',
        provider: 'gemini',
        supportedAspectRatios: ['1:1', '9:16', '16:9', '3:4', '4:3'],
        supportedQualities: ['1k', '2k'],
        supportsImageInput: false,
    },
    {
        id: 'imagen-4.0-generate-001',
        displayName: 'Imagen 4 (imagen-4.0-generate-001)',
        provider: 'gemini',
        supportedAspectRatios: ['1:1', '9:16', '16:9', '3:4', '4:3'],
        supportedQualities: ['1k', '2k'],
        supportsImageInput: false,
    },
    {
        id: 'imagen-4.0-ultra-generate-001',
        displayName: 'Imagen 4 Ultra (imagen-4.0-ultra-generate-001)',
        provider: 'gemini',
        supportedAspectRatios: ['1:1', '9:16', '16:9', '3:4', '4:3'],
        supportedQualities: ['1k', '2k'],
        supportsImageInput: false,
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
export const THUMBNAIL_SIZE = 200;
export const THUMBNAIL_DIR_NAME = 'thumbnails';

// --- History directory structure ---
export const HISTORY_METADATA_FILE = 'metadata.json';
export const HISTORY_IMAGES_DIR = 'images';

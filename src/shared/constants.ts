import os from 'os';
import path from 'path';
import type {
    ApiKeyActiveId,
    ApiKeyOptionKind,
    ApiProvider,
    GeminiAspectRatio,
    GeminiAspectRatioGroup,
    GeminiQuality,
    GeminiVideoDuration,
    GeminiVideoResolution,
    ModelDefinition,
    OpenAIBackground,
    OpenAIImageQuality,
    OpenAIImageSize,
    OpenAIOutputFormat,
} from './types';

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

// --- API key storage ---
// New (v2) schema for ApiKeysData stores keys per provider; this file only
// declares the constants and helpers used to build/parse the active key id.
// All providers share the same custom-slot cap.
export const API_KEY_CUSTOM_MAX = 5;
export const API_KEY_SCHEMA_VERSION = 2 as const;

// Build a provider-scoped key id. The on-disk encoding is always
// `<provider>:<slot>` (e.g. `gemini:default`, `openai:custom:0`), never the
// legacy bare strings — those are upgraded by the api-key-service migration.
export function makeApiKeyId(provider: ApiProvider, slot: 'default' | 'freeTier' | `custom:${number}`): ApiKeyActiveId {
    return `${provider}:${slot}`;
}

// Parse an active key id into its components. Returns null when the string
// doesn't match the `<provider>:<slot>` shape so callers can fall back safely.
export function parseApiKeyId(
    id: ApiKeyActiveId
): { provider: ApiProvider; kind: ApiKeyOptionKind; index?: number } | null {
    if (typeof id !== 'string') return null;
    const firstColon = id.indexOf(':');
    if (firstColon <= 0) return null;
    const provider = id.slice(0, firstColon) as ApiProvider;
    if (provider !== 'gemini' && provider !== 'openai') return null;
    const rest = id.slice(firstColon + 1);
    if (rest === 'default') return { provider, kind: 'default' };
    if (rest === 'freeTier') return { provider, kind: 'freeTier' };
    if (rest.startsWith('custom:')) {
        const idx = Number(rest.slice('custom:'.length));
        if (Number.isInteger(idx) && idx >= 0 && idx < API_KEY_CUSTOM_MAX) {
            return { provider, kind: 'custom', index: idx };
        }
    }
    return null;
}

// --- History limits ---
export const HISTORY_MAX_COUNT = 10000;

// Number of history entries to load per page (infinite scroll)
export const HISTORY_PAGE_SIZE = 50;

// --- Generation count range (shared by both providers) ---
export const GENERATION_COUNT_MIN = 1;
export const GENERATION_COUNT_MAX = 10;

// --- Reference image preprocessing (applied to all generation paths that accept images) ---
// Each reference image is decoded, downscaled so the long edge fits within
// REFERENCE_IMAGE_MAX_LONG_EDGE (preserving aspect ratio), and re-encoded as JPEG.
// PNG/WebP inputs are converted to JPEG. This keeps request payloads bounded
// regardless of source resolution. Per-model attachment count caps are declared
// on each model definition via `maxReferenceImages`.
export const REFERENCE_IMAGE_MAX_LONG_EDGE = 1920;
export const REFERENCE_IMAGE_JPEG_QUALITY = 85;

// --- Default values (shared) ---
export const DEFAULT_NUMBER_OF_IMAGES = 1;

// --- Default values (Gemini) ---
export const DEFAULT_GEMINI_ASPECT_RATIO: GeminiAspectRatio = '16:9';
export const DEFAULT_GEMINI_QUALITY: GeminiQuality = '1k';
export const DEFAULT_GEMINI_VIDEO_DURATION: GeminiVideoDuration = 4;
export const DEFAULT_GEMINI_VIDEO_RESOLUTION: GeminiVideoResolution = '720p';
export const DEFAULT_GEMINI_MODEL_ID = 'gemini-3.1-flash-image-preview';

// --- Default values (OpenAI) ---
// Landscape + Low is the cheapest combination on the default model (gpt-image-2).
export const DEFAULT_OPENAI_SIZE: OpenAIImageSize = '1536x1024';
export const DEFAULT_OPENAI_QUALITY: OpenAIImageQuality = 'low';
export const DEFAULT_OPENAI_OUTPUT_FORMAT: OpenAIOutputFormat = 'jpeg';
export const DEFAULT_OPENAI_BACKGROUND: OpenAIBackground = 'opaque';
export const DEFAULT_OPENAI_MODEL_ID = 'gpt-image-2';

// --- Cost reference date ---
// Source: https://ai.google.dev/gemini-api/docs/pricing,
// https://ai.google.dev/gemini-api/docs/deprecations, and
// https://developers.openai.com/api/docs/guides/image-generation#calculating-costs
// (verified May 2026). Both providers' costLabel values were captured on this date.
export const COST_REFERENCE_DATE = '2026.5.13';

// --- Duration options (Gemini video) ---
export const GEMINI_VIDEO_DURATION_OPTIONS: { value: GeminiVideoDuration; labelKey: string }[] = [
    { value: 4, labelKey: 'gemini.duration.4s' },
    { value: 6, labelKey: 'gemini.duration.6s' },
    { value: 8, labelKey: 'gemini.duration.8s' },
];

// --- Resolution options (Gemini video) ---
export const GEMINI_VIDEO_RESOLUTION_OPTIONS: { value: GeminiVideoResolution; labelKey: string }[] = [
    { value: '720p', labelKey: 'gemini.resolution.720p' },
    { value: '1080p', labelKey: 'gemini.resolution.1080p' },
    { value: '4k', labelKey: 'gemini.resolution.4k' },
];

// --- Aspect ratio option groups (square, landscape, portrait) — Gemini only ---
export const GEMINI_ASPECT_RATIO_OPTIONS: {
    value: GeminiAspectRatio;
    labelKey: string;
    group: GeminiAspectRatioGroup;
}[] = [
    // Square
    { value: '1:1', labelKey: 'gemini.aspectRatio.1:1', group: 'square' },
    // Landscape (wide)
    { value: '4:3', labelKey: 'gemini.aspectRatio.4:3', group: 'landscape' },
    { value: '3:2', labelKey: 'gemini.aspectRatio.3:2', group: 'landscape' },
    { value: '5:4', labelKey: 'gemini.aspectRatio.5:4', group: 'landscape' },
    { value: '16:9', labelKey: 'gemini.aspectRatio.16:9', group: 'landscape' },
    { value: '21:9', labelKey: 'gemini.aspectRatio.21:9', group: 'landscape' },
    { value: '4:1', labelKey: 'gemini.aspectRatio.4:1', group: 'landscape' },
    { value: '8:1', labelKey: 'gemini.aspectRatio.8:1', group: 'landscape' },
    // Portrait (tall)
    { value: '3:4', labelKey: 'gemini.aspectRatio.3:4', group: 'portrait' },
    { value: '2:3', labelKey: 'gemini.aspectRatio.2:3', group: 'portrait' },
    { value: '4:5', labelKey: 'gemini.aspectRatio.4:5', group: 'portrait' },
    { value: '9:16', labelKey: 'gemini.aspectRatio.9:16', group: 'portrait' },
    { value: '1:4', labelKey: 'gemini.aspectRatio.1:4', group: 'portrait' },
    { value: '1:8', labelKey: 'gemini.aspectRatio.1:8', group: 'portrait' },
];

export const GEMINI_ASPECT_RATIO_GROUP_ORDER: GeminiAspectRatioGroup[] = ['square', 'landscape', 'portrait'];

// --- Quality options (Gemini image) ---
export const GEMINI_QUALITY_OPTIONS: { value: GeminiQuality; labelKey: string }[] = [
    { value: '512px', labelKey: 'gemini.quality.512px' },
    { value: '1k', labelKey: 'gemini.quality.1k' },
    { value: '2k', labelKey: 'gemini.quality.2k' },
    { value: '4k', labelKey: 'gemini.quality.4k' },
];

// --- OpenAI option lists (UI only — model definitions reference these, not enumerate per model) ---
// Labels match the OpenAI Playground naming.
export const OPENAI_SIZE_OPTIONS: { value: OpenAIImageSize; labelKey: string }[] = [
    { value: '1024x1024', labelKey: 'openai.size.square' },
    { value: '1024x1536', labelKey: 'openai.size.portrait' },
    { value: '1536x1024', labelKey: 'openai.size.landscape' },
    { value: '2048x2048', labelKey: 'openai.size.square2k' },
    { value: '2048x1152', labelKey: 'openai.size.landscape2k' },
    { value: '3840x2160', labelKey: 'openai.size.landscape4k' },
    { value: '2160x3840', labelKey: 'openai.size.portrait4k' },
];
export const OPENAI_QUALITY_OPTIONS: OpenAIImageQuality[] = ['low', 'medium', 'high'];
export const OPENAI_OUTPUT_FORMAT_OPTIONS: OpenAIOutputFormat[] = ['png', 'jpeg', 'webp'];
export const OPENAI_BACKGROUND_OPTIONS: OpenAIBackground[] = ['opaque', 'transparent'];

// --- Model definitions ---
// Sorted by family and cost within each family. Provider-specific capabilities
// live in the `gemini` or `openai` sub-object on each entry; the top-level
// fields are provider-agnostic.

export const MODEL_DEFINITIONS: ModelDefinition[] = [
    // -------------------------------------------------------------------------
    // Gemini Nano Banana family (flash -> flash 2 -> pro)
    // generateContent API: 1 image/req, negative prompt embedded in text prompt.
    // All three support image edit (reference image + edit-intent prompt).
    // -------------------------------------------------------------------------
    {
        id: 'gemini-2.5-flash-image',
        displayName: 'Nano Banana',
        provider: 'gemini',
        mediaType: 'image',
        supportsReferenceFile: true,
        maxReferenceImages: 10,
        supportsImageEdit: true,
        costLabel: ['$0.039/image'],
        noteKey: 'gemini.model.note.nanoBananaShutdown',
        supportsNegativePrompt: true,
        gemini: {
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
        },
    },
    {
        id: 'gemini-3.1-flash-image-preview',
        displayName: 'Nano Banana 2',
        provider: 'gemini',
        mediaType: 'image',
        supportsReferenceFile: true,
        maxReferenceImages: 10,
        supportsImageEdit: true,
        costLabel: ['512px: $0.045/image', '1K: $0.067/image', '2K: $0.101/image', '4K: $0.151/image'],
        supportsNegativePrompt: true,
        gemini: {
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
        },
    },
    {
        id: 'gemini-3-pro-image-preview',
        displayName: 'Nano Banana Pro',
        provider: 'gemini',
        mediaType: 'image',
        supportsReferenceFile: true,
        maxReferenceImages: 10,
        supportsImageEdit: true,
        costLabel: ['1K/2K: $0.134/image', '4K: $0.24/image'],
        supportsNegativePrompt: true,
        gemini: {
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
        },
    },
    // -------------------------------------------------------------------------
    // Gemini Imagen 4 family (fast -> standard -> ultra)
    // predict API: text-to-image only, negative prompt embedded in text prompt.
    // Imagen does not support image edit.
    // All Imagen 4 models will shut down on 2026/6/24. Recommended migration:
    // Nano Banana 2 (gemini-3.1-flash-image-preview).
    // -------------------------------------------------------------------------
    {
        id: 'imagen-4.0-fast-generate-001',
        displayName: 'Imagen 4 Fast',
        provider: 'gemini',
        mediaType: 'image',
        maxImages: 4,
        costLabel: ['$0.02/image'],
        noteKey: 'gemini.model.note.imagenShutdown',
        supportsNegativePrompt: true,
        gemini: {
            supportedAspectRatios: ['1:1', '4:3', '16:9', '3:4', '9:16'],
            supportedQualities: [],
        },
    },
    {
        id: 'imagen-4.0-generate-001',
        displayName: 'Imagen 4',
        provider: 'gemini',
        mediaType: 'image',
        maxImages: 4,
        costLabel: ['$0.04/image'],
        noteKey: 'gemini.model.note.imagenShutdown',
        supportsNegativePrompt: true,
        gemini: {
            supportedAspectRatios: ['1:1', '4:3', '16:9', '3:4', '9:16'],
            supportedQualities: ['1k', '2k'],
        },
    },
    {
        id: 'imagen-4.0-ultra-generate-001',
        displayName: 'Imagen 4 Ultra',
        provider: 'gemini',
        mediaType: 'image',
        maxImages: 4,
        costLabel: ['$0.06/image'],
        noteKey: 'gemini.model.note.imagenShutdown',
        supportsNegativePrompt: true,
        gemini: {
            supportedAspectRatios: ['1:1', '4:3', '16:9', '3:4', '9:16'],
            supportedQualities: ['1k', '2k'],
        },
    },
    // -------------------------------------------------------------------------
    // Gemini Veo 3.1 family (lite -> fast -> standard)
    // predictLongRunning API: text-to-video, image-to-video, native audio.
    // -------------------------------------------------------------------------
    {
        id: 'veo-3.1-lite-generate-preview',
        displayName: 'Veo 3.1 Lite',
        provider: 'gemini',
        mediaType: 'video',
        supportsReferenceFile: true,
        maxReferenceImages: 1,
        costLabel: ['720p: $0.05/sec', '1080p: $0.08/sec'],
        supportsNegativePrompt: true,
        gemini: {
            supportedAspectRatios: ['16:9', '9:16'],
            supportedDurations: [4, 6, 8],
            supportedResolutions: ['720p', '1080p'],
        },
    },
    {
        id: 'veo-3.1-fast-generate-preview',
        displayName: 'Veo 3.1 Fast',
        provider: 'gemini',
        mediaType: 'video',
        supportsReferenceFile: true,
        maxReferenceImages: 1,
        costLabel: ['720p: $0.10/sec', '1080p: $0.12/sec', '4K: $0.30/sec'],
        supportsNegativePrompt: true,
        apiNegativePrompt: true,
        gemini: {
            supportedAspectRatios: ['16:9', '9:16'],
            supportedDurations: [4, 6, 8],
            supportedResolutions: ['720p', '1080p', '4k'],
        },
    },
    {
        id: 'veo-3.1-generate-preview',
        displayName: 'Veo 3.1',
        provider: 'gemini',
        mediaType: 'video',
        supportsReferenceFile: true,
        maxReferenceImages: 1,
        costLabel: ['720p/1080p: $0.40/sec', '4K: $0.60/sec'],
        supportsNegativePrompt: true,
        apiNegativePrompt: true,
        gemini: {
            supportedAspectRatios: ['16:9', '9:16'],
            supportedDurations: [4, 6, 8],
            supportedResolutions: ['720p', '1080p', '4k'],
        },
    },
    // -------------------------------------------------------------------------
    // Gemini Lyria 3 family (clip -> pro)
    // generateContent API: text-to-music, image-to-music, lyrics generation.
    // Output: MP3, 48kHz stereo, SynthID watermarked.
    // -------------------------------------------------------------------------
    {
        id: 'lyria-3-clip-preview',
        displayName: 'Lyria 3 Clip',
        provider: 'gemini',
        mediaType: 'music',
        supportsReferenceFile: true,
        maxReferenceImages: 5,
        costLabel: ['$0.04/song'],
        noteKey: 'gemini.model.note.lyriaClip',
    },
    {
        id: 'lyria-3-pro-preview',
        displayName: 'Lyria 3 Pro',
        provider: 'gemini',
        mediaType: 'music',
        supportsReferenceFile: true,
        maxReferenceImages: 5,
        costLabel: ['$0.08/song'],
        noteKey: 'gemini.model.note.lyriaPro',
    },
    // -------------------------------------------------------------------------
    // Gemini TTS family (text-to-speech)
    // generateContent API with speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName
    // Output: MP3 audio. Per-request max text length: 4000 bytes.
    // Sorted by cost: 2.5 Flash (cheapest) -> 2.5 Pro -> 3.1 Flash (latest, Audio Tags).
    // -------------------------------------------------------------------------
    {
        id: 'gemini-2.5-flash-preview-tts',
        displayName: 'Gemini 2.5 Flash TTS',
        provider: 'gemini',
        mediaType: 'voice',
        costLabel: ['Input: $0.50 / 1M tok', 'Output: $10.00 / 1M tok'],
        freeTierAvailable: true,
        freeTierNoteKey: 'gemini.model.freeTier.ttsFlash',
    },
    {
        id: 'gemini-2.5-pro-preview-tts',
        displayName: 'Gemini 2.5 Pro TTS',
        provider: 'gemini',
        mediaType: 'voice',
        costLabel: ['Input: $1.00 / 1M tok', 'Output: $20.00 / 1M tok'],
    },
    {
        id: 'gemini-3.1-flash-tts-preview',
        displayName: 'Gemini 3.1 Flash TTS',
        provider: 'gemini',
        mediaType: 'voice',
        costLabel: ['Input: $1.00 / 1M tok', 'Output: $20.00 / 1M tok'],
        freeTierAvailable: true,
        freeTierNoteKey: 'gemini.model.freeTier.ttsFlash',
        gemini: {
            supportsAudioTags: true,
        },
    },
    // -------------------------------------------------------------------------
    // OpenAI GPT Image family (1 -> 1.5 -> 2)
    // /v1/images/generations + /v1/images/edits.
    // gpt-image-2 supports 2K/4K but does NOT support
    // background: 'transparent'.
    // -------------------------------------------------------------------------
    {
        id: 'gpt-image-1',
        displayName: 'GPT Image 1',
        provider: 'openai',
        mediaType: 'image',
        maxImages: 10,
        supportsReferenceFile: true,
        maxReferenceImages: 16,
        supportsImageEdit: true,
        // Each size group is two adjacent rows: a `< WIDTHxHEIGHT >` section
        // header followed by the price triplet. Sizes that share a price are
        // grouped on the same header. Rows are listed in ascending Low-tier price.
        costLabel: [
            '< 1024x1024 >',
            '$0.011(Low) / $0.042(Med) / $0.167(High)',
            '< 1024x1536, 1536x1024 >',
            '$0.016(Low) / $0.063(Med) / $0.250(High)',
        ],
        supportsNegativePrompt: true,
        openai: {
            supportedSizes: ['1024x1024', '1024x1536', '1536x1024'],
            supportsBackground: true,
        },
    },
    {
        id: 'gpt-image-1.5',
        displayName: 'GPT Image 1.5',
        provider: 'openai',
        mediaType: 'image',
        maxImages: 10,
        supportsReferenceFile: true,
        maxReferenceImages: 16,
        supportsImageEdit: true,
        costLabel: [
            '< 1024x1024 >',
            '$0.009(Low) / $0.034(Med) / $0.133(High)',
            '< 1024x1536, 1536x1024 >',
            '$0.013(Low) / $0.050(Med) / $0.200(High)',
        ],
        supportsNegativePrompt: true,
        openai: {
            supportedSizes: ['1024x1024', '1024x1536', '1536x1024'],
            supportsBackground: true,
        },
    },
    {
        id: 'gpt-image-2',
        displayName: 'GPT Image 2',
        provider: 'openai',
        mediaType: 'image',
        maxImages: 10,
        supportsReferenceFile: true,
        maxReferenceImages: 16,
        supportsImageEdit: true,
        // 4K landscape and 4K portrait have identical pixel counts so the
        // calculator returns the same price — group them on one row.
        costLabel: [
            '< 1024x1536, 1536x1024 >',
            '$0.005(Low) / $0.041(Med) / $0.165(High)',
            '< 1024x1024 >',
            '$0.006(Low) / $0.053(Med) / $0.211(High)',
            '< 2048x1152 >',
            '約 $0.014(Low) / $0.12(Med) / $0.48(High)',
            '< 2048x2048 >',
            '約 $0.024(Low) / $0.21(Med) / $0.84(High)',
            '< 3840x2160, 2160x3840 >',
            '約 $0.047(Low) / $0.42(Med) / $1.69(High)',
        ],
        supportsNegativePrompt: true,
        openai: {
            supportedSizes: ['1024x1024', '1024x1536', '1536x1024', '2048x2048', '2048x1152', '3840x2160', '2160x3840'],
            // Edit endpoint only documents the three standard sizes; 2K/4K
            // outputs are listed as generate-only in the OpenAI API reference.
            supportedEditSizes: ['1024x1024', '1024x1536', '1536x1024'],
            supportsBackground: false, // gpt-image-2 does not support transparent backgrounds (official)
        },
    },
];

// --- TTS presets ---
// The list of style presets (with localized name/effect + English instruction) and voice
// presets (with localized characteristic) lives in the i18n locale files under
// `gemini.tts.style.presets` and `gemini.tts.voice.presets` as arrays. These constants
// only declare the custom-selection sentinel and default values.
export const GEMINI_TTS_STYLE_CUSTOM_ID = 'custom';
// Defaults chosen to be the most broadly appropriate for Japanese users:
// - Style: calm/professional tone suits business, announcements, and general reading.
// - Voice: Despina (female, smooth and fluent) is a versatile female voice that works
//   for general-purpose Japanese narration across content types.
export const GEMINI_TTS_DEFAULT_STYLE = 'Calm, professional, and authoritative';
export const GEMINI_TTS_DEFAULT_VOICE = 'Despina';

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
    API_KEYS_GET_DATA: 'apiKey:getData',
    API_KEYS_SAVE_DATA: 'apiKey:saveData',
    API_KEYS_SET_ACTIVE: 'apiKey:setActive',
    API_KEYS_GET_ACTIVE_INFO: 'apiKey:getActiveInfo',
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
    // Auto-updater
    UPDATER_CHECK: 'updater:check',
    UPDATER_DOWNLOAD: 'updater:download',
    UPDATER_QUIT_AND_INSTALL: 'updater:quitAndInstall',
    UPDATER_GET_STATE: 'updater:getState',
    UPDATER_STATE_CHANGED: 'updater:stateChanged',
    // Events (main -> renderer)
    EXPORT_PROGRESS: 'export:progress',
    GENERATION_PROGRESS: 'generation:progress',
} as const;

// --- Thumbnail settings ---
export const THUMBNAIL_SIZE = 300;
export const THUMBNAIL_DIR_NAME = 'thumbnails';

// --- History directory structure ---
export const HISTORY_IMAGES_DIR = 'images';

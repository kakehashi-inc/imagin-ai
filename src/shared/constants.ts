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
    GeminiVideoReferenceMode,
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
export const DEFAULT_GEMINI_MODEL_ID = 'gemini-3.1-flash-image';

// --- Default values (OpenAI) ---
// Landscape + Low is the cheapest combination on the default model (gpt-image-2.5-flare).
export const DEFAULT_OPENAI_SIZE: OpenAIImageSize = '1536x1024';
export const DEFAULT_OPENAI_QUALITY: OpenAIImageQuality = 'low';
export const DEFAULT_OPENAI_OUTPUT_FORMAT: OpenAIOutputFormat = 'jpeg';
export const DEFAULT_OPENAI_BACKGROUND: OpenAIBackground = 'opaque';
// GPT Image 2.5 Flare is OpenAI's recommended default for everyday generation.
export const DEFAULT_OPENAI_MODEL_ID = 'gpt-image-2.5-flare';

// --- Cost reference date ---
// Source: https://ai.google.dev/gemini-api/docs/pricing,
// https://ai.google.dev/gemini-api/docs/deprecations, and
// https://developers.openai.com/api/docs/guides/image-generation#calculating-costs
// (re-verified September 2026). Both providers' costLabel values were captured on this date.
export const COST_REFERENCE_DATE = '2026.9.24';

// --- Duration options (Gemini video) ---
export const GEMINI_VIDEO_DURATION_OPTIONS: { value: GeminiVideoDuration; labelKey: string }[] = [
    { value: 4, labelKey: 'gemini.duration.4s' },
    { value: 6, labelKey: 'gemini.duration.6s' },
    { value: 8, labelKey: 'gemini.duration.8s' },
];

// --- Resolution options (Gemini video) ---
// 360p is offered by Gemini Omni Flash only; each model narrows this list
// through `gemini.supportedResolutions`.
export const GEMINI_VIDEO_RESOLUTION_OPTIONS: { value: GeminiVideoResolution; labelKey: string }[] = [
    { value: '360p', labelKey: 'gemini.resolution.360p' },
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
// 'xhigh' / 'max' are accepted by the GPT Image 2.5 models only; each model
// narrows this list through `openai.supportedQualities`.
export const OPENAI_QUALITY_OPTIONS: OpenAIImageQuality[] = ['low', 'medium', 'high', 'xhigh', 'max'];
export const OPENAI_OUTPUT_FORMAT_OPTIONS: OpenAIOutputFormat[] = ['png', 'jpeg', 'webp'];
export const OPENAI_BACKGROUND_OPTIONS: OpenAIBackground[] = ['opaque', 'transparent'];

// --- Model definitions ---
// Sorted by family and cost within each family. Provider-specific capabilities
// live in the `gemini` or `openai` sub-object on each entry; the top-level
// fields are provider-agnostic.

export const MODEL_DEFINITIONS: ModelDefinition[] = [
    // -------------------------------------------------------------------------
    // Gemini Nano Banana family (flash 2 lite -> flash 2 -> pro)
    // generateContent API: 1 image/req, negative prompt embedded in text prompt.
    // All three tiers support image edit (reference image + edit-intent prompt).
    // Reference images: every Gemini 3 image model accepts up to 14 in total,
    // split differently per tier (objects / characters / style references).
    // Ultra-wide and ultra-tall ratios (4:1 / 8:1 / 1:4 / 1:8) are Nano Banana 2
    // only; lite and pro are limited to the 10 standard ratios per ai.google.dev.
    // -------------------------------------------------------------------------
    {
        // Nano Banana 2 Lite (Gemini 3.1 Flash Lite Image). GA on 2026/6/30.
        // Fastest/cheapest tier (~4s/image). Per ai.google.dev it only outputs
        // 1K resolution, supports 10 standard aspect ratios (no ultra-wide/tall
        // 4:1/8:1/1:4/1:8), and accepts up to 14 reference "object" images.
        // Image editing is supported; Grounding with Google Search is not.
        id: 'gemini-3.1-flash-lite-image',
        displayName: 'Nano Banana 2 Lite',
        provider: 'gemini',
        mediaType: 'image',
        supportsReferenceFile: true,
        maxReferenceImages: 14,
        supportsImageEdit: true,
        costLabel: ['1K: $0.034/image'],
        supportsNegativePrompt: true,
        gemini: {
            supportedAspectRatios: ['1:1', '4:3', '3:2', '5:4', '16:9', '21:9', '3:4', '2:3', '4:5', '9:16'],
            supportedQualities: ['1k'],
        },
    },
    {
        // Nano Banana 2 (Gemini 3.1 Flash Image). Reference images: up to 10
        // objects + 4 characters, 14 in total.
        id: 'gemini-3.1-flash-image',
        displayName: 'Nano Banana 2',
        provider: 'gemini',
        mediaType: 'image',
        supportsReferenceFile: true,
        maxReferenceImages: 14,
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
        // Nano Banana Pro (Gemini 3 Pro Image). Reference images: up to 6
        // objects + 5 characters + 3 style references, 14 in total. Per the
        // aspect-ratio table on ai.google.dev this tier covers the 10 standard
        // ratios only (no ultra-wide/ultra-tall).
        id: 'gemini-3-pro-image',
        displayName: 'Nano Banana Pro',
        provider: 'gemini',
        mediaType: 'image',
        supportsReferenceFile: true,
        maxReferenceImages: 14,
        supportsImageEdit: true,
        costLabel: ['1K/2K: $0.134/image', '4K: $0.24/image'],
        supportsNegativePrompt: true,
        gemini: {
            supportedAspectRatios: ['1:1', '4:3', '3:2', '5:4', '16:9', '21:9', '3:4', '2:3', '4:5', '9:16'],
            supportedQualities: ['1k', '2k', '4k'],
        },
    },
    // -------------------------------------------------------------------------
    // Gemini Veo 3.1 family (lite -> fast -> standard)
    // predictLongRunning API: text-to-video, image-to-video, native audio.
    // Attached images are used in one of two ways (see GeminiVideoReferenceMode):
    // as the starting frame (`image`, 1 slot, every model) or as subject
    // references (`referenceImages`, up to 3). Per the parameter table on
    // ai.google.dev, `referenceImages` is listed as n/a for Veo 3.1 Lite, so only
    // Veo 3.1 and Veo 3.1 Fast declare maxSubjectReferenceImages. Reference mode
    // requires an 8s duration.
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
            maxSubjectReferenceImages: 3,
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
            maxSubjectReferenceImages: 3,
        },
    },
    // -------------------------------------------------------------------------
    // Gemini Omni Flash (video generation / conversational editing)
    // Interactions API (interactions.create), NOT the Veo predictLongRunning
    // path — declared via gemini.videoApi. GA since 2026/8/27; the preview id
    // (gemini-omni-flash-preview) shuts down 2026/9/30 and is retired below.
    // Clip length stays prompt-controlled (3-10 seconds, no duration API
    // parameter), so supportedDurations is intentionally omitted and the
    // duration selector stays hidden. The GA model adds a `resolution`
    // parameter (360p / 720p default / 1080p and 4K via upscaling). Negative
    // prompt is unsupported by the API. Billed per output-video token
    // (5,792 tok/sec at $17.50/1M), i.e. ~$0.10/sec per ai.google.dev pricing.
    // -------------------------------------------------------------------------
    {
        id: 'gemini-omni-1.1-flash',
        displayName: 'Gemini Omni Flash',
        provider: 'gemini',
        mediaType: 'video',
        supportsReferenceFile: true,
        // ai.google.dev documents no explicit cap for plain reference input;
        // keep to the 2 images used by the official image-to-video and
        // first/last-frame interpolation examples.
        maxReferenceImages: 2,
        // The per-second figure is the provider's own conversion of a
        // token-based price, which ai.google.dev states as "approximately
        // $0.10 per second" — hence the ~ prefix.
        costLabel: ['720p: ~$0.10/sec'],
        noteKey: 'gemini.model.note.omniFlash',
        gemini: {
            supportedAspectRatios: ['16:9', '9:16'],
            supportedResolutions: ['360p', '720p', '1080p', '4k'],
            videoApi: 'interactions',
        },
    },
    // -------------------------------------------------------------------------
    // Gemini Lyria family (3 Clip -> 3.5)
    // Text-to-music, image-to-music (up to 10 images), lyrics generation.
    // Output: MP3, 44.1kHz stereo, SynthID watermarked.
    // Lyria 3.5 is documented only through the Interactions API, so it declares
    // gemini.audioApi; Lyria 3 Clip stays on the generateContent path this app
    // has been shipping against (ai.google.dev now documents interactions for
    // it as well — migrate once verified against a live key).
    // Lyria 3 Pro (lyria-3-pro-preview) is superseded by Lyria 3.5 at the same
    // price and is retired below.
    // -------------------------------------------------------------------------
    {
        id: 'lyria-3-clip-preview',
        displayName: 'Lyria 3 Clip',
        provider: 'gemini',
        mediaType: 'music',
        supportsReferenceFile: true,
        maxReferenceImages: 10,
        costLabel: ['$0.04/song'],
        noteKey: 'gemini.model.note.lyriaClip',
    },
    {
        // Lyria 3.5. GA on 2026/9/3. Full-length songs (a couple of minutes,
        // steerable through the prompt) with vocals and timed lyrics.
        id: 'lyria-3.5',
        displayName: 'Lyria 3.5',
        provider: 'gemini',
        mediaType: 'music',
        supportsReferenceFile: true,
        maxReferenceImages: 10,
        costLabel: ['$0.08/song'],
        noteKey: 'gemini.model.note.lyria',
    },
    // -------------------------------------------------------------------------
    // Gemini 3.8 TTS family (text-to-speech, GA 2026/9/22)
    //
    // Billing is per token, but tokens are not something a user can estimate, so
    // costLabel shows one figure: the price per minute of generated audio. The
    // conversion uses the provider's own factor of 25 audio tokens per second
    // (1,500 per minute): Flash-Lite $6.00 / 1M tok -> $0.009/min, Flash
    // $9.00 / 1M tok -> $0.0135/min. Text input ($0.50 / 1M text tokens) stays
    // under $0.001 per minute even for a dense script, so it is left out of the
    // label instead of adding a figure that rounds to nothing. Both rates are
    // introductory and double on 2027/1/1, which the second row states with a
    // `<date>~` period label.
    // Interactions API: the delivery style is carried in a `speech_metadata`
    // annotation and the voice in generation_config.speech_config. Inline
    // angle-bracket tags (<laugh>, <sigh>, <short pause>, ...) cover
    // point-in-time vocal events. 30 prebuilt studio voices, plus Voice design
    // and Voice replication (not exposed by this app yet). Output is requested
    // as raw PCM and re-encoded to MP3 by the service.
    // Sorted by output cost: Flash-Lite -> Flash.
    // The earlier previews (Gemini 3.1 Flash TTS, Gemini 2.5 Flash / Pro TTS)
    // are all deprecated in favour of these two and are retired below.
    // -------------------------------------------------------------------------
    {
        // Prices are the promotional rates in effect through 2026/12/31; they
        // double on 2027/1/1 ($1.00 input / $12.00 output per 1M tok).
        id: 'gemini-3.8-flash-lite-tts',
        displayName: 'Gemini 3.8 Flash-Lite TTS',
        provider: 'gemini',
        mediaType: 'voice',
        costLabel: ['$0.009/min', '2027/1/1~ $0.018/min'],
        freeTierAvailable: true,
        freeTierNoteKey: 'gemini.model.freeTier.tts',
        gemini: {
            supportsAudioTags: true,
        },
    },
    {
        // Prices double on 2027/1/1 ($1.00 input / $18.00 output per 1M tok).
        id: 'gemini-3.8-flash-tts',
        displayName: 'Gemini 3.8 Flash TTS',
        provider: 'gemini',
        mediaType: 'voice',
        costLabel: ['$0.0135/min', '2027/1/1~ $0.027/min'],
        freeTierAvailable: true,
        freeTierNoteKey: 'gemini.model.freeTier.tts',
        gemini: {
            supportsAudioTags: true,
        },
    },
    // -------------------------------------------------------------------------
    // OpenAI GPT Image 2.5 family (Flare -> Sunburst)
    // /v1/images/generations + /v1/images/edits.
    // These are the models OpenAI documents for new integrations. Both accept
    // the `xhigh` / `max` quality tiers, transparent backgrounds (PNG / WebP),
    // and custom sizes; they share identical token rates and quality
    // coefficients, differing only in what they are tuned for.
    // Every earlier GPT Image model (2, 1.5, 1) is retired below.
    //
    // In costLabel, each size group is a `< WIDTHxHEIGHT >` section header
    // followed by its price line(s); sizes that share a price are grouped on the
    // same header, and rows are listed in ascending Low-tier price.
    //
    // OpenAI publishes no per-image table for these models, only an interactive
    // calculator, so the figures are computed with the official token formula
    // that calculator uses: a patch grid sized from the long-edge coefficient for
    // the quality tier (Low 16 / Med 24 / High 48 / XHigh 64 / Max 96), then
    // ceil(grid area * (2M + pixels) / 4M) tokens at $30 / 1M image output
    // tokens. The formula reproduces OpenAI's published gpt-image-2 table
    // exactly, so the values are as firm as OpenAI's own and are shown rounded
    // to three decimals the same way — no hedging marker on the rows. Note that
    // cost does NOT scale with pixel count: a wide 4K frame is cheaper than a
    // 2K square, which the OpenAI docs call out as well.
    // -------------------------------------------------------------------------
    {
        // GPT Image 2.5 Flare — OpenAI's recommended default for fast,
        // high-quality everyday generation.
        id: 'gpt-image-2.5-flare',
        displayName: 'GPT Image 2.5 Flare',
        provider: 'openai',
        mediaType: 'image',
        maxImages: 10,
        supportsReferenceFile: true,
        maxReferenceImages: 16,
        supportsImageEdit: true,
        costLabel: [
            '< 1024x1536, 1536x1024 >',
            '$0.005(Low) / $0.010(Med) / $0.041(High)',
            '$0.074(XHigh) / $0.165(Max)',
            '< 2048x1152 >',
            '$0.005(Low) / $0.011(Med) / $0.042(High)',
            '$0.075(XHigh) / $0.170(Max)',
            '< 1024x1024 >',
            '$0.006(Low) / $0.013(Med) / $0.053(High)',
            '$0.094(XHigh) / $0.211(Max)',
            '< 3840x2160, 2160x3840 >',
            '$0.011(Low) / $0.026(Med) / $0.100(High)',
            '$0.178(XHigh) / $0.400(Max)',
            '< 2048x2048 >',
            '$0.012(Low) / $0.027(Med) / $0.107(High)',
            '$0.190(XHigh) / $0.428(Max)',
        ],
        supportsNegativePrompt: true,
        openai: {
            supportedSizes: ['1024x1024', '1024x1536', '1536x1024', '2048x2048', '2048x1152', '3840x2160', '2160x3840'],
            // Conservative narrowing: only the three recommended sizes are
            // documented for the edit endpoint.
            supportedEditSizes: ['1024x1024', '1024x1536', '1536x1024'],
            supportedQualities: ['low', 'medium', 'high', 'xhigh', 'max'],
            supportsBackground: true,
        },
    },
    {
        // GPT Image 2.5 Sunburst — same token rates and per-image costs as
        // Flare, tuned for workflows where editing precision matters most.
        id: 'gpt-image-2.5-sunburst',
        displayName: 'GPT Image 2.5 Sunburst',
        provider: 'openai',
        mediaType: 'image',
        maxImages: 10,
        supportsReferenceFile: true,
        maxReferenceImages: 16,
        supportsImageEdit: true,
        costLabel: [
            '< 1024x1536, 1536x1024 >',
            '$0.005(Low) / $0.010(Med) / $0.041(High)',
            '$0.074(XHigh) / $0.165(Max)',
            '< 2048x1152 >',
            '$0.005(Low) / $0.011(Med) / $0.042(High)',
            '$0.075(XHigh) / $0.170(Max)',
            '< 1024x1024 >',
            '$0.006(Low) / $0.013(Med) / $0.053(High)',
            '$0.094(XHigh) / $0.211(Max)',
            '< 3840x2160, 2160x3840 >',
            '$0.011(Low) / $0.026(Med) / $0.100(High)',
            '$0.178(XHigh) / $0.400(Max)',
            '< 2048x2048 >',
            '$0.012(Low) / $0.027(Med) / $0.107(High)',
            '$0.190(XHigh) / $0.428(Max)',
        ],
        supportsNegativePrompt: true,
        openai: {
            supportedSizes: ['1024x1024', '1024x1536', '1536x1024', '2048x2048', '2048x1152', '3840x2160', '2160x3840'],
            supportedEditSizes: ['1024x1024', '1024x1536', '1536x1024'],
            supportedQualities: ['low', 'medium', 'high', 'xhigh', 'max'],
            supportsBackground: true,
        },
    },
];

// --- Retired model definitions ---
// Models that have been shut down by the provider and removed from the
// generation model list. They are NOT selectable for new generations: the
// generation UI and provider dispatch only ever look at MODEL_DEFINITIONS.
//
// These entries exist purely so that PAST history entries created with these
// models remain fully usable — the history filter dropdown can still list them
// (merged with MODEL_DEFINITIONS and narrowed to models actually present in the
// history), and restoring a retired entry maps its model to `replacementModelId`
// so the prompt/filters carry over onto the supported successor.
//
// This list is the single, generic place to retire any future model: move its
// definition here and set `replacementModelId` to the migration target.
export const RETIRED_MODEL_DEFINITIONS: ModelDefinition[] = [
    // Imagen 4 family (fast -> standard -> ultra). Shut down 2026/8/17.
    // Migration target: Nano Banana 2 (gemini-3.1-flash-image, GA).
    {
        id: 'imagen-4.0-fast-generate-001',
        displayName: 'Imagen 4 Fast',
        provider: 'gemini',
        mediaType: 'image',
        maxImages: 4,
        supportsNegativePrompt: true,
        replacementModelId: 'gemini-3.1-flash-image',
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
        supportsNegativePrompt: true,
        replacementModelId: 'gemini-3.1-flash-image',
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
        supportsNegativePrompt: true,
        replacementModelId: 'gemini-3.1-flash-image',
        gemini: {
            supportedAspectRatios: ['1:1', '4:3', '16:9', '3:4', '9:16'],
            supportedQualities: ['1k', '2k'],
        },
    },
    // Nano Banana 2 / Pro preview model ids. These were the pre-GA ids that
    // shipped before 2026/5/28; the provider shuts them down on 2026/6/25. The
    // GA equivalents (gemini-3.1-flash-image / gemini-3-pro-image) are the
    // active generation models. Keeping the preview ids here lets history made
    // on them stay filterable, and restores map onto the matching GA id.
    {
        id: 'gemini-3.1-flash-image-preview',
        displayName: 'Nano Banana 2 (Preview)',
        provider: 'gemini',
        mediaType: 'image',
        supportsReferenceFile: true,
        maxReferenceImages: 10,
        supportsImageEdit: true,
        supportsNegativePrompt: true,
        replacementModelId: 'gemini-3.1-flash-image',
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
        displayName: 'Nano Banana Pro (Preview)',
        provider: 'gemini',
        mediaType: 'image',
        supportsReferenceFile: true,
        maxReferenceImages: 10,
        supportsImageEdit: true,
        supportsNegativePrompt: true,
        replacementModelId: 'gemini-3-pro-image',
        gemini: {
            supportedAspectRatios: ['1:1', '4:3', '3:2', '5:4', '16:9', '21:9', '3:4', '2:3', '4:5', '9:16'],
            supportedQualities: ['1k', '2k', '4k'],
        },
    },
    // Nano Banana (gemini-2.5-flash-image). Shut down 2026/10/2. Removed from
    // the picker ahead of the shutdown so a newly shipped build never offers a
    // model that stops answering within days.
    // Migration target: Nano Banana 2 (gemini-3.1-flash-image).
    {
        id: 'gemini-2.5-flash-image',
        displayName: 'Nano Banana',
        provider: 'gemini',
        mediaType: 'image',
        supportsReferenceFile: true,
        maxReferenceImages: 3,
        supportsImageEdit: true,
        supportsNegativePrompt: true,
        replacementModelId: 'gemini-3.1-flash-image',
        gemini: {
            supportedAspectRatios: ['1:1', '4:3', '3:2', '5:4', '16:9', '21:9', '3:4', '2:3', '4:5', '9:16'],
            supportedQualities: [],
        },
    },
    // Gemini Omni Flash preview id. Shut down 2026/9/30 following the GA
    // release (2026/8/27). Migration target: gemini-omni-1.1-flash.
    {
        id: 'gemini-omni-flash-preview',
        displayName: 'Gemini Omni Flash (Preview)',
        provider: 'gemini',
        mediaType: 'video',
        supportsReferenceFile: true,
        maxReferenceImages: 2,
        replacementModelId: 'gemini-omni-1.1-flash',
        gemini: {
            supportedAspectRatios: ['16:9', '9:16'],
            videoApi: 'interactions',
        },
    },
    // Lyria 3 Pro preview. Superseded by Lyria 3.5 (GA 2026/9/3) at the same
    // $0.08/song price; no longer documented on ai.google.dev.
    // Migration target: lyria-3.5.
    {
        id: 'lyria-3-pro-preview',
        displayName: 'Lyria 3 Pro',
        provider: 'gemini',
        mediaType: 'music',
        supportsReferenceFile: true,
        maxReferenceImages: 5,
        replacementModelId: 'lyria-3.5',
    },
    // GPT Image 2. Not formally deprecated, but OpenAI moved it into the
    // "earlier GPT Image models" section and directs new integrations to the
    // GPT Image 2.5 models, which are strictly more capable at the same token
    // rate (extra quality tiers, transparent backgrounds). Migration target:
    // gpt-image-2.5-flare, which accepts the same sizes and quality tiers.
    {
        id: 'gpt-image-2',
        displayName: 'GPT Image 2',
        provider: 'openai',
        mediaType: 'image',
        maxImages: 10,
        supportsReferenceFile: true,
        maxReferenceImages: 16,
        supportsImageEdit: true,
        supportsNegativePrompt: true,
        replacementModelId: 'gpt-image-2.5-flare',
        openai: {
            supportedSizes: ['1024x1024', '1024x1536', '1536x1024', '2048x2048', '2048x1152', '3840x2160', '2160x3840'],
            supportedEditSizes: ['1024x1024', '1024x1536', '1536x1024'],
            supportedQualities: ['low', 'medium', 'high'],
            supportsBackground: false,
        },
    },
    // GPT Image 1 / 1.5. Deprecated by OpenAI on 2026/6/2 with a 2026/12/1
    // shutdown. OpenAI names gpt-image-2 as the replacement, but that model is
    // retired here too, so these point straight at gpt-image-2.5-flare instead
    // of forming a restore chain.
    {
        id: 'gpt-image-1',
        displayName: 'GPT Image 1',
        provider: 'openai',
        mediaType: 'image',
        maxImages: 10,
        supportsReferenceFile: true,
        maxReferenceImages: 16,
        supportsImageEdit: true,
        supportsNegativePrompt: true,
        replacementModelId: 'gpt-image-2.5-flare',
        openai: {
            supportedSizes: ['1024x1024', '1024x1536', '1536x1024'],
            supportedQualities: ['low', 'medium', 'high'],
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
        supportsNegativePrompt: true,
        replacementModelId: 'gpt-image-2.5-flare',
        openai: {
            supportedSizes: ['1024x1024', '1024x1536', '1536x1024'],
            supportedQualities: ['low', 'medium', 'high'],
            supportsBackground: true,
        },
    },
    // Gemini 3.1 Flash TTS Preview. Deprecated on ai.google.dev with
    // gemini-3.8-flash-tts / gemini-3.8-flash-lite-tts named as the
    // replacements; Flash-Lite is the direct successor ("built to replace
    // gemini-3.1-flash-tts-preview") and is both cheaper and more capable.
    {
        id: 'gemini-3.1-flash-tts-preview',
        displayName: 'Gemini 3.1 Flash TTS',
        provider: 'gemini',
        mediaType: 'voice',
        replacementModelId: 'gemini-3.8-flash-lite-tts',
    },
    // Gemini 2.5 TTS previews. Not formally shut down, but access to the 2.5
    // family is now limited to projects that already used those models, and
    // gemini-2.5-flash-preview-tts has been dropped from the supported-models
    // table in the speech-generation guide. Migration target:
    // gemini-3.8-flash-lite-tts (cheaper output and a superset of features).
    {
        id: 'gemini-2.5-flash-preview-tts',
        displayName: 'Gemini 2.5 Flash TTS',
        provider: 'gemini',
        mediaType: 'voice',
        replacementModelId: 'gemini-3.8-flash-lite-tts',
    },
    {
        id: 'gemini-2.5-pro-preview-tts',
        displayName: 'Gemini 2.5 Pro TTS',
        provider: 'gemini',
        mediaType: 'voice',
        replacementModelId: 'gemini-3.8-flash-tts',
    },
];

// All model definitions, active plus retired. Use this ONLY for read-only,
// history-facing lookups (filter dropdowns, display-name resolution) where a
// past entry may reference a retired model. NEVER use it to populate the
// generation model selector or to dispatch a generation request — those paths
// must stay on MODEL_DEFINITIONS so retired models can never be generated.
export const ALL_MODEL_DEFINITIONS: ModelDefinition[] = [...MODEL_DEFINITIONS, ...RETIRED_MODEL_DEFINITIONS];

// Effective cap on attached reference images for a request. Models that accept
// no images at all return 0. Edit mode is always a single slot regardless of the
// declared cap. A Veo request in subject-reference mode uses the model's
// `maxSubjectReferenceImages` instead of the single starting-frame slot.
export function resolveMaxReferenceImages(
    modelDef: ModelDefinition | undefined,
    opts?: { editMode?: boolean; videoReferenceMode?: GeminiVideoReferenceMode }
): number {
    if (!modelDef?.supportsReferenceFile) return 0;
    if (opts?.editMode) return 1;
    if (opts?.videoReferenceMode === 'reference' && modelDef.gemini?.maxSubjectReferenceImages) {
        return modelDef.gemini.maxSubjectReferenceImages;
    }
    return modelDef.maxReferenceImages ?? 0;
}

// Resolve the id a model should map to when restoring a history entry. For an
// active model this is the id itself; for a retired model it is its
// `replacementModelId` (falling back to the id if none is declared). Generic so
// callers don't need to special-case any particular retired model.
//
// Replacements are followed transitively, so a model whose successor is itself
// retired later still lands on a selectable model. The hop count is bounded by
// the list length, which also breaks any accidental cycle.
export function resolveRestoreModelId(modelId: string): string {
    let current = modelId;
    for (let hops = 0; hops <= RETIRED_MODEL_DEFINITIONS.length; hops++) {
        const retired = RETIRED_MODEL_DEFINITIONS.find(m => m.id === current);
        if (!retired) return current;
        const next = retired.replacementModelId;
        // A retired model with no declared successor is the end of the line.
        if (!next || next === current) return current;
        current = next;
    }
    return current;
}

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

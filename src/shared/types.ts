// Platform identifier
export type PlatformId = 'win32' | 'darwin' | 'linux';

// App theme setting
export type AppTheme = 'light' | 'dark' | 'system';

// App language setting
export type AppLanguage = 'ja' | 'en';

// App info
export type AppInfo = {
    name: string;
    version: string;
    language: AppLanguage;
    theme: AppTheme;
    os: PlatformId;
};

// --- API Provider ---
export type ApiProvider = 'gemini';

// --- Media type ---
// image: Imagen / Nano Banana
// video: Veo
// music: Lyria
// voice: Gemini TTS (speech)
export type MediaType = 'image' | 'video' | 'music' | 'voice';

// --- Video generation parameters ---
export type VideoDuration = 4 | 6 | 8;
export type VideoResolution = '720p' | '1080p' | '4k';

// --- Model definition ---
// Generator dispatch is driven entirely by `mediaType`. For image models, Imagen
// vs Gemini image is disambiguated by the model id prefix (`imagen-*` are Imagen,
// per Google's naming convention) — see gemini-service.ts.
export type ModelDefinition = {
    id: string;
    displayName: string;
    provider: ApiProvider;
    mediaType: MediaType;
    // Omit for models where aspect ratio is not applicable (music, voice).
    supportedAspectRatios?: string[];
    // Image model properties
    supportedQualities?: string[];
    // Maximum number of reference images this model accepts. Omit (or 0) means
    // image input is not supported. Used to gate UI and to cap attachments
    // server-side per generator.
    maxReferenceImages?: number;
    maxImages?: number;
    // Video model properties
    supportedDurations?: VideoDuration[];
    supportedResolutions?: VideoResolution[];
    supportsSeed?: boolean;
    // Negative prompt
    supportsNegativePrompt?: boolean;
    apiNegativePrompt?: boolean;
    // Cost & notes
    costLabel?: string[];
    freeTierAvailable?: boolean;
    // i18n key for the free-tier info block (may contain multiple lines separated by \n).
    freeTierNoteKey?: string;
    noteKey?: string;
    // TTS-specific
    supportsAudioTags?: boolean;
};

// --- Generation parameters ---
export type AspectRatio =
    | '1:1'
    | '4:3'
    | '3:2'
    | '5:4'
    | '16:9'
    | '21:9'
    | '4:1'
    | '8:1'
    | '3:4'
    | '2:3'
    | '4:5'
    | '9:16'
    | '1:4'
    | '1:8';

export type Quality = '512px' | '1k' | '2k' | '4k';

export type GenerationParams = {
    model: string;
    prompt: string;
    negativePrompt: string;
    aspectRatio: AspectRatio;
    quality: Quality;
    numberOfImages: number;
    referenceImagePaths: string[];
    duration?: VideoDuration;
    resolution?: VideoResolution;
    seed?: number;
    // TTS-specific
    styleInstruction?: string;
    voice?: string;
};

// --- History entry ---
export type HistoryEntry = {
    id: string;
    createdAt: string;
    updatedAt: string;
    model: string;
    modelDisplayName: string;
    prompt: string;
    negativePrompt: string;
    aspectRatio: AspectRatio;
    quality: Quality;
    numberOfImages: number;
    referenceImagePaths: string[];
    generatedImagePaths: string[];
    imageWidth?: number;
    imageHeight?: number;
    fileSize?: number;
    mediaType?: MediaType;
    videoDuration?: VideoDuration;
    videoResolution?: VideoResolution;
    seed?: number;
    audioTexts?: string[];
    elapsedMs?: number;
    // TTS-specific
    styleInstruction?: string;
    voice?: string;
};

// --- Settings ---
export type AppSettings = {
    language: AppLanguage;
    theme: AppTheme;
    historyDir: string;
};

// --- API Key storage ---
// Active key identifier: 'default' | 'freeTier' | `custom:${index}` (index 0..API_KEY_CUSTOM_MAX-1)
export type ApiKeyActiveId = string;

export type ApiKeyCustomEntry = {
    title: string;
    key: string;
    isFreeTier: boolean;
};

export type ApiKeysData = {
    defaultKey: string;
    defaultIsFreeTier: boolean;
    freeTierKey: string;
    customs: ApiKeyCustomEntry[];
    activeId: ApiKeyActiveId;
};

export type ApiKeyOptionKind = 'default' | 'freeTier' | 'custom';

export type ApiKeyOption = {
    id: ApiKeyActiveId;
    kind: ApiKeyOptionKind;
    title: string;
    hasKey: boolean;
    isFreeTier: boolean;
};

export type ActiveKeyInfo = {
    id: ApiKeyActiveId;
    kind: ApiKeyOptionKind;
    title: string;
    isFreeTier: boolean;
    hasKey: boolean;
};

// --- API test result ---
export type ApiKeyTestStatus = 'KEY_NOT_SET' | 'KEY_VALID' | 'KEY_INVALID' | 'TEST_ERROR';

export type ApiTestResult = {
    success: boolean;
    status: ApiKeyTestStatus;
    rawMessage: string | null;
};

// --- Generation progress ---
export type GenerationProgress = {
    status: 'generating';
    elapsedSeconds: number;
};

// --- Structured API error ---
export type ApiErrorDetail = {
    httpStatus: number;
    apiCode: number | null;
    apiStatus: string | null;
    apiMessage: string | null;
};

// --- Generation result (success or structured error) ---
export type GenerationResult = { success: true; entries: HistoryEntry[] } | { success: false; error: ApiErrorDetail };

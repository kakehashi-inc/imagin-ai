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
// Internal identifier. User-facing display name lives in i18n values
// (`provider.gemini` = 'Google AI Studio', `provider.openai` = 'OpenAI').
export type ApiProvider = 'gemini' | 'openai';
export const API_PROVIDERS: readonly ApiProvider[] = ['gemini', 'openai'] as const;

// --- Media type (shared by both providers) ---
// image: Imagen / Nano Banana / GPT Image
// video: Veo
// music: Lyria
// voice: Gemini TTS (speech)
export type MediaType = 'image' | 'video' | 'music' | 'voice';

// =============================================================================
// Gemini-only parameters
// =============================================================================

// Aspect ratio (Gemini image / video)
export type GeminiAspectRatio =
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

// Quality (Gemini image)
export type GeminiQuality = '512px' | '1k' | '2k' | '4k';

// Video duration (Veo)
export type GeminiVideoDuration = 4 | 6 | 8;

// Video resolution (Veo)
export type GeminiVideoResolution = '720p' | '1080p' | '4k';

// Aspect ratio grouping for UI (Gemini)
export type GeminiAspectRatioGroup = 'square' | 'landscape' | 'portrait';

// =============================================================================
// OpenAI-only parameters
// =============================================================================

// Image size. `auto` is intentionally not exposed; user always picks explicit size.
// Sizes beyond the three "standard" entries are `gpt-image-2` only.
export type OpenAIImageSize =
    | '1024x1024' // Square (1:1)
    | '1024x1536' // Portrait (2:3)
    | '1536x1024' // Landscape (3:2)
    | '2048x2048' // 2K Square (1:1)
    | '2048x1152' // 2K Landscape (16:9)
    | '3840x2160' // 4K Landscape (16:9)
    | '2160x3840'; // 4K Portrait (9:16)

export type OpenAIImageQuality = 'low' | 'medium' | 'high';
export type OpenAIOutputFormat = 'png' | 'jpeg' | 'webp';
export type OpenAIBackground = 'transparent' | 'opaque';

// =============================================================================
// Model definition (per-provider sub-objects)
// =============================================================================

export type ModelDefinition = {
    id: string;
    displayName: string;
    provider: ApiProvider;
    mediaType: MediaType;
    // Provider-agnostic capabilities. Defaults documented inline are assumed
    // when a model omits the field — model definitions only declare a field
    // when its value differs from the default.
    // Default: 1
    maxImages?: number;
    // Whether the model accepts attached reference images at all. Default: false.
    // When false, the prompt panel hides the attach button regardless of
    // maxReferenceImages. When true, `maxReferenceImages` MUST be declared
    // explicitly on the model definition (no defaulting).
    supportsReferenceFile?: boolean;
    // Cap on attached reference images. Required when supportsReferenceFile is
    // true; ignored otherwise.
    maxReferenceImages?: number;
    // Whether the model supports the image-edit flow. Default: false.
    // Edit mode is always fixed to exactly one reference image.
    supportsImageEdit?: boolean;
    costLabel?: string[];
    // Default: false
    freeTierAvailable?: boolean;
    freeTierNoteKey?: string;
    noteKey?: string;
    // Whether to show the negative-prompt UI for this model. Default: false.
    // For models without a native parameter, the service prepends a
    // "Do not include: ..." instruction to the prompt instead.
    supportsNegativePrompt?: boolean;
    // Whether the underlying API accepts negative_prompt as a dedicated
    // parameter. Default: false (embedded in the prompt text by the service).
    apiNegativePrompt?: boolean;
    // Gemini-only block (set when provider === 'gemini')
    gemini?: {
        supportedAspectRatios?: GeminiAspectRatio[];
        supportedQualities?: GeminiQuality[];
        supportedDurations?: GeminiVideoDuration[];
        supportedResolutions?: GeminiVideoResolution[];
        supportsAudioTags?: boolean;
    };
    // OpenAI-only block (set when provider === 'openai')
    openai?: {
        supportedSizes: OpenAIImageSize[];
        // Sizes available when the image edit endpoint is used. When omitted,
        // edit mode reuses `supportedSizes` (i.e. no narrowing vs. generate).
        // Declare only when the edit endpoint accepts a strict subset — e.g.
        // gpt-image-2 supports 2K/4K on generate but only the three standard
        // sizes on edits per the OpenAI API spec.
        supportedEditSizes?: OpenAIImageSize[];
        supportsBackground: boolean; // false for gpt-image-2 (transparent unsupported)
    };
};

// =============================================================================
// Generation parameters (per-provider sub-objects)
// =============================================================================

export type GenerationParams = {
    provider: ApiProvider;
    model: string;
    prompt: string;
    numberOfImages: number;
    referenceImagePaths: string[];
    editMode: boolean;
    gemini?: {
        negativePrompt: string;
        aspectRatio: GeminiAspectRatio;
        quality: GeminiQuality;
        duration?: GeminiVideoDuration;
        resolution?: GeminiVideoResolution;
        // Note: no `seed` field here. The current @google/genai SDK rejects a
        // user-provided seed in Developer API mode, so the renderer never
        // collects one. If the server returns a seed in the response it is
        // recorded on the history entry only (see HistoryEntry.gemini.seed).
        styleInstruction?: string;
        voice?: string;
    };
    openai?: {
        size: OpenAIImageSize;
        quality: OpenAIImageQuality;
        outputFormat: OpenAIOutputFormat;
        background: OpenAIBackground;
        // Appended to the prompt as "Do not include: ..." when set. OpenAI has
        // no dedicated API parameter for this; the openai-service handles the
        // prompt augmentation. Mirrors gemini.negativePrompt.
        negativePrompt: string;
    };
};

// =============================================================================
// History entry (per-provider sub-objects)
// =============================================================================

export type HistoryEntry = {
    id: string;
    createdAt: string;
    updatedAt: string;
    provider: ApiProvider;
    model: string;
    modelDisplayName: string;
    mediaType: MediaType;
    prompt: string;
    numberOfImages: number;
    referenceImagePaths: string[];
    generatedImagePaths: string[];
    imageWidth?: number;
    imageHeight?: number;
    fileSize?: number;
    elapsedMs?: number;
    editMode: boolean;
    gemini?: {
        negativePrompt: string;
        aspectRatio: GeminiAspectRatio;
        quality: GeminiQuality;
        videoDuration?: GeminiVideoDuration;
        videoResolution?: GeminiVideoResolution;
        // Populated only when the server returns a seed in the response (e.g.
        // future Veo releases). Never set from the renderer.
        seed?: number;
        // Texts that the API returned alongside the audio (Lyria lyrics /
        // descriptions, TTS supplementary text). Displayed in the audio viewer.
        audioTexts?: string[];
        styleInstruction?: string;
        voice?: string;

        // --- Response metadata (stored only; not displayed) -------------------
        // generateContent diagnostics (image / music / voice). These are
        // captured even on success so the JSON file can be inspected later.
        finishReason?: string;
        finishMessage?: string;
        safetyRatings?: Array<{ category?: string; probability?: string; blocked?: boolean }>;
        promptFeedback?: {
            blockReason?: string;
            blockReasonMessage?: string;
            safetyRatings?: Array<{ category?: string; probability?: string; blocked?: boolean }>;
        };
        // Token usage (Nano Banana, Imagen via generateContent, Lyria, TTS).
        usageTokens?: {
            promptTokens?: number;
            candidatesTokens?: number;
            totalTokens?: number;
        };
        // Imagen-specific.
        enhancedPrompt?: string;
        raiFilteredReason?: string;
        // Veo-specific. Stored as-is for forward compatibility (e.g. future
        // metadata.seed). The shape is intentionally untyped because the
        // server may add fields the SDK doesn't model yet.
        operationName?: string;
        operationMetadata?: Record<string, unknown>;
        raiMediaFilteredCount?: number;
        raiMediaFilteredReasons?: string[];
        // Pre-processing source mime for Gemini TTS (e.g.
        // 'audio/L16;codec=pcm;rate=24000' before MP3/WAV conversion).
        originalAudioMimeType?: string;
    };
    openai?: {
        size: OpenAIImageSize;
        quality: OpenAIImageQuality;
        outputFormat: OpenAIOutputFormat;
        background: OpenAIBackground;
        // Negative prompt the user typed for this generation. OpenAI has no
        // native parameter — openai-service appends it to the prompt — but we
        // still record the user-entered value for parameter restore.
        negativePrompt: string;

        // --- Response metadata (stored only; not displayed) -------------------
        // Returned by DALL·E 3 when the prompt was rewritten. Not set for GPT
        // image models in practice but captured if present.
        revisedPrompt?: string;
        // Unix timestamp (seconds) the API reports for when the image was
        // created. Distinct from the entry's local createdAt.
        apiCreated?: number;
        // Parameters the API echoes back after applying them. Useful when
        // 'auto' or partial config is involved, even though this app doesn't
        // currently send auto.
        apiAppliedBackground?: 'transparent' | 'opaque';
        apiAppliedOutputFormat?: 'png' | 'jpeg' | 'webp';
        apiAppliedQuality?: 'low' | 'medium' | 'high';
        apiAppliedSize?: '1024x1024' | '1024x1536' | '1536x1024';
        // Token usage (GPT image models). The breakdown matches OpenAI's
        // billing dimensions so cost can be recomputed exactly from history.
        usage?: {
            inputTokens?: number;
            outputTokens?: number;
            totalTokens?: number;
            inputImageTokens?: number;
            inputTextTokens?: number;
            outputImageTokens?: number;
            outputTextTokens?: number;
        };
    };
};

// =============================================================================
// App settings
// =============================================================================

export type AppSettings = {
    language: AppLanguage;
    theme: AppTheme;
    historyDir: string;
};

// =============================================================================
// API key storage (fully symmetric across providers)
// =============================================================================

// A single key slot (default, freeTier, or one of the customs).
export type ApiKeySlot = {
    key: string;
    isFreeTier: boolean; // Only meaningful for gemini; always false for openai.
    title?: string; // Custom slots only.
};

// Per-provider key set. The freeTier slot is structurally present for all providers
// to keep the schema symmetric; UI hides it for providers that don't expose a free tier.
export type ProviderKeySet = {
    default: ApiKeySlot;
    freeTier: ApiKeySlot;
    customs: ApiKeySlot[];
};

// Active key identifier in the form `<provider>:<slot>` or `<provider>:custom:<index>`.
// Examples: 'gemini:default', 'gemini:freeTier', 'gemini:custom:0',
//           'openai:default',                     'openai:custom:0'.
export type ApiKeyActiveId = string;

export type ApiKeysData = {
    schemaVersion: 2;
    providers: Record<ApiProvider, ProviderKeySet>;
    activeId: ApiKeyActiveId;
};

export type ApiKeyOptionKind = 'default' | 'freeTier' | 'custom';

export type ApiKeyOption = {
    id: ApiKeyActiveId;
    provider: ApiProvider;
    kind: ApiKeyOptionKind;
    title: string;
    hasKey: boolean;
    isFreeTier: boolean;
};

export type ActiveKeyInfo = {
    id: ApiKeyActiveId;
    provider: ApiProvider;
    kind: ApiKeyOptionKind;
    title: string;
    isFreeTier: boolean;
    hasKey: boolean;
};

// =============================================================================
// API test result
// =============================================================================

export type ApiKeyTestStatus = 'KEY_NOT_SET' | 'KEY_VALID' | 'KEY_INVALID' | 'TEST_ERROR';

export type ApiTestResult = {
    success: boolean;
    status: ApiKeyTestStatus;
    rawMessage: string | null;
};

// =============================================================================
// Generation progress
// =============================================================================

export type GenerationProgress = {
    status: 'generating';
    elapsedSeconds: number;
};

// =============================================================================
// Structured API error
// =============================================================================

export type ApiErrorDetail = {
    httpStatus: number;
    apiCode: number | null;
    apiStatus: string | null;
    apiMessage: string | null;
};

// =============================================================================
// Generation result (success or structured error)
// =============================================================================

export type GenerationResult = { success: true; entries: HistoryEntry[] } | { success: false; error: ApiErrorDetail };

// =============================================================================
// Auto-update state
// =============================================================================

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';

export type UpdateState = {
    status: UpdateStatus;
    version?: string;
    progress?: number;
    error?: string;
};

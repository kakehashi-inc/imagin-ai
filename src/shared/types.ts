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
// image: Nano Banana / GPT Image
// video: Gemini Omni Flash
// music: Lyria
// voice: Gemini TTS (speech)
export type MediaType = 'image' | 'video' | 'music' | 'voice';

// =============================================================================
// Gemini-only parameters
// =============================================================================

// Aspect ratio (Gemini image / video)
export type GeminiAspectRatio =
    '1:1' | '4:3' | '3:2' | '5:4' | '16:9' | '21:9' | '4:1' | '8:1' | '3:4' | '2:3' | '4:5' | '9:16' | '1:4' | '1:8';

// Quality (Gemini image). '512px' is offered by no active model and appears
// only on history entries and retired model definitions.
export type GeminiQuality = '512px' | '1k' | '2k' | '4k';

// Video duration in whole seconds (Gemini video). The range is the one the API
// accepts for `response_format.duration`; per-model availability is declared
// via ModelDefinition.gemini.supportedDurations.
export type GeminiVideoDuration = 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

// Video resolution (Gemini video). Per-model availability is declared via
// ModelDefinition.gemini.supportedResolutions.
export type GeminiVideoResolution = '360p' | '720p' | '1080p' | '4k';

// Aspect ratio grouping for UI (Gemini)
export type GeminiAspectRatioGroup = 'square' | 'landscape' | 'portrait';

// =============================================================================
// OpenAI-only parameters
// =============================================================================

// Image size. `auto` is intentionally not exposed; user always picks explicit size.
// The three "standard" entries are OpenAI's recommended sizes; the 2K / 4K
// entries are custom dimensions that satisfy the documented constraints
// (multiples of 16, aspect ratio within 1:3-3:1, max edge 3840px, 655,360 to
// 8,294,400 pixels).
export type OpenAIImageSize =
    | '1024x1024' // Square (1:1)
    | '1024x1536' // Portrait (2:3)
    | '1536x1024' // Landscape (3:2)
    | '2048x2048' // 2K Square (1:1)
    | '2048x1152' // 2K Landscape (16:9)
    | '3840x2160' // 4K Landscape (16:9)
    | '2160x3840'; // 4K Portrait (9:16)

// Image quality. 'xhigh' / 'max' are accepted from GPT Image 2.5 (Sunburst /
// Flare) onward; earlier GPT Image models stop at 'high'. Per-model availability is declared
// via ModelDefinition.openai.supportedQualities.
export type OpenAIImageQuality = 'low' | 'medium' | 'high' | 'xhigh' | 'max';
export type OpenAIOutputFormat = 'png' | 'jpeg' | 'webp';
export type OpenAIBackground = 'transparent' | 'opaque';
// How much the model plans the image (GPT Image 2.6 onward). The API applies
// 'high' when the parameter is omitted.
export type OpenAIComplexity = 'low' | 'medium' | 'high';
// Content moderation strictness for GPT Image models ('auto' is the API default).
export type OpenAIModeration = 'auto' | 'low';

// =============================================================================
// Model definition (per-provider sub-objects)
// =============================================================================

export type ModelDefinition = {
    // App-side model key, fixed per major version of a model line (e.g.
    // 'gemini-nano-banana-2'). History entries and parameter restore refer to
    // models by this key, so a minor version update keeps it unchanged.
    id: string;
    // Model id sent to the provider API (e.g. 'gemini-nano-banana-2.1'). A
    // minor version update changes this field and `displayName`. Declared on
    // every active model; retired models omit it.
    apiModelId?: string;
    // Name of the provider model version in use.
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
    // Whether the model is usable on a Gemini free-tier API key. Default: false.
    // Declare ONLY `true` here; omit the field for free-tier-unavailable models.
    // UI must test `=== true` / `!== true` (never `=== false`) so an omitted
    // field is correctly treated as unavailable.
    freeTierAvailable?: boolean;
    freeTierNoteKey?: string;
    noteKey?: string;
    // Provider-announced shutdown / end-of-support date for this model, as a
    // display string (e.g. '2026/10/2'). Set only when the provider has published
    // a concrete date. When present the UI shows it as an annotation both in the
    // model dropdown (a warning chip at selection time) and below the selector.
    // Distinct from `noteKey`, which carries capability notes (e.g. Lyria clip
    // length) unrelated to retirement.
    shutdownDate?: string;
    // Set only on entries in RETIRED_MODEL_DEFINITIONS. The id of the model that
    // replaces this retired one. When a history entry that used a retired model
    // is restored, the generation store substitutes this id so the user lands on
    // the supported successor. Generic across future retirements.
    replacementModelId?: string;
    // Whether to show the negative-prompt UI for this model. Default: false.
    // No model takes a dedicated parameter for it; the service appends a
    // "Do not include: ..." instruction to the prompt instead.
    supportsNegativePrompt?: boolean;
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
        // Quality tiers the model accepts. Declared on every OpenAI model so
        // the selector never offers a tier the API would reject (only the
        // GPT Image 2.5 models accept 'xhigh' / 'max').
        supportedQualities: OpenAIImageQuality[];
        // Sizes available when the image edit endpoint is used. When omitted,
        // edit mode reuses `supportedSizes` (i.e. no narrowing vs. generate).
        // Declare only when the edit endpoint accepts a strict subset — OpenAI
        // documents only the three recommended sizes for edits, while generate
        // additionally takes custom 2K / 4K dimensions.
        supportedEditSizes?: OpenAIImageSize[];
        // Whether the model accepts `background` (i.e. transparent output).
        // Declared false on models that reject the parameter outright.
        supportsBackground: boolean;
        // Whether the model accepts the `complexity` parameter. Default: false.
        supportsComplexity?: boolean;
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
        moderation: OpenAIModeration;
        // Set only for models that accept the complexity parameter.
        complexity?: OpenAIComplexity;
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
    // App-side model key (ModelDefinition.id) at generation time.
    model: string;
    // Model id actually sent to the provider API, i.e. the exact version that
    // produced this entry. Absent on entries recorded before it was captured.
    apiModelId?: string;
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
        // Populated only when the server returns a seed in the response. Never
        // set from the renderer.
        seed?: number;
        // Texts that the API returned alongside the audio (Lyria lyrics /
        // descriptions, TTS supplementary text). Displayed in the audio viewer.
        audioTexts?: string[];
        styleInstruction?: string;
        voice?: string;

        // --- Response metadata (stored only; not displayed) -------------------
        // generateContent diagnostics. Present only on entries made through
        // generateContent; kept so those JSON files stay typed.
        finishReason?: string;
        finishMessage?: string;
        safetyRatings?: Array<{ category?: string; probability?: string; blocked?: boolean }>;
        promptFeedback?: {
            blockReason?: string;
            blockReasonMessage?: string;
            safetyRatings?: Array<{ category?: string; probability?: string; blocked?: boolean }>;
        };
        // Token usage (Nano Banana, Gemini Omni Flash, Lyria, TTS).
        usageTokens?: {
            promptTokens?: number;
            candidatesTokens?: number;
            totalTokens?: number;
        };
        // Present only on entries made with the retired Imagen models.
        enhancedPrompt?: string;
        raiFilteredReason?: string;
        // The interaction id returned by interactions.create — recorded so a
        // conversational-edit flow could reference it via
        // previous_interaction_id.
        interactionId?: string;
        // Present only on entries made with the retired Veo models (long-running
        // operation name and metadata, RAI filter results). The metadata shape
        // is intentionally untyped.
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
        // Absent on entries made before the setting existed.
        moderation?: OpenAIModeration;
        complexity?: OpenAIComplexity;

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
        apiAppliedQuality?: OpenAIImageQuality;
        apiAppliedSize?: OpenAIImageSize;
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

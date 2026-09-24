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

// Video resolution (Veo / Gemini Omni Flash)
// '360p' is Gemini Omni Flash only; Veo starts at 720p. Per-model availability
// is declared via ModelDefinition.gemini.supportedResolutions.
export type GeminiVideoResolution = '360p' | '720p' | '1080p' | '4k';

// How attached images are used by a Veo request.
// 'firstFrame': the single attached image becomes the video's starting frame
//   (image-to-video). This is the default and the only mode Veo 3.1 Lite has.
// 'reference': up to 3 attached images guide the subject's appearance
//   (`referenceImages`, Veo 3.1 / Veo 3.1 Fast only). Requires an 8s duration.
export type GeminiVideoReferenceMode = 'firstFrame' | 'reference';

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

// Image quality. 'xhigh' / 'max' are GPT Image 2.5 (Sunburst / Flare) only;
// earlier GPT Image models stop at 'high'. Per-model availability is declared
// via ModelDefinition.openai.supportedQualities.
export type OpenAIImageQuality = 'low' | 'medium' | 'high' | 'xhigh' | 'max';
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
        // Cap on `referenceImages` (subject references) for a Veo model. Declared
        // only by models that accept them — Veo 3.1 and Veo 3.1 Fast. Distinct
        // from the top-level `maxReferenceImages`, which stays at 1 because the
        // default starting-frame mode is a single slot. Declaring this is what
        // makes the reference-mode toggle appear.
        maxSubjectReferenceImages?: number;
        supportsAudioTags?: boolean;
        // Which API a video model is served through. Omitted (default) means
        // the Veo predictLongRunning path (generateVideos + LRO polling).
        // 'interactions' routes to the Interactions API (interactions.create),
        // used by Gemini Omni Flash. Only meaningful when mediaType === 'video'
        // — image, music and voice models are always served by Interactions.
        videoApi?: 'interactions';
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
        // Video models only: how the attached images are used (starting frame
        // vs subject references). Omitted for every other media type.
        videoReferenceMode?: GeminiVideoReferenceMode;
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

// A destination inside the history directory that was handed out before the
// bytes existed, so a download can be streamed straight to its final location
// instead of going through a temporary file. `id` becomes the history entry id
// so the file name and the entry stay in step. Used by the Veo URI-delivery
// path; every other generator still returns buffers.
export type ReservedMediaFile = {
    id: string;
    path: string;
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
        videoReferenceMode?: GeminiVideoReferenceMode;
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
        // Interactions API (Gemini Omni Flash). The interaction id returned by
        // interactions.create — recorded so a future conversational-edit flow
        // could reference it via previous_interaction_id.
        interactionId?: string;
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

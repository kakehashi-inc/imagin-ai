import { create } from 'zustand';
import type {
    ApiErrorDetail,
    ApiProvider,
    GeminiAspectRatio,
    GeminiQuality,
    GeminiVideoDuration,
    GeminiVideoReferenceMode,
    GeminiVideoResolution,
    GenerationParams,
    GenerationProgress,
    OpenAIBackground,
    OpenAIImageQuality,
    OpenAIImageSize,
    OpenAIOutputFormat,
} from '../../shared/types';
import {
    DEFAULT_GEMINI_ASPECT_RATIO,
    DEFAULT_GEMINI_MODEL_ID,
    DEFAULT_GEMINI_QUALITY,
    DEFAULT_GEMINI_VIDEO_DURATION,
    DEFAULT_GEMINI_VIDEO_RESOLUTION,
    DEFAULT_NUMBER_OF_IMAGES,
    DEFAULT_OPENAI_BACKGROUND,
    DEFAULT_OPENAI_MODEL_ID,
    DEFAULT_OPENAI_OUTPUT_FORMAT,
    DEFAULT_OPENAI_QUALITY,
    DEFAULT_OPENAI_SIZE,
    GEMINI_TTS_DEFAULT_STYLE,
    GEMINI_TTS_DEFAULT_VOICE,
    GEMINI_TTS_STYLE_CUSTOM_ID,
    MODEL_DEFINITIONS,
    resolveMaxReferenceImages,
    resolveRestoreModelId,
} from '../../shared/constants';
import i18n from '../i18n/config';

type TtsStylePreset = { name: string; effect: string; instruction: string };

function getStyleInstructions(): string[] {
    const presets = i18n.t('gemini.tts.style.presets', { returnObjects: true }) as TtsStylePreset[];
    return Array.isArray(presets) ? presets.map(p => p.instruction) : [];
}

// =============================================================================
// State shape
// =============================================================================
// Provider-specific fields are nested into `gemini` / `openai` sub-objects so
// the two providers stay completely symmetric. Common fields (prompt, model,
// numberOfImages, references, editMode) sit at the top level.

type GeminiParamsState = {
    negativePrompt: string;
    aspectRatio: GeminiAspectRatio;
    quality: GeminiQuality;
    duration: GeminiVideoDuration;
    resolution: GeminiVideoResolution;
    // Video models only: whether attached images are the starting frame or
    // subject references. Ignored by every other media type.
    videoReferenceMode: GeminiVideoReferenceMode;
    styleSelection: string;
    styleInstruction: string;
    voice: string;
};

type OpenAIParamsState = {
    size: OpenAIImageSize;
    quality: OpenAIImageQuality;
    outputFormat: OpenAIOutputFormat;
    background: OpenAIBackground;
    negativePrompt: string;
};

type GenerationState = {
    provider: ApiProvider;
    model: string;
    prompt: string;
    numberOfImages: number;
    referenceImagePaths: string[];
    referenceImageThumbnails: Map<string, string>;
    editMode: boolean;
    gemini: GeminiParamsState;
    openai: OpenAIParamsState;
    isGenerating: boolean;
    generationProgress: GenerationProgress | null;
    error: ApiErrorDetail | null;

    // Actions
    setProvider: (provider: ApiProvider) => void;
    setModel: (model: string) => void;
    setPrompt: (prompt: string) => void;
    setNumberOfImages: (count: number) => void;
    setEditMode: (editMode: boolean) => void;

    // Gemini setters
    setGeminiNegativePrompt: (negativePrompt: string) => void;
    setGeminiAspectRatio: (aspectRatio: GeminiAspectRatio) => void;
    setGeminiQuality: (quality: GeminiQuality) => void;
    setGeminiDuration: (duration: GeminiVideoDuration) => void;
    setGeminiResolution: (resolution: GeminiVideoResolution) => void;
    setGeminiVideoReferenceMode: (mode: GeminiVideoReferenceMode) => void;
    setGeminiStyleSelection: (id: string) => void;
    setGeminiStyleInstruction: (instruction: string) => void;
    setGeminiVoice: (voice: string) => void;

    // OpenAI setters
    setOpenAISize: (size: OpenAIImageSize) => void;
    setOpenAIQuality: (quality: OpenAIImageQuality) => void;
    setOpenAIOutputFormat: (format: OpenAIOutputFormat) => void;
    setOpenAIBackground: (background: OpenAIBackground) => void;
    setOpenAINegativePrompt: (negativePrompt: string) => void;

    addReferenceImages: (paths: string[]) => void;
    removeReferenceImage: (path: string) => void;
    clearReferenceImages: () => void;
    setReferenceImageThumbnail: (path: string, dataUrl: string) => void;

    restoreParams: (params: Partial<GenerationParams>) => void;
    generate: () => Promise<void>;
    clearError: () => void;
};

// =============================================================================
// Initial state helpers
// =============================================================================

function initialGemini(): GeminiParamsState {
    return {
        negativePrompt: '',
        aspectRatio: DEFAULT_GEMINI_ASPECT_RATIO,
        quality: DEFAULT_GEMINI_QUALITY,
        duration: DEFAULT_GEMINI_VIDEO_DURATION,
        resolution: DEFAULT_GEMINI_VIDEO_RESOLUTION,
        videoReferenceMode: 'firstFrame',
        styleSelection: GEMINI_TTS_DEFAULT_STYLE,
        styleInstruction: GEMINI_TTS_DEFAULT_STYLE,
        voice: GEMINI_TTS_DEFAULT_VOICE,
    };
}

function initialOpenAI(): OpenAIParamsState {
    return {
        size: DEFAULT_OPENAI_SIZE,
        quality: DEFAULT_OPENAI_QUALITY,
        outputFormat: DEFAULT_OPENAI_OUTPUT_FORMAT,
        background: DEFAULT_OPENAI_BACKGROUND,
        negativePrompt: '',
    };
}

function firstModelIdForProvider(provider: ApiProvider): string {
    const preferred = provider === 'openai' ? DEFAULT_OPENAI_MODEL_ID : DEFAULT_GEMINI_MODEL_ID;
    return (
        MODEL_DEFINITIONS.find(m => m.id === preferred && m.provider === provider)?.id ||
        MODEL_DEFINITIONS.find(m => m.provider === provider)?.id ||
        ''
    );
}

const initialProvider: ApiProvider = 'gemini';
const initialModel = firstModelIdForProvider(initialProvider);

export const useGenerationStore = create<GenerationState>((set, get) => ({
    provider: initialProvider,
    model: initialModel,
    prompt: '',
    numberOfImages: DEFAULT_NUMBER_OF_IMAGES,
    referenceImagePaths: [],
    referenceImageThumbnails: new Map(),
    editMode: false,
    gemini: initialGemini(),
    openai: initialOpenAI(),
    isGenerating: false,
    generationProgress: null,
    error: null,

    setProvider: (provider: ApiProvider) => {
        const state = get();
        if (state.provider === provider) return;
        // When the active provider changes, the previously-selected model is
        // likely from the other provider; reset to the provider's default.
        const nextModelId = firstModelIdForProvider(provider);
        set({ provider, model: nextModelId });
        // Re-run setModel logic to align provider-specific defaults to the model.
        if (nextModelId) get().setModel(nextModelId);
    },

    setModel: (model: string) => {
        const modelDef = MODEL_DEFINITIONS.find(m => m.id === model);
        if (!modelDef) {
            set({ model });
            return;
        }
        const state = get();

        // Provider follows the model. Switching mid-flight is supported even
        // if the user picked a model from the other provider directly.
        const provider = modelDef.provider;

        // Clamp numberOfImages to the model's max.
        const numberOfImages = Math.min(state.numberOfImages, modelDef.maxImages ?? 1);

        // Provider-specific clamping. Each provider only mutates its own sub-state.
        let gemini = state.gemini;
        let openai = state.openai;
        if (provider === 'gemini') {
            const g = modelDef.gemini;
            const aspectRatio = g?.supportedAspectRatios?.includes(state.gemini.aspectRatio)
                ? state.gemini.aspectRatio
                : (g?.supportedAspectRatios?.[0] ?? DEFAULT_GEMINI_ASPECT_RATIO);
            const quality = g?.supportedQualities?.includes(state.gemini.quality)
                ? state.gemini.quality
                : (g?.supportedQualities?.[0] ?? DEFAULT_GEMINI_QUALITY);
            const duration = g?.supportedDurations?.includes(state.gemini.duration)
                ? state.gemini.duration
                : (g?.supportedDurations?.[0] ?? DEFAULT_GEMINI_VIDEO_DURATION);
            const resolution = g?.supportedResolutions?.includes(state.gemini.resolution)
                ? state.gemini.resolution
                : (g?.supportedResolutions?.[0] ?? DEFAULT_GEMINI_VIDEO_RESOLUTION);
            // Subject-reference mode only exists on models that declare a cap
            // for it (Veo 3.1 / Fast); everything else falls back to the single
            // starting-frame slot.
            const videoReferenceMode: GeminiVideoReferenceMode =
                state.gemini.videoReferenceMode === 'reference' && g?.maxSubjectReferenceImages
                    ? 'reference'
                    : 'firstFrame';
            gemini = { ...state.gemini, aspectRatio, quality, duration, resolution, videoReferenceMode };
        } else {
            const o = modelDef.openai;
            const size = o?.supportedSizes.includes(state.openai.size)
                ? state.openai.size
                : (o?.supportedSizes[0] ?? DEFAULT_OPENAI_SIZE);
            // xhigh / max only exist on GPT Image 2.5; snap back to the model's
            // cheapest tier when switching to a model that lacks the current one.
            const quality = o?.supportedQualities.includes(state.openai.quality)
                ? state.openai.quality
                : (o?.supportedQualities[0] ?? DEFAULT_OPENAI_QUALITY);
            // If the model doesn't support background, the UI hides it; we keep
            // the user's prior choice so it persists when switching back.
            openai = { ...state.openai, size, quality };
        }

        // Drop reference images that exceed the new model's cap. Models that
        // do not accept references at all drop everything.
        const maxRefs = resolveMaxReferenceImages(modelDef, {
            videoReferenceMode: provider === 'gemini' ? gemini.videoReferenceMode : undefined,
        });
        const cappedRefs = state.referenceImagePaths.slice(0, maxRefs);
        const cappedThumbs = new Map(state.referenceImageThumbnails);
        for (const p of state.referenceImagePaths.slice(maxRefs)) cappedThumbs.delete(p);

        // editMode only makes sense when there are references AND the model supports edit.
        const editMode = state.editMode && cappedRefs.length > 0 && Boolean(modelDef.supportsImageEdit);

        set({
            provider,
            model,
            numberOfImages,
            gemini,
            openai,
            referenceImagePaths: cappedRefs,
            referenceImageThumbnails: cappedThumbs,
            editMode,
        });
    },

    setPrompt: (prompt: string) => set({ prompt }),
    setNumberOfImages: (count: number) => set({ numberOfImages: count }),
    setEditMode: (editMode: boolean) => {
        // Edit mode operates on exactly one reference image — when enabling,
        // drop any extras (keep the first slot) so the request body never has
        // to truncate downstream.
        if (!editMode) {
            set({ editMode });
            return;
        }
        const state = get();
        if (state.referenceImagePaths.length <= 1) {
            set({ editMode });
            return;
        }
        const kept = state.referenceImagePaths[0];
        const newThumbnails = new Map<string, string>();
        const thumb = state.referenceImageThumbnails.get(kept);
        if (thumb !== undefined) newThumbnails.set(kept, thumb);
        set({
            editMode,
            referenceImagePaths: [kept],
            referenceImageThumbnails: newThumbnails,
        });
    },

    setGeminiNegativePrompt: (negativePrompt: string) => set(s => ({ gemini: { ...s.gemini, negativePrompt } })),
    setGeminiAspectRatio: (aspectRatio: GeminiAspectRatio) => set(s => ({ gemini: { ...s.gemini, aspectRatio } })),
    setGeminiQuality: (quality: GeminiQuality) => set(s => ({ gemini: { ...s.gemini, quality } })),
    setGeminiDuration: (duration: GeminiVideoDuration) => set(s => ({ gemini: { ...s.gemini, duration } })),
    setGeminiResolution: (resolution: GeminiVideoResolution) => set(s => ({ gemini: { ...s.gemini, resolution } })),
    setGeminiVideoReferenceMode: (mode: GeminiVideoReferenceMode) => {
        const state = get();
        const modelDef = MODEL_DEFINITIONS.find(m => m.id === state.model);
        // Switching back to the single starting-frame slot drops the extras so
        // the request body never carries more images than the mode allows.
        const maxRefs = resolveMaxReferenceImages(modelDef, { editMode: state.editMode, videoReferenceMode: mode });
        const cappedRefs = state.referenceImagePaths.slice(0, maxRefs);
        const cappedThumbs = new Map(state.referenceImageThumbnails);
        for (const p of state.referenceImagePaths.slice(maxRefs)) cappedThumbs.delete(p);
        set({
            gemini: { ...state.gemini, videoReferenceMode: mode },
            referenceImagePaths: cappedRefs,
            referenceImageThumbnails: cappedThumbs,
        });
    },

    setGeminiStyleSelection: (id: string) => {
        if (id === GEMINI_TTS_STYLE_CUSTOM_ID) {
            set(s => ({ gemini: { ...s.gemini, styleSelection: GEMINI_TTS_STYLE_CUSTOM_ID } }));
            return;
        }
        if (getStyleInstructions().includes(id)) {
            set(s => ({ gemini: { ...s.gemini, styleSelection: id, styleInstruction: id } }));
        }
    },
    setGeminiStyleInstruction: (instruction: string) => {
        const isPreset = getStyleInstructions().includes(instruction);
        set(s => ({
            gemini: {
                ...s.gemini,
                styleInstruction: instruction,
                styleSelection: isPreset ? instruction : GEMINI_TTS_STYLE_CUSTOM_ID,
            },
        }));
    },
    setGeminiVoice: (voice: string) => set(s => ({ gemini: { ...s.gemini, voice } })),

    setOpenAISize: (size: OpenAIImageSize) => set(s => ({ openai: { ...s.openai, size } })),
    setOpenAIQuality: (quality: OpenAIImageQuality) => set(s => ({ openai: { ...s.openai, quality } })),
    setOpenAIOutputFormat: (outputFormat: OpenAIOutputFormat) => set(s => ({ openai: { ...s.openai, outputFormat } })),
    setOpenAIBackground: (background: OpenAIBackground) => {
        // Transparent backgrounds require an alpha-capable format; the panel
        // re-renders with JPEG removed, but if the user already had JPEG
        // selected, snap them to PNG silently.
        set(s => {
            const next = { ...s.openai, background };
            if (background === 'transparent' && next.outputFormat === 'jpeg') {
                next.outputFormat = 'png';
            }
            return { openai: next };
        });
    },
    setOpenAINegativePrompt: (negativePrompt: string) => set(s => ({ openai: { ...s.openai, negativePrompt } })),

    addReferenceImages: (paths: string[]) => {
        const state = get();
        const modelDef = MODEL_DEFINITIONS.find(m => m.id === state.model);
        if (!modelDef?.supportsReferenceFile) return;
        // Edit mode forces a single-slot behavior regardless of model cap so
        // the request body never carries more than one reference. Veo in
        // subject-reference mode accepts up to its declared cap.
        const maxRefs = resolveMaxReferenceImages(modelDef, {
            editMode: state.editMode,
            videoReferenceMode: state.gemini.videoReferenceMode,
        });
        if (maxRefs <= 0) return;
        // Single-slot models (e.g. Veo's starting frame): latest attachment
        // overwrites the prior one; multi-slot models append uniquely.
        if (maxRefs === 1) {
            const next = paths[paths.length - 1];
            if (!next) return;
            set({ referenceImagePaths: [next], referenceImageThumbnails: new Map() });
            window.imaginai.getThumbnail(next).then(dataUrl => {
                if (dataUrl) get().setReferenceImageThumbnail(next, dataUrl);
            });
            return;
        }
        const existing = new Set(state.referenceImagePaths);
        const newPaths = paths.filter(p => !existing.has(p));
        const remainingSlots = Math.max(0, maxRefs - state.referenceImagePaths.length);
        const accepted = newPaths.slice(0, remainingSlots);
        if (accepted.length > 0) {
            set({ referenceImagePaths: [...state.referenceImagePaths, ...accepted] });
            for (const p of accepted) {
                window.imaginai.getThumbnail(p).then(dataUrl => {
                    if (dataUrl) get().setReferenceImageThumbnail(p, dataUrl);
                });
            }
        }
    },

    removeReferenceImage: (path: string) => {
        const state = get();
        const newThumbnails = new Map(state.referenceImageThumbnails);
        newThumbnails.delete(path);
        const nextRefs = state.referenceImagePaths.filter(p => p !== path);
        set({
            referenceImagePaths: nextRefs,
            referenceImageThumbnails: newThumbnails,
            // editMode auto-toggles off when attachments drop to zero.
            editMode: nextRefs.length === 0 ? false : state.editMode,
        });
    },

    clearReferenceImages: () => set({ referenceImagePaths: [], referenceImageThumbnails: new Map(), editMode: false }),

    setReferenceImageThumbnail: (path: string, dataUrl: string) => {
        const state = get();
        const newThumbnails = new Map(state.referenceImageThumbnails);
        newThumbnails.set(path, dataUrl);
        set({ referenceImageThumbnails: newThumbnails });
    },

    restoreParams: (params: Partial<GenerationParams>) => {
        const state = get();
        const provider = params.provider ?? state.provider;
        // A restored entry may reference a retired model (e.g. Imagen 4, which
        // shut down). Retired models are not selectable for generation, so map
        // them to their declared successor (Nano Banana 2 for Imagen 4). For
        // active models this is a no-op. Provider follows the resolved model.
        const requestedModel = params.model ?? state.model;
        const model = resolveRestoreModelId(requestedModel);
        const modelDef = MODEL_DEFINITIONS.find(m => m.id === model);
        const resolvedProvider = modelDef?.provider ?? provider;

        let gemini = state.gemini;
        if (params.gemini) {
            const g = params.gemini;
            // Clamp aspect ratio / quality against the resolved model so a
            // retired-model entry restored onto its successor never carries an
            // unsupported value. The successor may not expose the original
            // option set (no-op when it does).
            const gd = modelDef?.gemini;
            const aspectRatio =
                g.aspectRatio && (!gd?.supportedAspectRatios || gd.supportedAspectRatios.includes(g.aspectRatio))
                    ? g.aspectRatio
                    : (gd?.supportedAspectRatios?.[0] ?? state.gemini.aspectRatio);
            const quality =
                g.quality && (!gd?.supportedQualities || gd.supportedQualities.includes(g.quality))
                    ? g.quality
                    : (gd?.supportedQualities?.[0] ?? state.gemini.quality);
            gemini = {
                ...state.gemini,
                negativePrompt: g.negativePrompt ?? state.gemini.negativePrompt,
                aspectRatio,
                quality,
                duration: g.duration ?? state.gemini.duration,
                resolution: g.resolution ?? state.gemini.resolution,
                videoReferenceMode:
                    g.videoReferenceMode === 'reference' && modelDef?.gemini?.maxSubjectReferenceImages
                        ? 'reference'
                        : 'firstFrame',
                styleInstruction: g.styleInstruction ?? state.gemini.styleInstruction,
                styleSelection: g.styleInstruction
                    ? getStyleInstructions().includes(g.styleInstruction)
                        ? g.styleInstruction
                        : GEMINI_TTS_STYLE_CUSTOM_ID
                    : state.gemini.styleSelection,
                voice: g.voice ?? state.gemini.voice,
            };
        }

        let openai = state.openai;
        if (params.openai) {
            // Clamp size / quality against the resolved model, the same way the
            // Gemini branch above does: a retired-model entry restored onto its
            // successor must never carry a value that model would reject (e.g.
            // the `max` quality tier, which only GPT Image 2.5 accepts).
            const od = modelDef?.openai;
            const size =
                params.openai.size && (!od || od.supportedSizes.includes(params.openai.size))
                    ? params.openai.size
                    : (od?.supportedSizes[0] ?? state.openai.size);
            const quality =
                params.openai.quality && (!od || od.supportedQualities.includes(params.openai.quality))
                    ? params.openai.quality
                    : (od?.supportedQualities[0] ?? state.openai.quality);
            openai = { ...state.openai, ...params.openai, size, quality };
        }

        // Restore reference images: only swap when the source entry actually
        // carried them. The model may not accept references — setModel-style
        // clamping happens here so the new state never violates the model cap.
        const incomingRefs = params.referenceImagePaths ?? state.referenceImagePaths;
        const requestedEditMode = params.editMode ?? state.editMode;
        // Edit mode forces a single-slot behavior regardless of the model cap.
        const cap = resolveMaxReferenceImages(modelDef, {
            editMode: requestedEditMode,
            videoReferenceMode: gemini.videoReferenceMode,
        });
        const referenceImagePaths = incomingRefs.slice(0, cap);
        const referenceImageThumbnails = new Map<string, string>();
        for (const p of referenceImagePaths) {
            const existing = state.referenceImageThumbnails.get(p);
            if (existing) referenceImageThumbnails.set(p, existing);
        }
        // editMode requires both the model to support it AND at least one ref.
        const editMode = requestedEditMode && referenceImagePaths.length > 0 && Boolean(modelDef?.supportsImageEdit);

        // Clamp the image count to the resolved model's cap (the successor of a
        // retired model may allow fewer than the original).
        const requestedCount = params.numberOfImages ?? state.numberOfImages;
        const numberOfImages = Math.min(requestedCount, modelDef?.maxImages ?? 1);

        set({
            provider: resolvedProvider,
            model,
            prompt: params.prompt ?? state.prompt,
            numberOfImages,
            referenceImagePaths,
            referenceImageThumbnails,
            editMode,
            gemini,
            openai,
        });

        // Fetch any thumbnails we don't already have cached so the restored
        // attachments render in the panel after restore completes.
        for (const p of referenceImagePaths) {
            if (referenceImageThumbnails.has(p)) continue;
            window.imaginai.getThumbnail(p).then(dataUrl => {
                if (dataUrl) get().setReferenceImageThumbnail(p, dataUrl);
            });
        }
    },

    generate: async () => {
        const state = get();
        const modelDef = MODEL_DEFINITIONS.find(m => m.id === state.model);
        const isVideo = modelDef?.mediaType === 'video';

        set({ isGenerating: true, error: null, generationProgress: null });

        let unsubProgress: (() => void) | null = null;
        if (isVideo) {
            unsubProgress = window.imaginai.onGenerationProgress(progress => {
                set({ generationProgress: progress });
            });
        }

        try {
            // Build provider-specific sub-object. The renderer never collects a
            // seed (the SDK rejects it in Developer API mode); the server may
            // still return one and it flows into the history entry on the main
            // side via the response, not the request.
            let geminiSub: GenerationParams['gemini'] | undefined;
            if (state.provider === 'gemini') {
                const isVoiceModel = modelDef?.mediaType === 'voice';
                // Duration/resolution only apply to video models that actually
                // expose them: Veo has both, Omni Flash has resolution only
                // (clip length is prompt-controlled). Omitting what a model
                // doesn't accept keeps the request and the history entry honest.
                const hasDuration = isVideo && (modelDef?.gemini?.supportedDurations?.length ?? 0) > 0;
                const hasResolution = isVideo && (modelDef?.gemini?.supportedResolutions?.length ?? 0) > 0;
                // The reference mode is only meaningful for a video model that
                // can actually take subject references.
                const hasReferenceMode = isVideo && Boolean(modelDef?.gemini?.maxSubjectReferenceImages);
                geminiSub = {
                    negativePrompt: state.gemini.negativePrompt,
                    aspectRatio: state.gemini.aspectRatio,
                    quality: state.gemini.quality,
                    duration: hasDuration ? state.gemini.duration : undefined,
                    resolution: hasResolution ? state.gemini.resolution : undefined,
                    videoReferenceMode: hasReferenceMode ? state.gemini.videoReferenceMode : undefined,
                    styleInstruction: isVoiceModel ? state.gemini.styleInstruction : undefined,
                    voice: isVoiceModel ? state.gemini.voice : undefined,
                };
            }
            const openaiSub: GenerationParams['openai'] | undefined =
                state.provider === 'openai' ? { ...state.openai } : undefined;

            const params: GenerationParams = {
                provider: state.provider,
                model: state.model,
                prompt: state.prompt,
                numberOfImages: state.numberOfImages,
                referenceImagePaths: state.referenceImagePaths,
                editMode: state.editMode,
                gemini: geminiSub,
                openai: openaiSub,
            };

            const result = await window.imaginai.executeGeneration(params);
            if (!result.success) {
                set({ error: result.error });
                throw new Error('Generation failed');
            }
        } catch (err) {
            if (!get().error) {
                set({
                    error: {
                        httpStatus: 0,
                        apiCode: null,
                        apiStatus: null,
                        apiMessage: err instanceof Error ? err.message : String(err),
                    },
                });
            }
            throw err;
        } finally {
            unsubProgress?.();
            set({ isGenerating: false, generationProgress: null });
        }
    },

    clearError: () => set({ error: null }),
}));

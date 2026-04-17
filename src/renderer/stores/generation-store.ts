import { create } from 'zustand';
import type {
    AspectRatio,
    Quality,
    GenerationParams,
    GenerationProgress,
    ApiErrorDetail,
    VideoDuration,
    VideoResolution,
} from '../../shared/types';
import {
    DEFAULT_ASPECT_RATIO,
    DEFAULT_QUALITY,
    DEFAULT_NUMBER_OF_IMAGES,
    DEFAULT_MODEL_ID,
    DEFAULT_DURATION,
    DEFAULT_RESOLUTION,
    MODEL_DEFINITIONS,
    TTS_STYLE_CUSTOM_ID,
    TTS_DEFAULT_STYLE,
    TTS_DEFAULT_VOICE,
} from '../../shared/constants';
import i18n from '../i18n/config';

type TtsStylePreset = { name: string; effect: string; instruction: string };

function getStyleInstructions(): string[] {
    const presets = i18n.t('tts.style.presets', { returnObjects: true }) as TtsStylePreset[];
    return Array.isArray(presets) ? presets.map(p => p.instruction) : [];
}

type GenerationState = {
    model: string;
    prompt: string;
    negativePrompt: string;
    aspectRatio: AspectRatio;
    quality: Quality;
    numberOfImages: number;
    duration: VideoDuration;
    resolution: VideoResolution;
    seed: string;
    referenceImagePaths: string[];
    referenceImageThumbnails: Map<string, string>;
    // TTS-specific
    styleSelection: string; // preset id or TTS_STYLE_CUSTOM_ID
    styleInstruction: string;
    voice: string;
    isGenerating: boolean;
    generationProgress: GenerationProgress | null;
    error: ApiErrorDetail | null;
    // Actions
    setModel: (model: string) => void;
    setPrompt: (prompt: string) => void;
    setNegativePrompt: (negativePrompt: string) => void;
    setAspectRatio: (aspectRatio: AspectRatio) => void;
    setQuality: (quality: Quality) => void;
    setNumberOfImages: (count: number) => void;
    setDuration: (duration: VideoDuration) => void;
    setResolution: (resolution: VideoResolution) => void;
    setSeed: (seed: string) => void;
    addReferenceImages: (paths: string[]) => void;
    removeReferenceImage: (path: string) => void;
    clearReferenceImages: () => void;
    setReferenceImageThumbnail: (path: string, dataUrl: string) => void;
    setStyleSelection: (id: string) => void;
    setStyleInstruction: (instruction: string) => void;
    setVoice: (voice: string) => void;
    restoreParams: (params: Partial<GenerationParams>) => void;
    generate: () => Promise<void>;
    clearError: () => void;
};

function initialStyleInstruction(): string {
    return TTS_DEFAULT_STYLE;
}

const defaultModel = MODEL_DEFINITIONS.find(m => m.id === DEFAULT_MODEL_ID)?.id || MODEL_DEFINITIONS[0]?.id || '';

export const useGenerationStore = create<GenerationState>((set, get) => ({
    model: defaultModel,
    prompt: '',
    negativePrompt: '',
    aspectRatio: DEFAULT_ASPECT_RATIO,
    quality: DEFAULT_QUALITY,
    numberOfImages: DEFAULT_NUMBER_OF_IMAGES,
    duration: DEFAULT_DURATION,
    resolution: DEFAULT_RESOLUTION,
    seed: '',
    referenceImagePaths: [],
    referenceImageThumbnails: new Map(),
    styleSelection: TTS_DEFAULT_STYLE,
    styleInstruction: initialStyleInstruction(),
    voice: TTS_DEFAULT_VOICE,
    isGenerating: false,
    generationProgress: null,
    error: null,

    setModel: (model: string) => {
        const modelDef = MODEL_DEFINITIONS.find(m => m.id === model);
        if (!modelDef) {
            set({ model });
            return;
        }
        const state = get();
        const aspectRatio = modelDef.supportedAspectRatios.includes(state.aspectRatio)
            ? state.aspectRatio
            : (modelDef.supportedAspectRatios[0] as AspectRatio) || DEFAULT_ASPECT_RATIO;
        const quality = modelDef.supportedQualities?.includes(state.quality)
            ? state.quality
            : (modelDef.supportedQualities?.[0] as Quality) || DEFAULT_QUALITY;
        const numberOfImages = Math.min(state.numberOfImages, modelDef.maxImages ?? 1);

        // Set video defaults when switching to/from video models
        const duration = modelDef.supportedDurations?.includes(state.duration)
            ? state.duration
            : (modelDef.supportedDurations?.[0] ?? DEFAULT_DURATION);
        const resolution = modelDef.supportedResolutions?.includes(state.resolution)
            ? state.resolution
            : (modelDef.supportedResolutions?.[0] ?? DEFAULT_RESOLUTION);

        set({ model, aspectRatio, quality, numberOfImages, duration, resolution });
    },

    setPrompt: (prompt: string) => set({ prompt }),
    setNegativePrompt: (negativePrompt: string) => set({ negativePrompt }),
    setAspectRatio: (aspectRatio: AspectRatio) => set({ aspectRatio }),
    setQuality: (quality: Quality) => set({ quality }),
    setNumberOfImages: (count: number) => set({ numberOfImages: count }),
    setDuration: (duration: VideoDuration) => set({ duration }),
    setResolution: (resolution: VideoResolution) => set({ resolution }),
    setSeed: (seed: string) => set({ seed }),
    addReferenceImages: (paths: string[]) => {
        const state = get();
        const existing = new Set(state.referenceImagePaths);
        const newPaths = paths.filter(p => !existing.has(p));
        if (newPaths.length > 0) {
            set({ referenceImagePaths: [...state.referenceImagePaths, ...newPaths] });
            for (const p of newPaths) {
                window.imaginai.getThumbnail(p).then(dataUrl => {
                    if (dataUrl) {
                        get().setReferenceImageThumbnail(p, dataUrl);
                    }
                });
            }
        }
    },

    removeReferenceImage: (path: string) => {
        const state = get();
        const newThumbnails = new Map(state.referenceImageThumbnails);
        newThumbnails.delete(path);
        set({
            referenceImagePaths: state.referenceImagePaths.filter(p => p !== path),
            referenceImageThumbnails: newThumbnails,
        });
    },

    clearReferenceImages: () => set({ referenceImagePaths: [], referenceImageThumbnails: new Map() }),

    setReferenceImageThumbnail: (path: string, dataUrl: string) => {
        const state = get();
        const newThumbnails = new Map(state.referenceImageThumbnails);
        newThumbnails.set(path, dataUrl);
        set({ referenceImageThumbnails: newThumbnails });
    },

    setStyleSelection: (id: string) => {
        if (id === TTS_STYLE_CUSTOM_ID) {
            set({ styleSelection: TTS_STYLE_CUSTOM_ID });
            return;
        }
        if (getStyleInstructions().includes(id)) {
            set({ styleSelection: id, styleInstruction: id });
        }
    },

    setStyleInstruction: (instruction: string) => {
        const isPreset = getStyleInstructions().includes(instruction);
        set({
            styleInstruction: instruction,
            styleSelection: isPreset ? instruction : TTS_STYLE_CUSTOM_ID,
        });
    },

    setVoice: (voice: string) => set({ voice }),

    restoreParams: (params: Partial<GenerationParams>) => {
        const nextStyleInstruction =
            params.styleInstruction !== undefined ? params.styleInstruction : get().styleInstruction;
        set({
            model: params.model ?? get().model,
            prompt: params.prompt ?? get().prompt,
            negativePrompt: params.negativePrompt ?? get().negativePrompt,
            aspectRatio: params.aspectRatio ?? get().aspectRatio,
            quality: params.quality ?? get().quality,
            numberOfImages: params.numberOfImages ?? get().numberOfImages,
            duration: params.duration ?? get().duration,
            resolution: params.resolution ?? get().resolution,
            seed: params.seed != null ? String(params.seed) : '',
            referenceImagePaths: [],
            referenceImageThumbnails: new Map(),
            styleInstruction: nextStyleInstruction,
            styleSelection: getStyleInstructions().includes(nextStyleInstruction)
                ? nextStyleInstruction
                : TTS_STYLE_CUSTOM_ID,
            voice: params.voice ?? get().voice,
        });
    },

    generate: async () => {
        const state = get();
        const modelDef = MODEL_DEFINITIONS.find(m => m.id === state.model);
        const isVideo = modelDef?.mediaType === 'video';
        const isTts = modelDef?.apiEndpoint === 'generateContentTTS';

        set({ isGenerating: true, error: null, generationProgress: null });

        // Subscribe to progress events for video generation
        let unsubProgress: (() => void) | null = null;
        if (isVideo) {
            unsubProgress = window.imaginai.onGenerationProgress(progress => {
                set({ generationProgress: progress });
            });
        }

        try {
            // Auto-generate seed for video models when not specified (API does not return seed)
            let seedValue: number | undefined;
            if (isVideo) {
                seedValue = state.seed ? parseInt(state.seed, 10) || undefined : undefined;
                if (seedValue == null) {
                    seedValue = Math.floor(Math.random() * 4294967296);
                    set({ seed: String(seedValue) });
                }
            }

            const params: GenerationParams = {
                model: state.model,
                prompt: state.prompt,
                negativePrompt: state.negativePrompt,
                aspectRatio: state.aspectRatio,
                quality: state.quality,
                numberOfImages: state.numberOfImages,
                referenceImagePaths: state.referenceImagePaths,
                duration: isVideo ? state.duration : undefined,
                resolution: isVideo ? state.resolution : undefined,
                seed: seedValue,
                styleInstruction: isTts ? state.styleInstruction : undefined,
                voice: isTts ? state.voice : undefined,
            };

            const result = await window.imaginai.executeGeneration(params);
            if (!result.success) {
                set({ error: result.error });
                throw new Error('Generation failed');
            }
        } catch (err) {
            // If error is not already set (structured error from API), set a generic one
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

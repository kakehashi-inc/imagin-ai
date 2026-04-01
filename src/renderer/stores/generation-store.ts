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
} from '../../shared/constants';

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
    restoreParams: (params: Partial<GenerationParams>) => void;
    generate: () => Promise<void>;
    clearError: () => void;
};

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

    restoreParams: (params: Partial<GenerationParams>) => {
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
        });
    },

    generate: async () => {
        const state = get();
        const modelDef = MODEL_DEFINITIONS.find(m => m.id === state.model);
        const isVideo = modelDef?.mediaType === 'video';

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

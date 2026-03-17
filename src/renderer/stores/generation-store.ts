import { create } from 'zustand';
import type { AspectRatio, Quality, OutputMimeType, SafetyFilterLevel, GenerationParams } from '../../shared/types';
import {
    DEFAULT_ASPECT_RATIO,
    DEFAULT_QUALITY,
    DEFAULT_OUTPUT_MIME_TYPE,
    DEFAULT_SAFETY_FILTER_LEVEL,
    DEFAULT_NUMBER_OF_IMAGES,
    MODEL_DEFINITIONS,
} from '../../shared/constants';

type GenerationState = {
    model: string;
    prompt: string;
    negativePrompt: string;
    aspectRatio: AspectRatio;
    quality: Quality;
    numberOfImages: number;
    outputMimeType: OutputMimeType;
    safetyFilterLevel: SafetyFilterLevel;
    referenceImagePaths: string[];
    referenceImageThumbnails: Map<string, string>;
    isGenerating: boolean;
    error: string | null;
    // Actions
    setModel: (model: string) => void;
    setPrompt: (prompt: string) => void;
    setNegativePrompt: (negativePrompt: string) => void;
    setAspectRatio: (aspectRatio: AspectRatio) => void;
    setQuality: (quality: Quality) => void;
    setNumberOfImages: (count: number) => void;
    setOutputMimeType: (mimeType: OutputMimeType) => void;
    setSafetyFilterLevel: (level: SafetyFilterLevel) => void;
    addReferenceImages: (paths: string[]) => void;
    removeReferenceImage: (path: string) => void;
    clearReferenceImages: () => void;
    setReferenceImageThumbnail: (path: string, dataUrl: string) => void;
    restoreParams: (params: Partial<GenerationParams>) => void;
    generate: () => Promise<void>;
    clearError: () => void;
};

const defaultModel = MODEL_DEFINITIONS.length > 0 ? MODEL_DEFINITIONS[0].id : '';

export const useGenerationStore = create<GenerationState>((set, get) => ({
    model: defaultModel,
    prompt: '',
    negativePrompt: '',
    aspectRatio: DEFAULT_ASPECT_RATIO,
    quality: DEFAULT_QUALITY,
    numberOfImages: DEFAULT_NUMBER_OF_IMAGES,
    outputMimeType: DEFAULT_OUTPUT_MIME_TYPE,
    safetyFilterLevel: DEFAULT_SAFETY_FILTER_LEVEL,
    referenceImagePaths: [],
    referenceImageThumbnails: new Map(),
    isGenerating: false,
    error: null,

    setModel: (model: string) => {
        const modelDef = MODEL_DEFINITIONS.find(m => m.id === model);
        if (!modelDef) {
            set({ model });
            return;
        }
        const state = get();
        // Reset aspect ratio if not supported
        const aspectRatio = modelDef.supportedAspectRatios.includes(state.aspectRatio)
            ? state.aspectRatio
            : (modelDef.supportedAspectRatios[0] as AspectRatio) || DEFAULT_ASPECT_RATIO;
        // Reset quality if not supported
        const quality = modelDef.supportedQualities.includes(state.quality)
            ? state.quality
            : (modelDef.supportedQualities[0] as Quality) || DEFAULT_QUALITY;
        set({ model, aspectRatio, quality });
    },

    setPrompt: (prompt: string) => set({ prompt }),
    setNegativePrompt: (negativePrompt: string) => set({ negativePrompt }),
    setAspectRatio: (aspectRatio: AspectRatio) => set({ aspectRatio }),
    setQuality: (quality: Quality) => set({ quality }),
    setNumberOfImages: (count: number) => set({ numberOfImages: count }),
    setOutputMimeType: (mimeType: OutputMimeType) => set({ outputMimeType: mimeType }),
    setSafetyFilterLevel: (level: SafetyFilterLevel) => set({ safetyFilterLevel: level }),

    addReferenceImages: (paths: string[]) => {
        const state = get();
        const existing = new Set(state.referenceImagePaths);
        const newPaths = paths.filter(p => !existing.has(p));
        if (newPaths.length > 0) {
            set({ referenceImagePaths: [...state.referenceImagePaths, ...newPaths] });
            // Load thumbnails for new images
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
            outputMimeType: params.outputMimeType ?? get().outputMimeType,
            safetyFilterLevel: params.safetyFilterLevel ?? get().safetyFilterLevel,
        });
    },

    generate: async () => {
        const state = get();
        set({ isGenerating: true, error: null });

        try {
            const params: GenerationParams = {
                model: state.model,
                prompt: state.prompt,
                negativePrompt: state.negativePrompt,
                aspectRatio: state.aspectRatio,
                quality: state.quality,
                numberOfImages: state.numberOfImages,
                outputMimeType: state.outputMimeType,
                safetyFilterLevel: state.safetyFilterLevel,
                referenceImagePaths: state.referenceImagePaths,
            };

            await window.imaginai.executeGeneration(params);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            set({ error: message });
            throw err;
        } finally {
            set({ isGenerating: false });
        }
    },

    clearError: () => set({ error: null }),
}));

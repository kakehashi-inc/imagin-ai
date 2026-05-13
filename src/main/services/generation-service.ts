import type { GenerationParams, HistoryEntry } from '../../shared/types';
import { getActiveApiKey, getActiveProvider } from './api-key-service';
import { GeminiApiError, generateWithGemini } from './gemini-service';
import { OpenAIApiError, generateWithOpenAI } from './openai-service';

// Public re-exports so IPC handlers don't have to know which provider's error
// class they're catching — they can `instanceof` either type.
export { GeminiApiError } from './gemini-service';
export { OpenAIApiError } from './openai-service';

// Per-buffer metadata, indexed identically to `buffers`. Exactly one of
// `gemini` / `openai` is set per entry depending on the active provider. The
// shapes are partials of the corresponding HistoryEntry sub-object so the
// history layer can merge them in without any field mapping.
export type GenerationItemMeta = {
    gemini?: Partial<NonNullable<HistoryEntry['gemini']>>;
    openai?: Partial<NonNullable<HistoryEntry['openai']>>;
};

// Top-level generation entry point. Dispatches by `params.provider` and pulls
// the active API key for that provider. Provider-specific services handle
// model-family dispatch (image / video / music / voice for Gemini; generate /
// edit for OpenAI) and own their error normalization.
export async function generateImages(params: GenerationParams): Promise<{
    buffers: Buffer[];
    mimeType: string;
    audioTexts?: string[];
    perItemMeta?: GenerationItemMeta[];
}> {
    const provider = params.provider ?? getActiveProvider();
    const apiKey = getActiveApiKey();

    if (!apiKey) {
        // Mirror the previous behavior: surface this as a Gemini-shaped error
        // when no key is configured at all, since the legacy error path used it.
        // Either provider error class is fine here because the renderer reads
        // .detail.apiStatus, not the constructor name.
        throw new GeminiApiError({
            httpStatus: 0,
            apiCode: null,
            apiStatus: 'API_KEY_NOT_SET',
            apiMessage: null,
        });
    }

    if (provider === 'openai') {
        const result = await generateWithOpenAI(params, apiKey);
        return {
            buffers: result.buffers,
            mimeType: result.mimeType,
            perItemMeta: result.perItemMeta?.map(meta => ({ openai: meta })),
        };
    }
    const result = await generateWithGemini(params, apiKey);
    return {
        buffers: result.buffers,
        mimeType: result.mimeType,
        audioTexts: result.audioTexts,
        perItemMeta: result.perItemMeta?.map(meta => ({ gemini: meta })),
    };
}

// Re-export the progress callback registration so the IPC layer can plug in
// renderer-bound progress updates without importing gemini-service directly.
export { setGenerationProgressCallback } from './gemini-service';

// Convenience for catch handlers in the IPC layer: returns true for any
// known provider API error.
export function isProviderApiError(err: unknown): err is GeminiApiError | OpenAIApiError {
    return err instanceof GeminiApiError || err instanceof OpenAIApiError;
}

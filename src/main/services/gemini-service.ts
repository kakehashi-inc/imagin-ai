import fs from 'fs';
import os from 'os';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import type { Image as GenAiImage, GeneratedImage, GenerateVideosOperation, Part } from '@google/genai';
import type {
    ApiErrorDetail,
    GeminiQuality,
    GenerationParams,
    GenerationProgress,
    HistoryEntry,
} from '../../shared/types';

// Per-call metadata that we capture from the API response and persist on the
// history entry. Shaped as a partial of HistoryEntry.gemini so history-service
// can just spread it into the entry without any field-by-field mapping.
type GeminiResponseMeta = Partial<NonNullable<HistoryEntry['gemini']>>;
import { MODEL_DEFINITIONS, REFERENCE_IMAGE_JPEG_QUALITY, REFERENCE_IMAGE_MAX_LONG_EDGE } from '../../shared/constants';
import { encodePcmToMp3, wrapPcmAsWav } from './ffmpeg-service';

// =============================================================================
// Errors
// =============================================================================

// Carries the structured error detail used by the renderer's error panel.
export class GeminiApiError extends Error {
    constructor(public readonly detail: ApiErrorDetail) {
        super(`HTTP ${detail.httpStatus}: ${detail.apiStatus ?? 'UNKNOWN'} - ${detail.apiMessage ?? ''}`);
    }
}

// SDK error -> ApiErrorDetail. The SDK throws plain Error objects for HTTP
// failures; the response body (if JSON) is embedded in the message. We extract
// it best-effort so the error panel can show the API status/code.
function toApiErrorDetail(err: unknown): ApiErrorDetail {
    const message = err instanceof Error ? err.message : String(err);
    // Try to recover structured fields from a stringified JSON body within the message.
    const jsonMatch = message.match(/\{[\s\S]*"error"[\s\S]*\}/);
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(jsonMatch[0]);
            const apiErr = parsed?.error;
            if (apiErr && typeof apiErr === 'object') {
                return {
                    httpStatus: typeof apiErr.code === 'number' ? apiErr.code : 0,
                    apiCode: typeof apiErr.code === 'number' ? apiErr.code : null,
                    apiStatus: typeof apiErr.status === 'string' ? apiErr.status : null,
                    apiMessage: typeof apiErr.message === 'string' ? apiErr.message : message,
                };
            }
        } catch {
            // fall through
        }
    }
    // Pattern match an HTTP status from the message ("got status: 401 ...").
    const statusMatch = message.match(/status[:\s]+(\d{3})/i);
    return {
        httpStatus: statusMatch ? Number(statusMatch[1]) : 0,
        apiCode: null,
        apiStatus: null,
        apiMessage: message,
    };
}

function asGeminiApiError(err: unknown): GeminiApiError {
    if (err instanceof GeminiApiError) return err;
    return new GeminiApiError(toApiErrorDetail(err));
}

// Application-level error (no underlying HTTP response). Diagnostic message is
// surfaced in the error panel so the user can see refusals / RAI reasons / etc.
function appError(statusKey: string, diagnostic?: string): GeminiApiError {
    return new GeminiApiError({
        httpStatus: 0,
        apiCode: null,
        apiStatus: statusKey,
        apiMessage: diagnostic && diagnostic.length > 0 ? diagnostic : null,
    });
}

// =============================================================================
// Diagnostics (RAI / safety / refusal text extraction)
// =============================================================================

// Format the human-readable diagnostic from a generateContent response. Mirrors
// the previous fetch-based service so the error panel keeps the same UX.
function formatContentDiagnostics(resp: {
    candidates?: ReadonlyArray<{
        finishReason?: string;
        finishMessage?: string;
        safetyRatings?: ReadonlyArray<{ category?: string; probability?: string; blocked?: boolean }>;
        content?: { parts?: ReadonlyArray<{ text?: string }> };
    }>;
    promptFeedback?: {
        blockReason?: string;
        blockReasonMessage?: string;
        safetyRatings?: ReadonlyArray<{ category?: string; probability?: string; blocked?: boolean }>;
    };
}): string {
    const lines: string[] = [];
    if (resp.promptFeedback?.blockReason) {
        const reason = resp.promptFeedback.blockReason;
        const msg = resp.promptFeedback.blockReasonMessage;
        lines.push(msg ? `promptFeedback.blockReason: ${reason} (${msg})` : `promptFeedback.blockReason: ${reason}`);
    }
    if (resp.promptFeedback?.safetyRatings) {
        const blocked = resp.promptFeedback.safetyRatings.filter(r => r.blocked);
        if (blocked.length > 0) {
            lines.push(
                `promptFeedback.safetyRatings (blocked): ${blocked
                    .map(r => `${r.category}=${r.probability}`)
                    .join(', ')}`
            );
        }
    }
    if (resp.candidates) {
        resp.candidates.forEach((c, i) => {
            if (c.finishReason && c.finishReason !== 'STOP') {
                const fm = c.finishMessage;
                lines.push(
                    fm
                        ? `candidate[${i}].finishReason: ${c.finishReason} (${fm})`
                        : `candidate[${i}].finishReason: ${c.finishReason}`
                );
            }
            if (c.safetyRatings) {
                const blocked = c.safetyRatings.filter(r => r.blocked);
                if (blocked.length > 0) {
                    lines.push(
                        `candidate[${i}].safetyRatings (blocked): ${blocked
                            .map(r => `${r.category}=${r.probability}`)
                            .join(', ')}`
                    );
                }
            }
            if (c.content?.parts) {
                for (const p of c.content.parts) {
                    if (p.text && p.text.trim().length > 0) {
                        lines.push(`candidate[${i}].text: ${p.text.trim()}`);
                    }
                }
            }
        });
    }
    return lines.join('\n');
}

// Extract diagnostic + usage metadata from a generateContent response into the
// shape we persist on the history entry. Only fields actually present in the
// response are emitted; otherwise nothing is set so the JSON stays minimal.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractContentResponseMeta(response: any): GeminiResponseMeta {
    const meta: GeminiResponseMeta = {};

    const firstCandidate = response?.candidates?.[0];
    if (firstCandidate) {
        if (typeof firstCandidate.finishReason === 'string' && firstCandidate.finishReason !== 'STOP') {
            meta.finishReason = firstCandidate.finishReason;
        }
        if (typeof firstCandidate.finishMessage === 'string' && firstCandidate.finishMessage.length > 0) {
            meta.finishMessage = firstCandidate.finishMessage;
        }
        if (Array.isArray(firstCandidate.safetyRatings)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const blocked = firstCandidate.safetyRatings.filter((r: any) => r?.blocked);
            if (blocked.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                meta.safetyRatings = blocked.map((r: any) => ({
                    category: typeof r.category === 'string' ? r.category : undefined,
                    probability: typeof r.probability === 'string' ? r.probability : undefined,
                    blocked: r.blocked === true,
                }));
            }
        }
    }

    const pf = response?.promptFeedback;
    if (
        pf &&
        (pf.blockReason || pf.blockReasonMessage || (Array.isArray(pf.safetyRatings) && pf.safetyRatings.length > 0))
    ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const blocked = Array.isArray(pf.safetyRatings) ? pf.safetyRatings.filter((r: any) => r?.blocked) : [];
        meta.promptFeedback = {
            blockReason: typeof pf.blockReason === 'string' ? pf.blockReason : undefined,
            blockReasonMessage: typeof pf.blockReasonMessage === 'string' ? pf.blockReasonMessage : undefined,
            safetyRatings:
                blocked.length > 0
                    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      blocked.map((r: any) => ({
                          category: typeof r.category === 'string' ? r.category : undefined,
                          probability: typeof r.probability === 'string' ? r.probability : undefined,
                          blocked: r.blocked === true,
                      }))
                    : undefined,
        };
    }

    const um = response?.usageMetadata;
    if (
        um &&
        (typeof um.promptTokenCount === 'number' ||
            typeof um.candidatesTokenCount === 'number' ||
            typeof um.totalTokenCount === 'number')
    ) {
        meta.usageTokens = {
            promptTokens: typeof um.promptTokenCount === 'number' ? um.promptTokenCount : undefined,
            candidatesTokens: typeof um.candidatesTokenCount === 'number' ? um.candidatesTokenCount : undefined,
            totalTokens: typeof um.totalTokenCount === 'number' ? um.totalTokenCount : undefined,
        };
    }

    return meta;
}

// =============================================================================
// Reference image preprocessing (decode -> downscale -> JPEG re-encode)
// =============================================================================

// Decodes a reference image (any format supported by Electron's nativeImage),
// downscales it so the long edge is <= REFERENCE_IMAGE_MAX_LONG_EDGE while
// preserving aspect ratio, then re-encodes as JPEG. Returning a single
// canonical format keeps request payloads bounded regardless of source.
function prepareReferenceImage(imgPath: string): { mimeType: string; base64: string } | null {
    try {
        const raw = fs.readFileSync(imgPath);
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { nativeImage } = require('electron');
        let img = nativeImage.createFromBuffer(raw);
        if (img.isEmpty()) return null;
        const size = img.getSize();
        const longEdge = Math.max(size.width, size.height);
        if (longEdge > REFERENCE_IMAGE_MAX_LONG_EDGE) {
            const scale = REFERENCE_IMAGE_MAX_LONG_EDGE / longEdge;
            img = img.resize({
                width: Math.round(size.width * scale),
                height: Math.round(size.height * scale),
                quality: 'best',
            });
        }
        const jpeg = img.toJPEG(REFERENCE_IMAGE_JPEG_QUALITY);
        return { mimeType: 'image/jpeg', base64: jpeg.toString('base64') };
    } catch (err) {
        console.warn(`Failed to prepare reference image: ${imgPath}`, err);
        return null;
    }
}

// =============================================================================
// Progress callback (consumed by Veo polling loop)
// =============================================================================

let progressCallback: ((progress: GenerationProgress) => void) | null = null;

export function setGenerationProgressCallback(cb: ((progress: GenerationProgress) => void) | null): void {
    progressCallback = cb;
}

// =============================================================================
// Top-level entry point (Gemini only — provider dispatch lives in generation-service.ts)
// =============================================================================

// Dispatches by mediaType. For images, the model id prefix disambiguates Imagen
// (`imagen-*`, predict / generateImages) from Gemini image generateContent.
// `perItemMeta` is parallel to `buffers` — one metadata bag per generated
// artifact, persisted onto the corresponding history entry. The metadata is a
// partial of HistoryEntry.gemini so history-service can spread it directly.
export async function generateWithGemini(
    params: GenerationParams,
    apiKey: string
): Promise<{
    buffers: Buffer[];
    mimeType: string;
    audioTexts?: string[];
    perItemMeta?: GeminiResponseMeta[];
}> {
    const ai = new GoogleGenAI({ apiKey });
    const modelDef = MODEL_DEFINITIONS.find(m => m.id === params.model);
    if (!modelDef) throw appError('UNKNOWN_MODEL', `Unknown model: ${params.model}`);

    try {
        switch (modelDef.mediaType) {
            case 'video':
                return await generateVideo(ai, params);
            case 'music':
                return await generateMusic(ai, params);
            case 'voice':
                return await generateSpeech(ai, params);
            case 'image':
            default:
                return params.model.startsWith('imagen-')
                    ? await generateImagen(ai, params)
                    : await generateGeminiImage(ai, params);
        }
    } catch (err) {
        throw asGeminiApiError(err);
    }
}

// =============================================================================
// Imagen (text-to-image, predict API via SDK's generateImages)
// =============================================================================

function mapGeminiQualityToSdkImageSize(q: GeminiQuality | undefined): string | undefined {
    if (!q) return undefined;
    if (q === '512px') return '512px';
    if (q === '1k') return '1K';
    if (q === '2k') return '2K';
    if (q === '4k') return '4K';
    return undefined;
}

async function generateImagen(
    ai: GoogleGenAI,
    params: GenerationParams
): Promise<{ buffers: Buffer[]; mimeType: string; perItemMeta: GeminiResponseMeta[] }> {
    const g = params.gemini;
    if (!g) throw appError('INVALID_PARAMS', 'Gemini params missing for Imagen request');

    const modelDef = MODEL_DEFINITIONS.find(m => m.id === params.model);
    const apiNegative = modelDef?.apiNegativePrompt ?? false;

    let promptText = params.prompt;
    if (g.negativePrompt && !apiNegative) {
        promptText += `\n\nDo not include: ${g.negativePrompt}`;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = {
        numberOfImages: params.numberOfImages,
        aspectRatio: g.aspectRatio,
    };
    if ((modelDef?.gemini?.supportedQualities?.length ?? 0) > 0) {
        const sdkImageSize = mapGeminiQualityToSdkImageSize(g.quality);
        if (sdkImageSize) config.imageSize = sdkImageSize;
    }
    if (apiNegative && g.negativePrompt) {
        config.negativePrompt = g.negativePrompt;
    }

    const response = await ai.models.generateImages({
        model: params.model,
        prompt: promptText,
        config,
    });

    const generated = response.generatedImages ?? [];
    if (generated.length === 0) {
        throw appError('NO_IMAGES_GENERATED');
    }

    // Walk the response in order. For each entry that yielded image bytes we
    // produce one buffer and one metadata bag so they stay index-aligned for
    // history-service. Entries that came back without bytes (e.g. RAI-filtered
    // ones) contribute only to filterReasons used in the "all filtered" path.
    const buffers: Buffer[] = [];
    const perItemMeta: GeminiResponseMeta[] = [];
    const filterReasons: string[] = [];
    generated.forEach((g: GeneratedImage, i: number) => {
        const bytes = g.image?.imageBytes;
        if (bytes) {
            buffers.push(Buffer.from(bytes, 'base64'));
            const meta: GeminiResponseMeta = {};
            if (typeof g.enhancedPrompt === 'string' && g.enhancedPrompt.length > 0) {
                meta.enhancedPrompt = g.enhancedPrompt;
            }
            if (typeof g.raiFilteredReason === 'string' && g.raiFilteredReason.length > 0) {
                meta.raiFilteredReason = g.raiFilteredReason;
            }
            perItemMeta.push(meta);
        } else if (g.raiFilteredReason) {
            filterReasons.push(`prediction[${i}].raiFilteredReason: ${g.raiFilteredReason}`);
        }
    });
    if (buffers.length === 0) {
        throw appError('NO_IMAGES_GENERATED', filterReasons.join('\n'));
    }
    return { buffers, mimeType: 'image/png', perItemMeta };
}

// =============================================================================
// Gemini Image (Nano Banana — generateContent API via SDK)
// =============================================================================

async function generateGeminiImage(
    ai: GoogleGenAI,
    params: GenerationParams
): Promise<{ buffers: Buffer[]; mimeType: string; perItemMeta: GeminiResponseMeta[] }> {
    const g = params.gemini;
    if (!g) throw appError('INVALID_PARAMS', 'Gemini params missing for image generation');

    const modelDef = MODEL_DEFINITIONS.find(m => m.id === params.model);
    const apiNegative = modelDef?.apiNegativePrompt ?? false;
    // Edit mode is fixed to a single reference image across all providers;
    // otherwise honor the model's declared reference cap.
    const maxRefs = params.editMode ? 1 : modelDef?.supportsReferenceFile ? (modelDef.maxReferenceImages ?? 0) : 0;

    const parts: Part[] = [];

    // Reference images (image-to-image / image-edit). Capped per model.
    if (maxRefs > 0 && params.referenceImagePaths.length > 0) {
        const capped = params.referenceImagePaths.slice(0, maxRefs);
        if (params.referenceImagePaths.length > maxRefs) {
            console.warn(
                `Gemini image reference images truncated from ${params.referenceImagePaths.length} to ${maxRefs}`
            );
        }
        for (const imgPath of capped) {
            const prepared = prepareReferenceImage(imgPath);
            if (!prepared) continue;
            parts.push({ inlineData: { mimeType: prepared.mimeType, data: prepared.base64 } });
        }
    }

    // Image edit mode is a UI-level toggle. The Gemini Developer API has no
    // dedicated `editImage` endpoint nor a "fidelity" parameter (Vertex AI's
    // imagen-3.0-capability with EditMode and SubjectReference/StyleReference
    // images is *not* available with an AI Studio API key — see the model
    // catalog at ai.google.dev/gemini-api/docs/models). The official Nano
    // Banana guidance is to (1) describe what to change explicitly and (2)
    // describe what to keep exactly the same. We prepend that instruction
    // here so the user's prompt only needs to focus on the actual edit.
    let promptText = params.prompt;
    if (params.editMode && parts.length > 0) {
        promptText =
            'Edit the attached image according to the instruction below. Keep every other element of the image exactly the same — preserve the subject identity, faces, poses, layout, lighting, and color grading unless the instruction explicitly changes them.\n\n' +
            promptText;
    }
    if (g.negativePrompt && !apiNegative) {
        promptText += `\n\nDo not include: ${g.negativePrompt}`;
    }
    parts.push({ text: promptText });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imageConfig: any = { aspectRatio: g.aspectRatio };
    if ((modelDef?.gemini?.supportedQualities?.length ?? 0) > 0) {
        const sdkSize = mapGeminiQualityToSdkImageSize(g.quality);
        if (sdkSize) imageConfig.imageSize = sdkSize;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig,
    };

    const buffers: Buffer[] = [];
    const perItemMeta: GeminiResponseMeta[] = [];
    let resultMimeType = 'image/png';
    const diagnostics: string[] = [];

    // The Gemini generateContent endpoint returns 1 image per request; loop for
    // multi-image generation. Each iteration is independent so RAI filtering of
    // one candidate doesn't abort the rest. Each response's metadata is mirrored
    // onto every buffer produced by that response so perItemMeta stays aligned
    // with `buffers` (typically 1:1 for this model).
    for (let i = 0; i < params.numberOfImages; i++) {
        const response = await ai.models.generateContent({
            model: params.model,
            contents: [{ role: 'user', parts }],
            config,
        });

        const candidates = response.candidates ?? [];
        if (candidates.length === 0) {
            throw appError('NO_RESPONSE', formatContentDiagnostics(response));
        }
        const responseMeta = extractContentResponseMeta(response);
        for (const c of candidates) {
            const candidateParts = c.content?.parts ?? [];
            for (const part of candidateParts) {
                if (part.inlineData?.data) {
                    buffers.push(Buffer.from(part.inlineData.data, 'base64'));
                    perItemMeta.push(responseMeta);
                    if (part.inlineData.mimeType) resultMimeType = part.inlineData.mimeType;
                }
            }
        }
        const diag = formatContentDiagnostics(response);
        if (diag) diagnostics.push(`[request ${i + 1}/${params.numberOfImages}]\n${diag}`);
    }

    if (buffers.length === 0) {
        throw appError('NO_IMAGES_GENERATED', diagnostics.join('\n\n'));
    }
    return { buffers, mimeType: resultMimeType, perItemMeta };
}

// =============================================================================
// Lyria 3 music (generateContent API via SDK)
// =============================================================================

async function generateMusic(
    ai: GoogleGenAI,
    params: GenerationParams
): Promise<{
    buffers: Buffer[];
    mimeType: string;
    audioTexts?: string[];
    perItemMeta: GeminiResponseMeta[];
}> {
    const modelDef = MODEL_DEFINITIONS.find(m => m.id === params.model);
    const maxRefs = modelDef?.supportsReferenceFile ? (modelDef.maxReferenceImages ?? 0) : 0;
    const parts: Part[] = [];

    // Reference images (image-to-music).
    if (maxRefs > 0 && params.referenceImagePaths.length > 0) {
        const capped = params.referenceImagePaths.slice(0, maxRefs);
        if (params.referenceImagePaths.length > maxRefs) {
            console.warn(`Lyria reference images truncated from ${params.referenceImagePaths.length} to ${maxRefs}`);
        }
        for (const imgPath of capped) {
            const prepared = prepareReferenceImage(imgPath);
            if (!prepared) continue;
            parts.push({ inlineData: { mimeType: prepared.mimeType, data: prepared.base64 } });
        }
    }

    parts.push({ text: params.prompt });

    const response = await ai.models.generateContent({
        model: params.model,
        contents: [{ role: 'user', parts }],
        config: { responseModalities: ['AUDIO', 'TEXT'] },
    });

    const candidates = response.candidates ?? [];
    if (candidates.length === 0) {
        throw appError('NO_RESPONSE', formatContentDiagnostics(response));
    }

    const audioBuffers: Buffer[] = [];
    let resultMimeType = 'audio/mpeg';
    const textParts: string[] = [];

    for (const c of candidates) {
        for (const part of c.content?.parts ?? []) {
            if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/')) {
                audioBuffers.push(Buffer.from(part.inlineData.data, 'base64'));
                resultMimeType = part.inlineData.mimeType;
            } else if (part.text) {
                textParts.push(part.text);
            }
        }
    }

    if (audioBuffers.length === 0) {
        throw appError('NO_MUSIC_GENERATED', formatContentDiagnostics(response));
    }
    // Lyria typically returns one audio file per request, but mirror the
    // response-wide metadata onto every buffer to keep the shape uniform with
    // the other generators.
    const responseMeta = extractContentResponseMeta(response);
    const perItemMeta: GeminiResponseMeta[] = audioBuffers.map(() => responseMeta);
    return {
        buffers: audioBuffers,
        mimeType: resultMimeType,
        audioTexts: textParts.length > 0 ? textParts : undefined,
        perItemMeta,
    };
}

// =============================================================================
// Gemini TTS (generateContent + speechConfig)
// =============================================================================

// Parse PCM audio mimeType (e.g., "audio/L16;codec=pcm;rate=24000") into parameters.
function parsePcmMimeType(mimeType: string): { sampleRate: number; channels: number; bitsPerSample: number } {
    const lower = mimeType.toLowerCase();
    const bitsMatch = lower.match(/l(\d+)/);
    const bitsPerSample = bitsMatch ? parseInt(bitsMatch[1], 10) : 16;
    const rateMatch = lower.match(/rate=(\d+)/);
    const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
    const channelsMatch = lower.match(/channels=(\d+)/);
    const channels = channelsMatch ? parseInt(channelsMatch[1], 10) : 1;
    return { sampleRate, channels, bitsPerSample };
}

async function generateSpeech(
    ai: GoogleGenAI,
    params: GenerationParams
): Promise<{
    buffers: Buffer[];
    mimeType: string;
    audioTexts?: string[];
    perItemMeta: GeminiResponseMeta[];
}> {
    const g = params.gemini;
    if (!g) throw appError('INVALID_PARAMS', 'Gemini params missing for TTS request');

    const userText = params.prompt ?? '';
    const style = (g.styleInstruction ?? '').trim();
    const text = style.length > 0 ? `Style: ${style}, Text: ${userText}` : userText;
    const voiceName = g.voice && g.voice.length > 0 ? g.voice : 'Kore';

    const response = await ai.models.generateContent({
        model: params.model,
        contents: [{ role: 'user', parts: [{ text }] }],
        config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName },
                },
            },
        },
    });

    const candidates = response.candidates ?? [];
    if (candidates.length === 0) {
        throw appError('NO_RESPONSE', formatContentDiagnostics(response));
    }

    const audioBuffers: Buffer[] = [];
    let resultMimeType = 'audio/mpeg';
    const textParts: string[] = [];
    // Track the original (pre-conversion) audio mimeType per buffer so the
    // history entry preserves the source format even after PCM->MP3/WAV.
    const originalMimes: string[] = [];

    for (const c of candidates) {
        for (const part of c.content?.parts ?? []) {
            if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/')) {
                const raw = Buffer.from(part.inlineData.data, 'base64');
                const mime = part.inlineData.mimeType.toLowerCase();
                originalMimes.push(part.inlineData.mimeType);
                if (mime.includes('l16') || mime.includes('pcm')) {
                    // Re-encode PCM to MP3 in memory. Falls back to WAV when
                    // ffmpeg is unavailable so a billed call is never wasted.
                    const { sampleRate, channels, bitsPerSample } = parsePcmMimeType(mime);
                    const mp3 = encodePcmToMp3(raw, sampleRate, channels, bitsPerSample);
                    if (mp3.ok) {
                        audioBuffers.push(mp3.data);
                        resultMimeType = 'audio/mpeg';
                    } else {
                        console.warn(`PCM->MP3 encoding failed, saving as WAV instead: ${mp3.reason}`);
                        audioBuffers.push(wrapPcmAsWav(raw, sampleRate, channels, bitsPerSample));
                        resultMimeType = 'audio/wav';
                    }
                } else {
                    audioBuffers.push(raw);
                    resultMimeType = part.inlineData.mimeType;
                }
            } else if (part.text) {
                textParts.push(part.text);
            }
        }
    }

    if (audioBuffers.length === 0) {
        throw appError('NO_VOICE_GENERATED', formatContentDiagnostics(response));
    }
    // Compose per-buffer metadata: response-wide diagnostics/usage merged with
    // the original pre-conversion mime for that specific buffer.
    const responseMeta = extractContentResponseMeta(response);
    const perItemMeta: GeminiResponseMeta[] = audioBuffers.map((_, i) => ({
        ...responseMeta,
        originalAudioMimeType: originalMimes[i],
    }));
    return {
        buffers: audioBuffers,
        mimeType: resultMimeType,
        audioTexts: textParts.length > 0 ? textParts : undefined,
        perItemMeta,
    };
}

// =============================================================================
// Veo video (generateVideos + LRO polling via SDK)
// =============================================================================

const VEO_POLL_INTERVAL_MS = 10000;

async function generateVideo(
    ai: GoogleGenAI,
    params: GenerationParams
): Promise<{ buffers: Buffer[]; mimeType: string; perItemMeta: GeminiResponseMeta[] }> {
    const g = params.gemini;
    if (!g) throw appError('INVALID_PARAMS', 'Gemini params missing for video request');

    const modelDef = MODEL_DEFINITIONS.find(m => m.id === params.model);
    const apiNegative = modelDef?.apiNegativePrompt ?? false;
    const maxRefs = modelDef?.supportsReferenceFile ? (modelDef.maxReferenceImages ?? 0) : 0;

    let promptText = params.prompt;
    if (g.negativePrompt && !apiNegative) {
        promptText += `\n\nDo not include: ${g.negativePrompt}`;
    }

    // Image-to-video: attach the first reference image as the starting frame.
    // Veo declares maxReferenceImages: 1 — only the first is used regardless of
    // how many were attached (the UI also caps to 1 for video models).
    let firstImage: GenAiImage | undefined;
    if (maxRefs > 0 && params.referenceImagePaths.length > 0) {
        const prepared = prepareReferenceImage(params.referenceImagePaths[0]);
        if (prepared) {
            firstImage = { imageBytes: prepared.base64, mimeType: prepared.mimeType };
        }
    }

    // The `seed` config field is intentionally not set here. The current SDK
    // (Gemini Developer API mode) rejects it client-side, and the Vertex AI
    // path is out of scope for this app. The app never accepts a seed from the
    // user, but if the server returns one in the response we still capture it
    // below so it's retained in history for future reference.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = {
        aspectRatio: g.aspectRatio,
        durationSeconds: g.duration ?? 4,
        resolution: g.resolution ?? '720p',
    };
    if (apiNegative && g.negativePrompt) {
        config.negativePrompt = g.negativePrompt;
    }

    let operation: GenerateVideosOperation = await ai.models.generateVideos({
        model: params.model,
        prompt: promptText,
        image: firstImage,
        config,
    });

    if (!operation.name) {
        throw appError('NO_RESPONSE', 'Veo did not return an operation name');
    }

    // Poll for completion. The SDK's getVideosOperation throws on terminal API
    // errors, so we just keep polling until done. Progress callback fires each
    // iteration so the renderer can show "generating Xs" feedback.
    const startTime = Date.now();
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, VEO_POLL_INTERVAL_MS));
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        if (progressCallback) {
            progressCallback({ status: 'generating', elapsedSeconds: elapsed });
        }
        operation = await ai.operations.getVideosOperation({ operation });
    }

    // operation.error can be set by the long-running operation even when the
    // overall request returned 200; surface it through the diagnostics panel.
    if (operation.error) {
        const e = operation.error as { code?: number; status?: string; message?: string };
        throw new GeminiApiError({
            httpStatus: typeof e.code === 'number' ? e.code : 0,
            apiCode: typeof e.code === 'number' ? e.code : null,
            apiStatus: typeof e.status === 'string' ? e.status : null,
            apiMessage: typeof e.message === 'string' ? e.message : null,
        });
    }

    const videoResp = operation.response;
    if (!videoResp) {
        throw appError('NO_VIDEO_GENERATED', 'LRO completed but response payload is empty');
    }

    const generated = videoResp.generatedVideos ?? [];

    // RAI filter signals on the video response.
    const raiDiagnostics: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawVideoResp = videoResp as any;
    const raiCount = rawVideoResp.raiMediaFilteredCount;
    const raiReasons = rawVideoResp.raiMediaFilteredReasons;
    if (typeof raiCount === 'number' && raiCount > 0) {
        raiDiagnostics.push(`raiMediaFilteredCount: ${raiCount}`);
    }
    if (Array.isArray(raiReasons) && raiReasons.length > 0) {
        raiDiagnostics.push(`raiMediaFilteredReasons: ${raiReasons.join(' | ')}`);
    }

    if (generated.length === 0) {
        throw appError('NO_VIDEO_GENERATED', raiDiagnostics.join('\n'));
    }

    const buffers: Buffer[] = [];
    for (const item of generated) {
        const video = item.video;
        if (!video) continue;
        if (video.videoBytes) {
            // Base64-encoded inline video.
            buffers.push(Buffer.from(video.videoBytes, 'base64'));
        } else if (video.uri) {
            // URI-only response: SDK's files.download writes to disk; we read it
            // back into a Buffer so history-service can name and persist it
            // through its normal flow.
            const tmpPath = path.join(
                os.tmpdir(),
                `imaginai-veo-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`
            );
            try {
                await ai.files.download({ file: video, downloadPath: tmpPath });
                buffers.push(fs.readFileSync(tmpPath));
            } finally {
                try {
                    fs.unlinkSync(tmpPath);
                } catch {
                    // ignore cleanup failure
                }
            }
        }
    }

    if (buffers.length === 0) {
        const diag = [
            ...raiDiagnostics,
            `generatedVideos count: ${generated.length} but no decodable video data extracted`,
        ].join('\n');
        throw appError('NO_VIDEO_GENERATED', diag);
    }

    // Build operation-wide metadata once, then mirror onto every buffer so the
    // shape matches the other generators. operation.metadata is `Record<string,
    // unknown>` in the SDK type, so we copy it verbatim — this is the slot
    // that would receive a future server-side seed value, for example.
    const veoMeta: GeminiResponseMeta = {};
    if (typeof operation.name === 'string' && operation.name.length > 0) {
        veoMeta.operationName = operation.name;
    }
    if (operation.metadata && typeof operation.metadata === 'object') {
        veoMeta.operationMetadata = operation.metadata as Record<string, unknown>;
    }
    if (typeof raiCount === 'number') {
        veoMeta.raiMediaFilteredCount = raiCount;
    }
    if (Array.isArray(raiReasons) && raiReasons.length > 0) {
        veoMeta.raiMediaFilteredReasons = raiReasons.map(String);
    }
    const perItemMeta: GeminiResponseMeta[] = buffers.map(() => veoMeta);

    return { buffers, mimeType: 'video/mp4', perItemMeta };
}

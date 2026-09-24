import fs from 'fs';
import { GoogleGenAI, VideoGenerationReferenceType } from '@google/genai';
import type {
    GenerateVideosConfig,
    GenerateVideosOperation,
    Image as GenAiImage,
    VideoGenerationReferenceImage,
} from '@google/genai';
import type {
    ApiErrorDetail,
    GeminiAspectRatio,
    GeminiQuality,
    GeminiVideoResolution,
    GenerationParams,
    GenerationProgress,
    HistoryEntry,
    ReservedMediaFile,
} from '../../shared/types';

// Per-call metadata that we capture from the API response and persist on the
// history entry. Shaped as a partial of HistoryEntry.gemini so history-service
// can just spread it into the entry without any field-by-field mapping.
type GeminiResponseMeta = Partial<NonNullable<HistoryEntry['gemini']>>;
import {
    DEFAULT_GEMINI_VIDEO_RESOLUTION,
    MODEL_DEFINITIONS,
    REFERENCE_IMAGE_JPEG_QUALITY,
    REFERENCE_IMAGE_MAX_LONG_EDGE,
    resolveMaxReferenceImages,
} from '../../shared/constants';
import { encodePcmToMp3, wrapPcmAsWav } from './ffmpeg-service';
import { discardReservedMedia, reserveMediaPath } from './history-service';

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
// Reference image preprocessing (decode -> downscale -> JPEG re-encode)
// =============================================================================

// Decodes a reference image (any format supported by Electron's nativeImage),
// downscales it so the long edge is <= REFERENCE_IMAGE_MAX_LONG_EDGE while
// preserving aspect ratio, then re-encodes as JPEG. Returning a single
// canonical format keeps request payloads bounded regardless of source.
function prepareReferenceImage(imgPath: string): { mimeType: string; base64: string } | null {
    try {
        const raw = fs.readFileSync(imgPath);
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy require so electron is only loaded when actually running in the main process
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
// Progress callback (consumed by the Veo polling loop and the Interactions timers)
// =============================================================================

let progressCallback: ((progress: GenerationProgress) => void) | null = null;

export function setGenerationProgressCallback(cb: ((progress: GenerationProgress) => void) | null): void {
    progressCallback = cb;
}

// =============================================================================
// Top-level entry point (Gemini only — provider dispatch lives in generation-service.ts)
// =============================================================================

// Dispatches by mediaType. Every model except Veo is served by the Interactions
// API; Veo keeps its own predictLongRunning + polling path.
// `perItemMeta` is parallel to the produced artifacts — one metadata bag each,
// persisted onto the corresponding history entry. The metadata is a partial of
// HistoryEntry.gemini so history-service can spread it directly.
// Artifacts come back as `buffers`, except Veo's URI-delivered videos which are
// already written to their final location and come back as `reservedFiles`. A
// single call never returns both.
export async function generateWithGemini(
    params: GenerationParams,
    apiKey: string
): Promise<{
    buffers: Buffer[];
    reservedFiles?: ReservedMediaFile[];
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
                // Video models are served by two different APIs: Veo goes
                // through generateVideos + LRO polling, Gemini Omni Flash goes
                // through the synchronous Interactions API. The model
                // definition declares which one applies.
                if (modelDef.gemini?.videoApi === 'interactions') {
                    return await generateOmniVideo(ai, params, apiKey);
                }
                return await generateVideo(ai, params);
            case 'music':
                return await generateMusic(ai, params, apiKey);
            case 'voice':
                return await generateSpeech(ai, params, apiKey);
            case 'image':
            default:
                return await generateGeminiImage(ai, params, apiKey);
        }
    } catch (err) {
        throw asGeminiApiError(err);
    }
}

// =============================================================================
// Interactions API (shared by image, music, voice and Omni Flash video)
// =============================================================================
//
// ai.google.dev documents every generative-media model through the Interactions
// API (`/v1beta/interactions`). Veo is the single exception and keeps its
// predictLongRunning + polling path (see generateVideo).

// The non-streaming result of interactions.create, taken from the SDK so the
// fields we read (status, output_*, usage) stay checked against it. The method
// is overloaded and its broadest signature also returns a streaming Stream,
// which this app never requests — narrow it out by the `status` field that only
// the resolved interaction carries.
type InteractionResult = Extract<Awaited<ReturnType<GoogleGenAI['interactions']['create']>>, { status: unknown }>;

// interactions.create is a single synchronous HTTP call that can run for
// minutes; there is no LRO to poll, so a local timer drives the elapsed-time
// progress feedback instead.
const INTERACTIONS_PROGRESS_TICK_MS = 5000;

// Interaction id + token usage, in the shape persisted on the history entry.
function extractInteractionMeta(interaction: InteractionResult): GeminiResponseMeta {
    const meta: GeminiResponseMeta = {};
    if (typeof interaction.id === 'string' && interaction.id.length > 0) {
        meta.interactionId = interaction.id;
    }
    const u = interaction.usage;
    if (
        u &&
        (typeof u.total_input_tokens === 'number' ||
            typeof u.total_output_tokens === 'number' ||
            typeof u.total_tokens === 'number')
    ) {
        meta.usageTokens = {
            promptTokens: typeof u.total_input_tokens === 'number' ? u.total_input_tokens : undefined,
            candidatesTokens: typeof u.total_output_tokens === 'number' ? u.total_output_tokens : undefined,
            totalTokens: typeof u.total_tokens === 'number' ? u.total_tokens : undefined,
        };
    }
    return meta;
}

// Diagnostic string for an interaction that returned without the expected
// output. The Interactions API reports a coarse `status` plus any explanatory
// model text instead of the per-candidate safety breakdown the old
// generateContent responses carried, so this is everything available.
function formatInteractionDiagnostics(interaction: InteractionResult): string {
    return [
        `interaction.status: ${interaction.status ?? 'unknown'}`,
        interaction.output_text ? `output_text: ${interaction.output_text}` : '',
    ]
        .filter(Boolean)
        .join('\n');
}

// Large outputs are delivered as a URI instead of inline base64. The download
// URL is served by the Gemini API and accepts the same API key as the call.
async function downloadInteractionMedia(uri: string, apiKey: string, statusKey: string): Promise<Buffer> {
    const res = await fetch(uri, { headers: { 'x-goog-api-key': apiKey } });
    if (!res.ok) {
        throw appError(statusKey, `Failed to download from URI: HTTP ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer());
}

// The Interactions content blocks this app sends. The SDK keeps its own block
// types internal to the `interactions` namespace, so these mirror the documented
// shapes rather than aliasing them.
type InteractionTextBlock = {
    type: 'text';
    text: string;
    annotations?: { type: 'speech_metadata'; style: string }[];
};
type InteractionImageBlock = { type: 'image'; data: string; mime_type: string };
type InteractionContentBlock = InteractionTextBlock | InteractionImageBlock;

// Narrow mirrors of the response_format members. The SDK's own ResponseFormat
// union ends in a `{ [k: string]: any }` catch-all, so a misspelled field there
// compiles and is then silently ignored by the API. Annotating our objects with
// these instead turns that into a compile error. Accepted values per the SDK:
//   image_size: '512' | '1K' | '2K' | '4K'
//   mime_type (audio): 'audio/mp3' | 'audio/ogg_opus' | 'audio/l16' | 'audio/wav'
//                      | 'audio/alaw' | 'audio/mulaw'
//   resolution: '360p' | '720p' | '1080p' | '4k'
type ImageResponseFormat = { type: 'image'; aspect_ratio: GeminiAspectRatio; image_size?: string };
type AudioResponseFormat = { type: 'audio'; mime_type: string; sample_rate: number };
type VideoResponseFormat = { type: 'video'; aspect_ratio: '16:9' | '9:16'; resolution: GeminiVideoResolution };

// Every text block the model produced, one array element per block, verbatim.
// `interaction.output_text` is NOT used for this: the SDK documents it as the
// concatenated text of the *last* model output, so it merges separate blocks into
// one string and drops anything an earlier step produced. Lyria in particular
// returns the lyrics and a JSON description of the song structure as separate
// blocks, and the history entry has to keep them apart and complete.
function collectInteractionTexts(interaction: InteractionResult): string[] {
    const texts: string[] = [];
    for (const step of interaction.steps ?? []) {
        if (step.type !== 'model_output') continue;
        for (const block of step.content ?? []) {
            if (block.type === 'text' && block.text.length > 0) texts.push(block.text);
        }
    }
    return texts;
}

// Reference images as Interactions content blocks, capped to the model's limit.
function buildInteractionImageBlocks(
    params: GenerationParams,
    maxRefs: number,
    label: string
): InteractionImageBlock[] {
    const blocks: InteractionImageBlock[] = [];
    if (maxRefs <= 0 || params.referenceImagePaths.length === 0) return blocks;
    const capped = params.referenceImagePaths.slice(0, maxRefs);
    if (params.referenceImagePaths.length > maxRefs) {
        console.warn(`${label} reference images truncated from ${params.referenceImagePaths.length} to ${maxRefs}`);
    }
    for (const imgPath of capped) {
        const prepared = prepareReferenceImage(imgPath);
        if (!prepared) continue;
        blocks.push({ type: 'image', data: prepared.base64, mime_type: prepared.mimeType });
    }
    return blocks;
}

// =============================================================================
// Gemini Image (Nano Banana — Interactions API via SDK)
// =============================================================================

// Maps our own quality identifier onto the API's `image_size` value. The
// accepted values are '512', '1K', '2K' and '4K' per the SDK's
// ImageResponseFormatImageSize type; the uppercase 'K' is required and
// lowercase (e.g. '1k') is rejected.
function mapGeminiQualityToImageSize(q: GeminiQuality | undefined): string | undefined {
    if (!q) return undefined;
    if (q === '512px') return '512';
    if (q === '1k') return '1K';
    if (q === '2k') return '2K';
    if (q === '4k') return '4K';
    return undefined;
}

async function generateGeminiImage(
    ai: GoogleGenAI,
    params: GenerationParams,
    apiKey: string
): Promise<{ buffers: Buffer[]; mimeType: string; perItemMeta: GeminiResponseMeta[] }> {
    const g = params.gemini;
    if (!g) throw appError('INVALID_PARAMS', 'Gemini params missing for image generation');

    const modelDef = MODEL_DEFINITIONS.find(m => m.id === params.model);
    const apiNegative = modelDef?.apiNegativePrompt ?? false;
    // Edit mode is fixed to a single reference image across all providers;
    // otherwise honor the model's declared reference cap.
    const maxRefs = resolveMaxReferenceImages(modelDef, { editMode: params.editMode });

    // Reference images (image-to-image / image-edit). Capped per model.
    const imageBlocks = buildInteractionImageBlocks(params, maxRefs, 'Gemini image');

    // Image edit mode is a UI-level toggle. The Gemini Developer API has no
    // dedicated `editImage` endpoint nor a "fidelity" parameter (Vertex AI's
    // imagen-3.0-capability with EditMode and SubjectReference/StyleReference
    // images is *not* available with an AI Studio API key — see the model
    // catalog at ai.google.dev/gemini-api/docs/models). The official Nano
    // Banana guidance is to (1) describe what to change explicitly and (2)
    // describe what to keep exactly the same. We prepend that instruction
    // here so the user's prompt only needs to focus on the actual edit.
    let promptText = params.prompt;
    if (params.editMode && imageBlocks.length > 0) {
        promptText =
            'Edit the attached image according to the instruction below. Keep every other element of the image exactly the same — preserve the subject identity, faces, poses, layout, lighting, and color grading unless the instruction explicitly changes them.\n\n' +
            promptText;
    }
    if (g.negativePrompt && !apiNegative) {
        promptText += `\n\nDo not include: ${g.negativePrompt}`;
    }

    // The image guide orders the blocks prompt-first, reference images after.
    const contents: InteractionContentBlock[] = [{ type: 'text', text: promptText }, ...imageBlocks];

    // Declaring an image response_format also suppresses the conversational
    // text the model would otherwise return alongside the image.
    const imageSize =
        (modelDef?.gemini?.supportedQualities?.length ?? 0) > 0 ? mapGeminiQualityToImageSize(g.quality) : undefined;
    const responseFormat: ImageResponseFormat = {
        type: 'image',
        aspect_ratio: g.aspectRatio,
        ...(imageSize ? { image_size: imageSize } : {}),
    };

    const buffers: Buffer[] = [];
    const perItemMeta: GeminiResponseMeta[] = [];
    let resultMimeType = 'image/png';
    const diagnostics: string[] = [];

    // interactions.create returns a single image per call; loop for multi-image
    // generation. Each iteration is independent so a safety-filtered or
    // otherwise unsuccessful response doesn't abort the remaining requests —
    // its diagnostics are collected and only reported if nothing succeeds.
    for (let i = 0; i < params.numberOfImages; i++) {
        const interaction = await ai.interactions.create({
            model: params.model,
            input: contents,
            response_format: responseFormat,
        });

        const image = interaction.output_image;
        if (interaction.status === 'completed' && (image?.data || image?.uri)) {
            // Inline base64 is the default; 4K output can exceed the inline
            // payload limit and comes back as a URI instead.
            buffers.push(
                image.data
                    ? Buffer.from(image.data, 'base64')
                    : await downloadInteractionMedia(image.uri as string, apiKey, 'NO_IMAGES_GENERATED')
            );
            perItemMeta.push(extractInteractionMeta(interaction));
            if (image.mime_type) resultMimeType = image.mime_type;
        } else {
            diagnostics.push(
                `[request ${i + 1}/${params.numberOfImages}]\n${formatInteractionDiagnostics(interaction)}`
            );
        }
    }

    if (buffers.length === 0) {
        throw appError('NO_IMAGES_GENERATED', diagnostics.join('\n\n'));
    }
    return { buffers, mimeType: resultMimeType, perItemMeta };
}

// =============================================================================
// Veo video (generateVideos + LRO polling via SDK)
// =============================================================================

const VEO_POLL_INTERVAL_MS = 10000;

async function generateVideo(
    ai: GoogleGenAI,
    params: GenerationParams
): Promise<{
    buffers: Buffer[];
    reservedFiles: ReservedMediaFile[];
    mimeType: string;
    perItemMeta: GeminiResponseMeta[];
}> {
    const g = params.gemini;
    if (!g) throw appError('INVALID_PARAMS', 'Gemini params missing for video request');

    const modelDef = MODEL_DEFINITIONS.find(m => m.id === params.model);
    const apiNegative = modelDef?.apiNegativePrompt ?? false;
    // Subject-reference mode is only honored for a model that declares a cap for
    // it; otherwise the attachment is treated as the starting frame.
    const referenceMode =
        g.videoReferenceMode === 'reference' && modelDef?.gemini?.maxSubjectReferenceImages
            ? 'reference'
            : 'firstFrame';
    const maxRefs = resolveMaxReferenceImages(modelDef, { videoReferenceMode: referenceMode });

    let promptText = params.prompt;
    if (g.negativePrompt && !apiNegative) {
        promptText += `\n\nDo not include: ${g.negativePrompt}`;
    }

    // Image-to-video (`firstFrame`): the single attachment becomes the starting
    // frame. Subject references (`reference`): up to the model's cap are sent as
    // `referenceImages`, each tagged `asset` so Veo preserves the subject's
    // appearance instead of animating out of the image.
    let firstImage: GenAiImage | undefined;
    const referenceImages: VideoGenerationReferenceImage[] = [];
    if (maxRefs > 0 && params.referenceImagePaths.length > 0) {
        if (referenceMode === 'reference') {
            const capped = params.referenceImagePaths.slice(0, maxRefs);
            if (params.referenceImagePaths.length > maxRefs) {
                console.warn(`Veo reference images truncated from ${params.referenceImagePaths.length} to ${maxRefs}`);
            }
            for (const imgPath of capped) {
                const prepared = prepareReferenceImage(imgPath);
                if (!prepared) continue;
                referenceImages.push({
                    image: { imageBytes: prepared.base64, mimeType: prepared.mimeType },
                    referenceType: VideoGenerationReferenceType.ASSET,
                });
            }
        } else {
            const prepared = prepareReferenceImage(params.referenceImagePaths[0]);
            if (prepared) {
                firstImage = { imageBytes: prepared.base64, mimeType: prepared.mimeType };
            }
        }
    }

    // The `seed` config field is intentionally not set here. The current SDK
    // (Gemini Developer API mode) rejects it client-side, and the Vertex AI
    // path is out of scope for this app. The app never accepts a seed from the
    // user, but if the server returns one in the response we still capture it
    // below so it's retained in history for future reference.
    const config: GenerateVideosConfig = {
        aspectRatio: g.aspectRatio,
        durationSeconds: g.duration ?? 4,
        resolution: g.resolution ?? '720p',
    };
    if (apiNegative && g.negativePrompt) {
        config.negativePrompt = g.negativePrompt;
    }
    if (referenceImages.length > 0) {
        config.referenceImages = referenceImages;
        // The API requires an 8s duration whenever reference images are used.
        // The generate button validates this too; this is a defensive fallback.
        config.durationSeconds = 8;
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
    // URI-delivered videos are streamed straight into the history directory
    // instead of being buffered, so a 4K clip never has to sit in memory and is
    // never written twice. Anything reserved here is discarded if this function
    // fails afterwards: a reserved file with no metadata JSON would be invisible
    // to the app yet still occupy disk.
    const reservedFiles: ReservedMediaFile[] = [];
    try {
        for (const item of generated) {
            const video = item.video;
            if (!video) continue;
            if (video.videoBytes) {
                // Base64-encoded inline video.
                buffers.push(Buffer.from(video.videoBytes, 'base64'));
            } else if (video.uri) {
                const reserved = reserveMediaPath('mp4');
                reservedFiles.push(reserved);
                await ai.files.download({ file: video, downloadPath: reserved.path });
            }
        }

        if (buffers.length === 0 && reservedFiles.length === 0) {
            const diag = [
                ...raiDiagnostics,
                `generatedVideos count: ${generated.length} but no decodable video data extracted`,
            ].join('\n');
            throw appError('NO_VIDEO_GENERATED', diag);
        }
    } catch (err) {
        for (const reserved of reservedFiles) discardReservedMedia(reserved);
        throw err;
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
    const itemCount = buffers.length + reservedFiles.length;
    const perItemMeta: GeminiResponseMeta[] = Array.from({ length: itemCount }, () => veoMeta);

    return { buffers, reservedFiles, mimeType: 'video/mp4', perItemMeta };
}

// =============================================================================
// Gemini Omni Flash video (Interactions API via SDK)
// =============================================================================

async function generateOmniVideo(
    ai: GoogleGenAI,
    params: GenerationParams,
    apiKey: string
): Promise<{ buffers: Buffer[]; mimeType: string; perItemMeta: GeminiResponseMeta[] }> {
    const g = params.gemini;
    if (!g) throw appError('INVALID_PARAMS', 'Gemini params missing for video request');

    const modelDef = MODEL_DEFINITIONS.find(m => m.id === params.model);
    const maxRefs = resolveMaxReferenceImages(modelDef);

    // Interactions content blocks: reference images first, then the prompt,
    // mirroring the order shown in the official image-to-video examples.
    const contents: InteractionContentBlock[] = [
        ...buildInteractionImageBlocks(params, maxRefs, 'Omni video'),
        { type: 'text', text: params.prompt },
    ];

    // The API only accepts 16:9 / 9:16; the model definition and the store's
    // clamping already restrict the UI, this is a final defensive narrowing.
    const aspectRatio = g.aspectRatio === '9:16' ? '9:16' : '16:9';

    // Output resolution. 1080p and 4K are produced by upscaling the 720p
    // generation; 720p is the API default when the field is omitted.
    const supportedResolutions = modelDef?.gemini?.supportedResolutions ?? [];
    const resolution =
        g.resolution && supportedResolutions.includes(g.resolution) ? g.resolution : DEFAULT_GEMINI_VIDEO_RESOLUTION;

    const videoResponseFormat: VideoResponseFormat = { type: 'video', aspect_ratio: aspectRatio, resolution };

    // Drive the renderer's "generating Xs" feedback with a local timer since
    // this request has no polling loop to hook into.
    const startTime = Date.now();
    const progressTimer = setInterval(() => {
        if (progressCallback) {
            progressCallback({ status: 'generating', elapsedSeconds: Math.round((Date.now() - startTime) / 1000) });
        }
    }, INTERACTIONS_PROGRESS_TICK_MS);

    let interaction: InteractionResult;
    try {
        interaction = await ai.interactions.create({
            model: params.model,
            input: contents,
            response_format: videoResponseFormat,
        });
    } finally {
        clearInterval(progressTimer);
    }

    const video = interaction.output_video;
    if (interaction.status !== 'completed' || !video) {
        throw appError('NO_VIDEO_GENERATED', formatInteractionDiagnostics(interaction));
    }

    const buffers: Buffer[] = [];
    if (video.data) {
        // Inline (base64) delivery — the default for responses under ~4MB.
        buffers.push(Buffer.from(video.data, 'base64'));
    } else if (video.uri) {
        // URI delivery for larger videos.
        buffers.push(await downloadInteractionMedia(video.uri, apiKey, 'NO_VIDEO_GENERATED'));
    }

    if (buffers.length === 0) {
        throw appError('NO_VIDEO_GENERATED', 'Interaction completed but contained no video data');
    }

    const omniMeta = extractInteractionMeta(interaction);
    const perItemMeta: GeminiResponseMeta[] = buffers.map(() => omniMeta);

    return { buffers, mimeType: video.mime_type ?? 'video/mp4', perItemMeta };
}

// =============================================================================
// Lyria music (Interactions API via SDK)
// =============================================================================

async function generateMusic(
    ai: GoogleGenAI,
    params: GenerationParams,
    apiKey: string
): Promise<{
    buffers: Buffer[];
    mimeType: string;
    audioTexts?: string[];
    perItemMeta: GeminiResponseMeta[];
}> {
    const modelDef = MODEL_DEFINITIONS.find(m => m.id === params.model);
    const maxRefs = resolveMaxReferenceImages(modelDef);

    // Reference images first (image-to-music), then the prompt.
    const contents: InteractionContentBlock[] = [
        ...buildInteractionImageBlocks(params, maxRefs, 'Lyria'),
        { type: 'text', text: params.prompt },
    ];

    // Song generation runs for tens of seconds with no LRO to poll, so drive
    // the elapsed-time feedback from a local timer as the Omni path does.
    const startTime = Date.now();
    const progressTimer = setInterval(() => {
        if (progressCallback) {
            progressCallback({ status: 'generating', elapsedSeconds: Math.round((Date.now() - startTime) / 1000) });
        }
    }, INTERACTIONS_PROGRESS_TICK_MS);

    let interaction: InteractionResult;
    try {
        // `response_format` is intentionally omitted: the default output is MP3,
        // which is what the history store keeps. Passing {type:'audio'} would
        // switch Lyria 3.5 to WAV.
        interaction = await ai.interactions.create({
            model: params.model,
            input: contents,
        });
    } finally {
        clearInterval(progressTimer);
    }

    const audio = interaction.output_audio;
    if (interaction.status !== 'completed' || !(audio?.data || audio?.uri)) {
        throw appError('NO_MUSIC_GENERATED', formatInteractionDiagnostics(interaction));
    }

    const buffers = [
        audio.data
            ? Buffer.from(audio.data, 'base64')
            : await downloadInteractionMedia(audio.uri as string, apiKey, 'NO_MUSIC_GENERATED'),
    ];
    const meta = extractInteractionMeta(interaction);
    // The model returns the lyrics and a JSON description of the song structure
    // as separate text blocks; keep every block as-is, one per array element.
    const texts = collectInteractionTexts(interaction);
    return {
        buffers,
        mimeType: audio.mime_type ?? 'audio/mpeg',
        audioTexts: texts.length > 0 ? texts : undefined,
        perItemMeta: buffers.map(() => meta),
    };
}

// =============================================================================
// PCM audio helpers (shared by the TTS path)
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

// =============================================================================
// Gemini TTS (Interactions API via SDK)
// =============================================================================

// Sample rate requested for the raw PCM output, matching the model's native
// 24 kHz mono 16-bit signed little-endian format.
const TTS_INTERACTIONS_SAMPLE_RATE = 24000;

async function generateSpeech(
    ai: GoogleGenAI,
    params: GenerationParams,
    apiKey: string
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
    const voiceName = g.voice && g.voice.length > 0 ? g.voice : 'Kore';

    // Gemini 3.8 TTS treats `text` as a verbatim transcript: the delivery style
    // belongs in a speech_metadata annotation, not inside the transcript.
    const textBlock: InteractionTextBlock = {
        type: 'text',
        text: userText,
        ...(style.length > 0 ? { annotations: [{ type: 'speech_metadata' as const, style }] } : {}),
    };

    // Ask for headerless PCM so the existing PCM->MP3 re-encoding applies; the
    // unary default would be WAV.
    const audioResponseFormat: AudioResponseFormat = {
        type: 'audio',
        mime_type: 'audio/l16',
        sample_rate: TTS_INTERACTIONS_SAMPLE_RATE,
    };
    const interaction = await ai.interactions.create({
        model: params.model,
        input: [{ type: 'user_input', content: [textBlock] }],
        response_format: audioResponseFormat,
        generation_config: {
            speech_config: [{ voice: voiceName }],
        },
    });

    const audio = interaction.output_audio;
    if (interaction.status !== 'completed' || !(audio?.data || audio?.uri)) {
        throw appError('NO_VOICE_GENERATED', formatInteractionDiagnostics(interaction));
    }

    const raw = audio.data
        ? Buffer.from(audio.data, 'base64')
        : await downloadInteractionMedia(audio.uri as string, apiKey, 'NO_VOICE_GENERATED');
    const originalMime = audio.mime_type ?? `audio/l16;rate=${TTS_INTERACTIONS_SAMPLE_RATE}`;
    const { sampleRate, channels, bitsPerSample } = parsePcmMimeType(originalMime);

    let buffer: Buffer;
    let resultMimeType: string;
    if (originalMime.toLowerCase().includes('l16') || originalMime.toLowerCase().includes('pcm')) {
        // Re-encode PCM to MP3 in memory. Falls back to WAV when ffmpeg is
        // unavailable so a billed call is never wasted.
        const mp3 = encodePcmToMp3(raw, sampleRate, channels, bitsPerSample);
        if (mp3.ok) {
            buffer = mp3.data;
            resultMimeType = 'audio/mpeg';
        } else {
            console.warn(`PCM->MP3 encoding failed, saving as WAV instead: ${mp3.reason}`);
            buffer = wrapPcmAsWav(raw, sampleRate, channels, bitsPerSample);
            resultMimeType = 'audio/wav';
        }
    } else {
        // The model answered in a container format (e.g. WAV); store it as is.
        buffer = raw;
        resultMimeType = originalMime;
    }

    const meta: GeminiResponseMeta = { ...extractInteractionMeta(interaction), originalAudioMimeType: originalMime };
    // TTS is documented as audio-only output, but record any text block the model
    // does return rather than discarding it — the audio player has a section for it.
    const texts = collectInteractionTexts(interaction);
    return {
        buffers: [buffer],
        mimeType: resultMimeType,
        audioTexts: texts.length > 0 ? texts : undefined,
        perItemMeta: [meta],
    };
}

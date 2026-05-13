import fs from 'fs';
import OpenAI, { toFile } from 'openai';
import type { Images as OpenAIImagesNs } from 'openai/resources/images';
import type { ApiErrorDetail, GenerationParams, HistoryEntry } from '../../shared/types';
import { MODEL_DEFINITIONS, REFERENCE_IMAGE_JPEG_QUALITY, REFERENCE_IMAGE_MAX_LONG_EDGE } from '../../shared/constants';

// Per-call OpenAI response metadata that the history layer persists as-is.
// Shaped as a partial of HistoryEntry.openai so history-service can spread it
// directly onto the entry without any field-by-field mapping.
type OpenAIResponseMeta = Partial<NonNullable<HistoryEntry['openai']>>;

// =============================================================================
// Error
// =============================================================================

// Mirrors GeminiApiError: carries the structured ApiErrorDetail the renderer
// uses to populate its error panel.
export class OpenAIApiError extends Error {
    constructor(public readonly detail: ApiErrorDetail) {
        super(`HTTP ${detail.httpStatus}: ${detail.apiStatus ?? 'UNKNOWN'} - ${detail.apiMessage ?? ''}`);
    }
}

// Map an OpenAI SDK error to ApiErrorDetail. The SDK exposes status/code on
// APIError; fall back to message parsing for non-API errors.
function toApiErrorDetail(err: unknown): ApiErrorDetail {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = err as any;
    if (e && typeof e === 'object' && (typeof e.status === 'number' || typeof e.code === 'string')) {
        return {
            httpStatus: typeof e.status === 'number' ? e.status : 0,
            apiCode: typeof e.code === 'number' ? e.code : null,
            apiStatus: typeof e.code === 'string' ? e.code : typeof e.type === 'string' ? e.type : null,
            apiMessage: typeof e.message === 'string' ? e.message : null,
        };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { httpStatus: 0, apiCode: null, apiStatus: null, apiMessage: message };
}

function asOpenAIApiError(err: unknown): OpenAIApiError {
    if (err instanceof OpenAIApiError) return err;
    return new OpenAIApiError(toApiErrorDetail(err));
}

function appError(statusKey: string, diagnostic?: string): OpenAIApiError {
    return new OpenAIApiError({
        httpStatus: 0,
        apiCode: null,
        apiStatus: statusKey,
        apiMessage: diagnostic && diagnostic.length > 0 ? diagnostic : null,
    });
}

// =============================================================================
// Reference image preprocessing (Buffer-returning, no fs writes)
// =============================================================================

// Decode, downscale to REFERENCE_IMAGE_MAX_LONG_EDGE, re-encode as JPEG.
// Returns a Buffer the caller can hand to `toFile` for multipart uploads.
function prepareReferenceImageBuffer(imgPath: string): { mimeType: string; buffer: Buffer } | null {
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
        return { mimeType: 'image/jpeg', buffer: jpeg };
    } catch (err) {
        console.warn(`Failed to prepare reference image: ${imgPath}`, err);
        return null;
    }
}

// =============================================================================
// API key validation
// =============================================================================

import type { ApiTestResult } from '../../shared/types';

export async function testOpenAIApiKey(rawKey: string): Promise<ApiTestResult> {
    if (!rawKey) return { success: false, status: 'KEY_NOT_SET', rawMessage: null };
    try {
        const client = new OpenAI({ apiKey: rawKey });
        await client.models.list();
        return { success: true, status: 'KEY_VALID', rawMessage: null };
    } catch (err) {
        const detail = toApiErrorDetail(err);
        const message = detail.apiMessage ?? '';
        if (detail.httpStatus === 401 || detail.httpStatus === 403 || /invalid_api_key/i.test(message)) {
            return { success: false, status: 'KEY_INVALID', rawMessage: message };
        }
        return { success: false, status: 'TEST_ERROR', rawMessage: message };
    }
}

// =============================================================================
// Generation entry point
// =============================================================================

// Output MIME from the negotiated output_format. Caller derives the file
// extension from this string.
function mimeForOutputFormat(format: string): string {
    if (format === 'png') return 'image/png';
    if (format === 'webp') return 'image/webp';
    return 'image/jpeg';
}

// OpenAI's image API has no native negative-prompt parameter. The official
// guidance is to describe what you want in the prompt, but GPT image models do
// honor "do not include" instructions appended to the prompt. We use the same
// pattern Gemini service uses for models that lack a native negative-prompt
// field, so the two providers behave consistently from the user's perspective.
function buildPromptWithNegative(prompt: string, negativePrompt: string | undefined): string {
    const np = (negativePrompt ?? '').trim();
    if (!np) return prompt;
    return `${prompt}\n\nDo not include: ${np}`;
}

export async function generateWithOpenAI(
    params: GenerationParams,
    apiKey: string
): Promise<{ buffers: Buffer[]; mimeType: string; perItemMeta?: OpenAIResponseMeta[] }> {
    const o = params.openai;
    if (!o) throw appError('INVALID_PARAMS', 'OpenAI params missing');

    const modelDef = MODEL_DEFINITIONS.find(m => m.id === params.model);
    if (!modelDef?.openai) {
        throw appError('UNKNOWN_MODEL', `Unknown OpenAI model: ${params.model}`);
    }
    const supportsBg = modelDef.openai.supportsBackground;
    const isEdit = params.editMode && params.referenceImagePaths.length > 0;

    // background=transparent only makes sense when the output format preserves
    // an alpha channel; the UI should already enforce this, but be defensive.
    let outputFormat = o.outputFormat;
    if (supportsBg && o.background === 'transparent' && outputFormat === 'jpeg') {
        outputFormat = 'png';
    }

    const client = new OpenAI({ apiKey });

    try {
        if (isEdit) {
            return await runEdit(client, params, outputFormat, supportsBg);
        }
        return await runGenerate(client, params, outputFormat, supportsBg);
    } catch (err) {
        throw asOpenAIApiError(err);
    }
}

// -----------------------------------------------------------------------------
// images.generate
// -----------------------------------------------------------------------------

async function runGenerate(
    client: OpenAI,
    params: GenerationParams,
    outputFormat: 'png' | 'jpeg' | 'webp',
    supportsBg: boolean
): Promise<{ buffers: Buffer[]; mimeType: string; perItemMeta: OpenAIResponseMeta[] }> {
    const o = params.openai!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = {
        model: params.model,
        prompt: buildPromptWithNegative(params.prompt, o.negativePrompt),
        size: o.size,
        quality: o.quality,
        output_format: outputFormat,
        n: params.numberOfImages,
    };
    // Only send background when the model accepts it (gpt-image-2 rejects
    // background entirely; it does not support transparent backgrounds).
    if (supportsBg) {
        body.background = o.background;
    }
    // input_fidelity is an edits-only parameter — do not send it on generate.

    const response = await client.images.generate(body);
    return extractBuffers(response, outputFormat);
}

// -----------------------------------------------------------------------------
// images.edit
// -----------------------------------------------------------------------------

async function runEdit(
    client: OpenAI,
    params: GenerationParams,
    outputFormat: 'png' | 'jpeg' | 'webp',
    supportsBg: boolean
): Promise<{ buffers: Buffer[]; mimeType: string; perItemMeta: OpenAIResponseMeta[] }> {
    const o = params.openai!;
    // The renderer guarantees a single reference image when editMode is on
    // (see generation-store.setEditMode / addReferenceImages), so we send
    // whatever the request carries without re-clamping here.
    const files: File[] = [];
    for (let i = 0; i < params.referenceImagePaths.length; i++) {
        const prepared = prepareReferenceImageBuffer(params.referenceImagePaths[i]);
        if (!prepared) continue;
        files.push(await toFile(prepared.buffer, `ref-${i}.jpg`, { type: prepared.mimeType }));
    }
    if (files.length === 0) {
        throw appError('NO_VALID_REFERENCE_IMAGE');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = {
        model: params.model,
        image: files[0],
        prompt: buildPromptWithNegative(params.prompt, o.negativePrompt),
        size: o.size,
        quality: o.quality,
        output_format: outputFormat,
        n: params.numberOfImages,
    };
    if (supportsBg) {
        body.background = o.background;
    }

    const response = await client.images.edit(body);
    return extractBuffers(response, outputFormat);
}

// -----------------------------------------------------------------------------
// Response decoding
// -----------------------------------------------------------------------------

function extractBuffers(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response: any,
    outputFormat: 'png' | 'jpeg' | 'webp'
): { buffers: Buffer[]; mimeType: string; perItemMeta: OpenAIResponseMeta[] } {
    // GPT image models always return b64_json (DALL-E variants return url, but
    // those are out of scope for this build).
    const r = response as OpenAIImagesNs.ImagesResponse;
    const data = r.data ?? [];
    if (data.length === 0) {
        throw appError('NO_IMAGES_GENERATED');
    }
    const buffers: Buffer[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseAny = response as any;
    // Build a metadata bag once for the whole response — usage and applied
    // params are response-level, not per-image. We then mirror it onto every
    // generated buffer so it stays aligned with the entry array. The only
    // potentially per-item field is `revised_prompt`, which we override below.
    const baseMeta: OpenAIResponseMeta = {};
    if (typeof responseAny.created === 'number') {
        baseMeta.apiCreated = responseAny.created;
    }
    if (responseAny.background === 'opaque' || responseAny.background === 'transparent') {
        baseMeta.apiAppliedBackground = responseAny.background;
    }
    if (
        responseAny.output_format === 'png' ||
        responseAny.output_format === 'jpeg' ||
        responseAny.output_format === 'webp'
    ) {
        baseMeta.apiAppliedOutputFormat = responseAny.output_format;
    }
    if (responseAny.quality === 'low' || responseAny.quality === 'medium' || responseAny.quality === 'high') {
        baseMeta.apiAppliedQuality = responseAny.quality;
    }
    if (responseAny.size === '1024x1024' || responseAny.size === '1024x1536' || responseAny.size === '1536x1024') {
        baseMeta.apiAppliedSize = responseAny.size;
    }
    const usage = responseAny.usage;
    if (usage && typeof usage === 'object') {
        baseMeta.usage = {
            inputTokens: typeof usage.input_tokens === 'number' ? usage.input_tokens : undefined,
            outputTokens: typeof usage.output_tokens === 'number' ? usage.output_tokens : undefined,
            totalTokens: typeof usage.total_tokens === 'number' ? usage.total_tokens : undefined,
            inputImageTokens:
                typeof usage.input_tokens_details?.image_tokens === 'number'
                    ? usage.input_tokens_details.image_tokens
                    : undefined,
            inputTextTokens:
                typeof usage.input_tokens_details?.text_tokens === 'number'
                    ? usage.input_tokens_details.text_tokens
                    : undefined,
            outputImageTokens:
                typeof usage.output_tokens_details?.image_tokens === 'number'
                    ? usage.output_tokens_details.image_tokens
                    : undefined,
            outputTextTokens:
                typeof usage.output_tokens_details?.text_tokens === 'number'
                    ? usage.output_tokens_details.text_tokens
                    : undefined,
        };
    }

    const perItemMeta: OpenAIResponseMeta[] = [];
    for (const item of data) {
        if (item.b64_json) {
            buffers.push(Buffer.from(item.b64_json, 'base64'));
            const meta: OpenAIResponseMeta = { ...baseMeta };
            if (typeof item.revised_prompt === 'string' && item.revised_prompt.length > 0) {
                meta.revisedPrompt = item.revised_prompt;
            }
            perItemMeta.push(meta);
        }
    }
    if (buffers.length === 0) {
        throw appError('NO_IMAGES_GENERATED', 'Response did not contain any decodable image data');
    }
    return { buffers, mimeType: mimeForOutputFormat(outputFormat), perItemMeta };
}

import fs from 'fs';
import https from 'https';
import http from 'http';
import type { GenerationParams, ApiErrorDetail, VideoDuration, VideoResolution } from '../../shared/types';
import { MODEL_DEFINITIONS, REFERENCE_IMAGE_MAX_LONG_EDGE, REFERENCE_IMAGE_JPEG_QUALITY } from '../../shared/constants';
import { getActiveApiKey } from './api-key-service';
import { encodePcmToMp3, wrapPcmAsWav } from './ffmpeg-service';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com';

type SafetyRating = {
    category?: string;
    probability?: string;
    blocked?: boolean;
};

type GeminiResponse = {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                inlineData?: {
                    mimeType: string;
                    data: string;
                };
                text?: string;
            }>;
        };
        finishReason?: string;
        finishMessage?: string;
        safetyRatings?: SafetyRating[];
    }>;
    promptFeedback?: {
        blockReason?: string;
        blockReasonMessage?: string;
        safetyRatings?: SafetyRating[];
    };
    error?: {
        code: number;
        message: string;
        status: string;
    };
};

type ImagenResponse = {
    predictions?: Array<{
        bytesBase64Encoded: string;
        mimeType: string;
        // Imagen may include filter reason instead of bytes when blocked
        raiFilteredReason?: string;
    }>;
    error?: {
        code: number;
        message: string;
        status: string;
    };
};

// Custom error class that carries structured API error information
export class GeminiApiError extends Error {
    constructor(public readonly detail: ApiErrorDetail) {
        super(`HTTP ${detail.httpStatus}: ${detail.apiStatus ?? 'UNKNOWN'} - ${detail.apiMessage ?? ''}`);
    }
}

// Parse a JSON response body to extract the Google API error structure
function parseApiError(httpStatus: number, body: string): ApiErrorDetail {
    try {
        const parsed = JSON.parse(body);
        const err = parsed?.error;
        if (err && typeof err === 'object') {
            return {
                httpStatus,
                apiCode: typeof err.code === 'number' ? err.code : null,
                apiStatus: typeof err.status === 'string' ? err.status : null,
                apiMessage: typeof err.message === 'string' ? err.message : null,
            };
        }
    } catch {
        // Not JSON
    }
    return { httpStatus, apiCode: null, apiStatus: null, apiMessage: body || null };
}

function httpsRequest(url: string, options: https.RequestOptions, body: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const reqOptions: https.RequestOptions = {
            ...options,
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname + parsedUrl.search,
        };

        const req = (parsedUrl.protocol === 'https:' ? https : http).request(reqOptions, res => {
            let data = '';
            res.on('data', (chunk: Buffer) => {
                data += chunk.toString();
            });
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 400) {
                    reject(new GeminiApiError(parseApiError(res.statusCode, data)));
                } else {
                    resolve(data);
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// Test API key validity. If `rawKey` is provided, that key is tested directly; otherwise the currently active key is used.
export async function testApiKey(rawKey?: string): Promise<import('../../shared/types').ApiTestResult> {
    const apiKey = rawKey !== undefined ? rawKey : getActiveApiKey();
    if (!apiKey) {
        return { success: false, status: 'KEY_NOT_SET', rawMessage: null };
    }

    try {
        const url = `${GEMINI_API_BASE}/v1beta/models?key=${apiKey}`;
        const response = await httpsRequest(url, { method: 'GET' }, '');
        const parsed = JSON.parse(response);
        if (parsed.models && Array.isArray(parsed.models)) {
            return { success: true, status: 'KEY_VALID', rawMessage: null };
        }
        return { success: false, status: 'KEY_INVALID', rawMessage: null };
    } catch (err) {
        if (err instanceof GeminiApiError) {
            // 401/UNAUTHENTICATED means the key is invalid
            if (err.detail.httpStatus === 401 || err.detail.apiStatus === 'UNAUTHENTICATED') {
                return { success: false, status: 'KEY_INVALID', rawMessage: err.detail.apiMessage };
            }
            return { success: false, status: 'TEST_ERROR', rawMessage: err.detail.apiMessage };
        }
        const rawMessage = err instanceof Error ? err.message : String(err);
        return { success: false, status: 'TEST_ERROR', rawMessage };
    }
}

// Check if model supports negativePrompt as an API parameter
function hasApiNegativePrompt(modelId: string): boolean {
    const modelDef = MODEL_DEFINITIONS.find(m => m.id === modelId);
    return modelDef?.apiNegativePrompt ?? false;
}

// Long-Running Operation response
type LroResponse = {
    name?: string;
    done?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response?: any;
    error?: {
        code: number;
        message: string;
        status: string;
    };
};

// Format diagnostic info from a Gemini response into a human-readable string
// for the error details panel. Returns empty string when no diagnostics found.
function formatGeminiDiagnostics(parsed: GeminiResponse): string {
    const lines: string[] = [];
    if (parsed.promptFeedback?.blockReason) {
        const reason = parsed.promptFeedback.blockReason;
        const msg = parsed.promptFeedback.blockReasonMessage;
        lines.push(msg ? `promptFeedback.blockReason: ${reason} (${msg})` : `promptFeedback.blockReason: ${reason}`);
    }
    if (parsed.promptFeedback?.safetyRatings) {
        const blocked = parsed.promptFeedback.safetyRatings.filter(r => r.blocked);
        if (blocked.length > 0) {
            lines.push(
                `promptFeedback.safetyRatings (blocked): ${blocked
                    .map(r => `${r.category}=${r.probability}`)
                    .join(', ')}`
            );
        }
    }
    if (parsed.candidates) {
        parsed.candidates.forEach((c, i) => {
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
            // Surface any text the API returned (often contains the refusal explanation)
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

// Convert an inline error object (from response body) into a GeminiApiError
function throwApiBodyError(error: { code: number; message: string; status: string }): never {
    throw new GeminiApiError({
        httpStatus: error.code,
        apiCode: error.code,
        apiStatus: error.status,
        apiMessage: error.message,
    });
}

// Create a GeminiApiError for application-level errors (no HTTP response).
// `diagnostic` is appended to apiMessage so the error details panel can show
// finishReason / blockReason / safetyRatings / refusal text returned by the API.
function throwAppError(errorKey: string, diagnostic?: string): never {
    throw new GeminiApiError({
        httpStatus: 0,
        apiCode: null,
        apiStatus: errorKey,
        apiMessage: diagnostic && diagnostic.length > 0 ? diagnostic : null,
    });
}

// Generate images using Gemini API
export async function generateImages(
    params: GenerationParams
): Promise<{ buffers: Buffer[]; mimeType: string; audioTexts?: string[] }> {
    const apiKey = getActiveApiKey();
    if (!apiKey) {
        throwAppError('API_KEY_NOT_SET');
    }

    // Dispatch by mediaType. For images, the model id prefix disambiguates Imagen
    // (`imagen-*`, predict API) from Gemini image (`gemini-*`, generateContent API).
    const modelDef = MODEL_DEFINITIONS.find(m => m.id === params.model);
    switch (modelDef?.mediaType) {
        case 'video':
            return await generateWithVeo(params, apiKey);
        case 'music':
            return await generateWithLyria(params, apiKey);
        case 'voice':
            return await generateWithGeminiTts(params, apiKey);
        case 'image':
        default:
            return params.model.startsWith('imagen-')
                ? await generateWithImagen(params, apiKey)
                : await generateWithGemini(params, apiKey);
    }
}

// Generate with Imagen models
async function generateWithImagen(
    params: GenerationParams,
    apiKey: string
): Promise<{ buffers: Buffer[]; mimeType: string }> {
    const url = `${GEMINI_API_BASE}/v1beta/models/${params.model}:predict?key=${apiKey}`;

    let promptText = params.prompt;
    if (params.negativePrompt && !hasApiNegativePrompt(params.model)) {
        promptText += `\n\nDo not include: ${params.negativePrompt}`;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parameters: any = {
        sampleCount: params.numberOfImages,
        aspectRatio: params.aspectRatio,
    };

    // imageSize is only supported by models with supportedQualities
    const modelDef = MODEL_DEFINITIONS.find(m => m.id === params.model);
    if (modelDef && modelDef.supportedQualities && modelDef.supportedQualities.length > 0) {
        const imageSizeMap: Record<string, string> = { '512px': '512px', '1k': '1K', '2k': '2K' };
        parameters.imageSize = imageSizeMap[params.quality] ?? '1K';
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestBody: any = {
        instances: [{ prompt: promptText }],
        parameters,
    };

    const body = JSON.stringify(requestBody);
    const response = await httpsRequest(
        url,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        },
        body
    );

    const parsed = JSON.parse(response) as ImagenResponse;

    if (parsed.error) {
        throwApiBodyError(parsed.error);
    }

    if (!parsed.predictions || parsed.predictions.length === 0) {
        throwAppError('NO_IMAGES_GENERATED');
    }

    const buffers: Buffer[] = [];
    const filterReasons: string[] = [];
    for (let i = 0; i < parsed.predictions.length; i++) {
        const p = parsed.predictions[i];
        if (p.bytesBase64Encoded) {
            buffers.push(Buffer.from(p.bytesBase64Encoded, 'base64'));
        } else if (p.raiFilteredReason) {
            filterReasons.push(`prediction[${i}].raiFilteredReason: ${p.raiFilteredReason}`);
        }
    }
    if (buffers.length === 0) {
        throwAppError('NO_IMAGES_GENERATED', filterReasons.join('\n'));
    }
    return { buffers, mimeType: 'image/png' };
}

// Generate with Gemini models (using generateContent API)
async function generateWithGemini(
    params: GenerationParams,
    apiKey: string
): Promise<{ buffers: Buffer[]; mimeType: string }> {
    const url = `${GEMINI_API_BASE}/v1beta/models/${params.model}:generateContent?key=${apiKey}`;

    // Build parts array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [];

    // Add reference images if present (downscale + JPEG re-encode applied uniformly).
    // Per-model cap comes from `maxReferenceImages`.
    const geminiImageModelDef = MODEL_DEFINITIONS.find(m => m.id === params.model);
    const geminiImageMaxRefs = geminiImageModelDef?.maxReferenceImages ?? 0;
    if (geminiImageMaxRefs > 0 && params.referenceImagePaths && params.referenceImagePaths.length > 0) {
        const capped = params.referenceImagePaths.slice(0, geminiImageMaxRefs);
        if (params.referenceImagePaths.length > geminiImageMaxRefs) {
            console.warn(
                `Gemini image reference images truncated from ${params.referenceImagePaths.length} to ${geminiImageMaxRefs}`
            );
        }
        for (const imgPath of capped) {
            const prepared = prepareReferenceImage(imgPath);
            if (!prepared) continue;
            parts.push({
                inlineData: {
                    mimeType: prepared.mimeType,
                    data: prepared.base64,
                },
            });
        }
    }

    // Add text prompt
    let promptText = params.prompt;
    if (params.negativePrompt && !hasApiNegativePrompt(params.model)) {
        promptText += `\n\nDo not include: ${params.negativePrompt}`;
    }
    parts.push({ text: promptText });

    // Build imageConfig based on model capabilities
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imageConfig: any = {
        aspectRatio: params.aspectRatio,
    };

    // imageSize is only supported by models with supportedQualities
    const geminiModelDef = MODEL_DEFINITIONS.find(m => m.id === params.model);
    if (geminiModelDef && geminiModelDef.supportedQualities && geminiModelDef.supportedQualities.length > 0) {
        const imageSizeMap: Record<string, string> = { '512px': '512px', '1k': '1K', '2k': '2K', '4k': '4K' };
        imageConfig.imageSize = imageSizeMap[params.quality] ?? '1K';
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestBody: any = {
        contents: [{ parts }],
        generationConfig: {
            // responseMimeType does not accept image/* types in generateContent API.
            // Image output is controlled by including 'IMAGE' in responseModalities.
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig,
        },
    };

    const allBuffers: Buffer[] = [];
    let resultMimeType = 'image/png'; // Default; will be overridden by actual response
    const diagnostics: string[] = [];

    // Generate multiple images by making multiple requests if needed
    const requestCount = params.numberOfImages;
    for (let i = 0; i < requestCount; i++) {
        const body = JSON.stringify(requestBody);
        const response = await httpsRequest(
            url,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            },
            body
        );

        const parsed = JSON.parse(response) as GeminiResponse;

        if (parsed.error) {
            throwApiBodyError(parsed.error);
        }

        if (!parsed.candidates || parsed.candidates.length === 0) {
            throwAppError('NO_RESPONSE', formatGeminiDiagnostics(parsed));
        }

        for (const candidate of parsed.candidates) {
            if (candidate.content?.parts) {
                for (const part of candidate.content.parts) {
                    if (part.inlineData?.data) {
                        allBuffers.push(Buffer.from(part.inlineData.data, 'base64'));
                        // Use the MIME type from the API response
                        if (part.inlineData.mimeType) {
                            resultMimeType = part.inlineData.mimeType;
                        }
                    }
                }
            }
        }

        // Collect diagnostics from this request (finishReason, safety, text refusals)
        const diag = formatGeminiDiagnostics(parsed);
        if (diag) diagnostics.push(`[request ${i + 1}/${requestCount}]\n${diag}`);
    }

    if (allBuffers.length === 0) {
        throwAppError('NO_IMAGES_GENERATED', diagnostics.join('\n\n'));
    }

    return { buffers: allBuffers, mimeType: resultMimeType };
}

// Simple HTTPS GET request
function httpsGet(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const reqFn = parsedUrl.protocol === 'https:' ? https : http;
        reqFn
            .get(url, res => {
                let data = '';
                res.on('data', (chunk: Buffer) => {
                    data += chunk.toString();
                });
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 400) {
                        reject(new GeminiApiError(parseApiError(res.statusCode, data)));
                    } else {
                        resolve(data);
                    }
                });
            })
            .on('error', reject);
    });
}

// Download binary data from URL (with API key passed via x-goog-api-key header)
function downloadBuffer(url: string, apiKey?: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const reqFn = parsedUrl.protocol === 'https:' ? https : http;
        const options: https.RequestOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: apiKey ? { 'x-goog-api-key': apiKey } : {},
        };

        reqFn
            .request(options, res => {
                // Follow redirects (pass apiKey for subsequent requests)
                if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    downloadBuffer(res.headers.location, apiKey).then(resolve, reject);
                    return;
                }
                const chunks: Buffer[] = [];
                res.on('data', (chunk: Buffer) => chunks.push(chunk));
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 400) {
                        reject(
                            new GeminiApiError({
                                httpStatus: res.statusCode,
                                apiCode: null,
                                apiStatus: null,
                                apiMessage: 'Download failed',
                            })
                        );
                    } else {
                        resolve(Buffer.concat(chunks));
                    }
                });
            })
            .on('error', reject)
            .end();
    });
}

// Polling interval for Veo LRO (no timeout — wait until done, per official SDK pattern)
const VEO_POLL_INTERVAL_MS = 10000;

// Event emitter for generation progress (set by IPC layer)
let progressCallback: ((progress: import('../../shared/types').GenerationProgress) => void) | null = null;

export function setGenerationProgressCallback(
    cb: ((progress: import('../../shared/types').GenerationProgress) => void) | null
): void {
    progressCallback = cb;
}

// Decode a reference image, downscale it if its long edge exceeds the limit
// (preserving aspect ratio), and re-encode as JPEG. Applied uniformly to all
// generation paths that accept reference images (image, video, music) so that
// request payload size stays bounded regardless of source resolution/format.
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

// Generate music with Lyria models (using generateContent API)
async function generateWithLyria(
    params: GenerationParams,
    apiKey: string
): Promise<{ buffers: Buffer[]; mimeType: string; audioTexts?: string[] }> {
    const url = `${GEMINI_API_BASE}/v1beta/models/${params.model}:generateContent?key=${apiKey}`;

    // Build parts array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [];

    // Add reference images if present (image-to-music). Per-model cap comes from
    // `maxReferenceImages`. Each image is downscaled and re-encoded as JPEG to
    // keep payload size bounded.
    const lyriaModelDef = MODEL_DEFINITIONS.find(m => m.id === params.model);
    const lyriaMaxRefs = lyriaModelDef?.maxReferenceImages ?? 0;
    if (lyriaMaxRefs > 0 && params.referenceImagePaths && params.referenceImagePaths.length > 0) {
        const capped = params.referenceImagePaths.slice(0, lyriaMaxRefs);
        if (params.referenceImagePaths.length > lyriaMaxRefs) {
            console.warn(
                `Lyria reference images truncated from ${params.referenceImagePaths.length} to ${lyriaMaxRefs}`
            );
        }
        for (const imgPath of capped) {
            const prepared = prepareReferenceImage(imgPath);
            if (!prepared) continue;
            parts.push({
                inlineData: {
                    mimeType: prepared.mimeType,
                    data: prepared.base64,
                },
            });
        }
    }

    // Add text prompt
    parts.push({ text: params.prompt });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestBody: any = {
        contents: [{ parts }],
        generationConfig: {
            responseModalities: ['AUDIO', 'TEXT'],
        },
    };

    const body = JSON.stringify(requestBody);
    const response = await httpsRequest(
        url,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        },
        body
    );

    const parsed = JSON.parse(response) as GeminiResponse;

    if (parsed.error) {
        throwApiBodyError(parsed.error);
    }

    if (!parsed.candidates || parsed.candidates.length === 0) {
        throwAppError('NO_RESPONSE', formatGeminiDiagnostics(parsed));
    }

    // Extract audio buffers, lyrics, and description from response parts (order is not guaranteed).
    // The API may return up to two text parts: LYRICS (song lyrics) and DESCRIPTION (caption + metadata).
    const audioBuffers: Buffer[] = [];
    let resultMimeType = 'audio/mpeg';
    const textParts: string[] = [];

    for (const candidate of parsed.candidates) {
        if (candidate.content?.parts) {
            for (const part of candidate.content.parts) {
                if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/')) {
                    audioBuffers.push(Buffer.from(part.inlineData.data, 'base64'));
                    resultMimeType = part.inlineData.mimeType;
                } else if (part.text) {
                    textParts.push(part.text);
                }
            }
        }
    }

    if (audioBuffers.length === 0) {
        throwAppError('NO_MUSIC_GENERATED', formatGeminiDiagnostics(parsed));
    }

    return {
        buffers: audioBuffers,
        mimeType: resultMimeType,
        audioTexts: textParts.length > 0 ? textParts : undefined,
    };
}

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

// Generate speech with Gemini TTS models (generateContent + speechConfig).
// Gemini TTS returns raw PCM (e.g., audio/L16;codec=pcm;rate=24000). We try to
// encode it to MP3 in memory via ffmpeg; if that fails (binary missing, sandbox
// block, etc.), we fall back to WAV in pure JS so the API call is never wasted.
async function generateWithGeminiTts(
    params: GenerationParams,
    apiKey: string
): Promise<{ buffers: Buffer[]; mimeType: string; audioTexts?: string[] }> {
    const url = `${GEMINI_API_BASE}/v1beta/models/${params.model}:generateContent?key=${apiKey}`;

    const userText = params.prompt ?? '';
    const style = (params.styleInstruction ?? '').trim();
    const text = style.length > 0 ? `Style: ${style}, Text: ${userText}` : userText;
    const voiceName = params.voice && params.voice.length > 0 ? params.voice : 'Kore';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestBody: any = {
        contents: [{ parts: [{ text }] }],
        generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName },
                },
            },
        },
    };

    const body = JSON.stringify(requestBody);
    const response = await httpsRequest(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, body);

    const parsed = JSON.parse(response) as GeminiResponse;
    if (parsed.error) {
        throwApiBodyError(parsed.error);
    }
    if (!parsed.candidates || parsed.candidates.length === 0) {
        throwAppError('NO_RESPONSE', formatGeminiDiagnostics(parsed));
    }

    const audioBuffers: Buffer[] = [];
    let resultMimeType = 'audio/mpeg';
    const textParts: string[] = [];

    for (const candidate of parsed.candidates) {
        if (candidate.content?.parts) {
            for (const part of candidate.content.parts) {
                if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/')) {
                    const raw = Buffer.from(part.inlineData.data, 'base64');
                    const mime = part.inlineData.mimeType.toLowerCase();
                    if (mime.includes('l16') || mime.includes('pcm')) {
                        const { sampleRate, channels, bitsPerSample } = parsePcmMimeType(mime);
                        const mp3 = encodePcmToMp3(raw, sampleRate, channels, bitsPerSample);
                        if (mp3.ok) {
                            audioBuffers.push(mp3.data);
                            resultMimeType = 'audio/mpeg';
                        } else {
                            // ffmpeg unavailable / failed: preserve audio losslessly in WAV.
                            // This prevents discarding a billed API result.
                            console.warn(`PCM->MP3 encoding failed, saving as WAV instead: ${mp3.reason}`);
                            const wav = wrapPcmAsWav(raw, sampleRate, channels, bitsPerSample);
                            audioBuffers.push(wav);
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
    }

    if (audioBuffers.length === 0) {
        throwAppError('NO_VOICE_GENERATED', formatGeminiDiagnostics(parsed));
    }

    return {
        buffers: audioBuffers,
        mimeType: resultMimeType,
        audioTexts: textParts.length > 0 ? textParts : undefined,
    };
}

// Generate video with Veo models (using generateVideos API + LRO polling)
async function generateWithVeo(
    params: GenerationParams,
    apiKey: string
): Promise<{ buffers: Buffer[]; mimeType: string }> {
    const duration: VideoDuration = params.duration ?? 4;
    const resolution: VideoResolution = params.resolution ?? '720p';

    const url = `${GEMINI_API_BASE}/v1beta/models/${params.model}:predictLongRunning?key=${apiKey}`;

    // Build request body
    // Embed negative prompt into main prompt if API parameter not supported
    let promptText = params.prompt;
    if (params.negativePrompt && !hasApiNegativePrompt(params.model)) {
        promptText += `\n\nDo not include: ${params.negativePrompt}`;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const instance: any = { prompt: promptText };

    // Image-to-video: attach first reference image as the starting frame.
    // Veo declares maxReferenceImages: 1 — only the first image is used regardless of
    // how many were attached (UI also enforces overwrite-to-1 for video models).
    const veoModelDef = MODEL_DEFINITIONS.find(m => m.id === params.model);
    const veoMaxRefs = veoModelDef?.maxReferenceImages ?? 0;
    if (veoMaxRefs > 0 && params.referenceImagePaths && params.referenceImagePaths.length > 0) {
        const prepared = prepareReferenceImage(params.referenceImagePaths[0]);
        if (prepared) {
            instance.image = { bytesBase64Encoded: prepared.base64, mimeType: prepared.mimeType };
        }
    }

    // Build parameters object faithful to Gemini API spec
    // Gemini API generates 1 video per request (numberOfVideos not needed)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parameters: any = {
        aspectRatio: params.aspectRatio,
        durationSeconds: duration,
        resolution,
    };

    // Negative prompt (API parameter, only if supported by this model)
    if (params.negativePrompt && hasApiNegativePrompt(params.model)) {
        parameters.negativePrompt = params.negativePrompt;
    }

    // Seed for reproducibility
    if (params.seed != null) {
        parameters.seed = params.seed;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestBody: any = {
        instances: [instance],
        parameters,
    };

    const body = JSON.stringify(requestBody);
    const response = await httpsRequest(
        url,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        },
        body
    );

    const lro = JSON.parse(response) as LroResponse;

    if (lro.error) {
        throwApiBodyError(lro.error);
    }

    if (!lro.name) {
        throwAppError('NO_RESPONSE');
    }

    // Poll for completion
    const operationUrl = `${GEMINI_API_BASE}/v1beta/${lro.name}?key=${apiKey}`;
    const startTime = Date.now();

    while (true) {
        await new Promise(resolve => setTimeout(resolve, VEO_POLL_INTERVAL_MS));

        const elapsed = Math.round((Date.now() - startTime) / 1000);
        if (progressCallback) {
            progressCallback({ status: 'generating', elapsedSeconds: elapsed });
        }

        const pollResponse = await httpsGet(operationUrl);
        const pollResult = JSON.parse(pollResponse) as LroResponse;

        if (pollResult.error) {
            throwApiBodyError(pollResult.error);
        }

        if (pollResult.done) {
            // Extract video data from the completed operation
            const videoResult = pollResult.response;
            if (!videoResult) {
                throwAppError('NO_VIDEO_GENERATED', 'LRO completed but response payload is empty');
            }

            // Gemini API response: generateVideoResponse.generatedSamples[]
            const generateVideoResponse = videoResult.generateVideoResponse || videoResult;
            const generatedSamples =
                generateVideoResponse.generatedSamples ||
                generateVideoResponse.generatedVideos ||
                videoResult.generatedVideos ||
                [];

            // Veo surfaces RAI (Responsible AI) filtering through these fields when content is blocked.
            const raiDiagnostics: string[] = [];
            const raiCount = generateVideoResponse.raiMediaFilteredCount ?? videoResult.raiMediaFilteredCount;
            const raiReasons = generateVideoResponse.raiMediaFilteredReasons ?? videoResult.raiMediaFilteredReasons;
            if (typeof raiCount === 'number' && raiCount > 0) {
                raiDiagnostics.push(`raiMediaFilteredCount: ${raiCount}`);
            }
            if (Array.isArray(raiReasons) && raiReasons.length > 0) {
                raiDiagnostics.push(`raiMediaFilteredReasons: ${raiReasons.join(' | ')}`);
            }

            if (generatedSamples.length === 0) {
                throwAppError('NO_VIDEO_GENERATED', raiDiagnostics.join('\n'));
            }

            // Extract video buffer
            const allBuffers: Buffer[] = [];
            for (const sample of generatedSamples) {
                const video = sample.video;
                if (video?.bytesBase64Encoded) {
                    allBuffers.push(Buffer.from(video.bytesBase64Encoded, 'base64'));
                } else if (video?.uri) {
                    const buffer = await downloadBuffer(video.uri, apiKey);
                    allBuffers.push(buffer);
                }
            }

            if (allBuffers.length === 0) {
                const diag = [
                    ...raiDiagnostics,
                    `generatedSamples count: ${generatedSamples.length} but no decodable video data extracted`,
                ].join('\n');
                throwAppError('NO_VIDEO_GENERATED', diag);
            }

            return { buffers: allBuffers, mimeType: 'video/mp4' };
        }
    }
}

import fs from 'fs';
import https from 'https';
import http from 'http';
import type {
    GenerationParams,
    ApiErrorDetail,
    ApiEndpointType,
    VideoDuration,
    VideoResolution,
} from '../../shared/types';
import { MODEL_DEFINITIONS } from '../../shared/constants';
import { getApiKey } from './api-key-service';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com';

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
    }>;
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

// Test API key validity
export async function testApiKey(): Promise<import('../../shared/types').ApiTestResult> {
    const apiKey = getApiKey('gemini');
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

// Resolve API endpoint type from model definition
function getApiEndpoint(modelId: string): ApiEndpointType {
    const modelDef = MODEL_DEFINITIONS.find(m => m.id === modelId);
    return modelDef?.apiEndpoint ?? 'generateContent';
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

// Convert an inline error object (from response body) into a GeminiApiError
function throwApiBodyError(error: { code: number; message: string; status: string }): never {
    throw new GeminiApiError({
        httpStatus: error.code,
        apiCode: error.code,
        apiStatus: error.status,
        apiMessage: error.message,
    });
}

// Create a GeminiApiError for application-level errors (no HTTP response)
function throwAppError(errorKey: string): never {
    throw new GeminiApiError({
        httpStatus: 0,
        apiCode: null,
        apiStatus: errorKey,
        apiMessage: null,
    });
}

// Generate images using Gemini API
export async function generateImages(
    params: GenerationParams
): Promise<{ buffers: Buffer[]; mimeType: string; audioTexts?: string[] }> {
    const apiKey = getApiKey('gemini');
    if (!apiKey) {
        throwAppError('API_KEY_NOT_SET');
    }

    const endpoint = getApiEndpoint(params.model);
    switch (endpoint) {
        case 'generateContentAudio':
            return await generateWithLyria(params, apiKey);
        case 'predictLongRunning':
            return await generateWithVeo(params, apiKey);
        case 'predict':
            return await generateWithImagen(params, apiKey);
        case 'generateContent':
        default:
            return await generateWithGemini(params, apiKey);
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

    const buffers = parsed.predictions.map(p => Buffer.from(p.bytesBase64Encoded, 'base64'));
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

    // Add reference images if present
    if (params.referenceImagePaths && params.referenceImagePaths.length > 0) {
        for (const imgPath of params.referenceImagePaths) {
            try {
                const imageData = fs.readFileSync(imgPath);
                const base64 = imageData.toString('base64');
                const ext = imgPath.toLowerCase().split('.').pop();
                let mimeType = 'image/png';
                if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
                else if (ext === 'webp') mimeType = 'image/webp';

                parts.push({
                    inlineData: {
                        mimeType,
                        data: base64,
                    },
                });
            } catch (err) {
                console.warn(`Failed to read reference image: ${imgPath}`, err);
            }
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
            throwAppError('NO_RESPONSE');
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
    }

    if (allBuffers.length === 0) {
        throwAppError('NO_IMAGES_GENERATED');
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

// Generate music with Lyria models (using generateContent API)
async function generateWithLyria(
    params: GenerationParams,
    apiKey: string
): Promise<{ buffers: Buffer[]; mimeType: string; audioTexts?: string[] }> {
    const url = `${GEMINI_API_BASE}/v1beta/models/${params.model}:generateContent?key=${apiKey}`;

    // Build parts array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [];

    // Add reference images if present (image-to-music)
    if (params.referenceImagePaths && params.referenceImagePaths.length > 0) {
        for (const imgPath of params.referenceImagePaths) {
            try {
                const imageData = fs.readFileSync(imgPath);
                const base64 = imageData.toString('base64');
                const ext = imgPath.toLowerCase().split('.').pop();
                let mimeType = 'image/png';
                if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
                else if (ext === 'webp') mimeType = 'image/webp';

                parts.push({
                    inlineData: {
                        mimeType,
                        data: base64,
                    },
                });
            } catch (err) {
                console.warn(`Failed to read reference image: ${imgPath}`, err);
            }
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
        throwAppError('NO_RESPONSE');
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
        throwAppError('NO_AUDIO_GENERATED');
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

    // Image-to-video: attach first reference image as the starting frame
    if (params.referenceImagePaths && params.referenceImagePaths.length > 0) {
        try {
            const imgPath = params.referenceImagePaths[0];
            const imageData = fs.readFileSync(imgPath);
            const base64 = imageData.toString('base64');
            const ext = imgPath.toLowerCase().split('.').pop();
            let mimeType = 'image/png';
            if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
            else if (ext === 'webp') mimeType = 'image/webp';
            instance.image = { bytesBase64Encoded: base64, mimeType };
        } catch (err) {
            console.warn('Failed to read reference image for video generation:', err);
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
                throwAppError('NO_VIDEO_GENERATED');
            }

            // Gemini API response: generateVideoResponse.generatedSamples[]
            const generateVideoResponse = videoResult.generateVideoResponse || videoResult;
            const generatedSamples =
                generateVideoResponse.generatedSamples ||
                generateVideoResponse.generatedVideos ||
                videoResult.generatedVideos ||
                [];
            if (generatedSamples.length === 0) {
                throwAppError('NO_VIDEO_GENERATED');
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
                throwAppError('NO_VIDEO_GENERATED');
            }

            return { buffers: allBuffers, mimeType: 'video/mp4' };
        }
    }
}

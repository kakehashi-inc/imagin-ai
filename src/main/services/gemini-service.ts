import fs from 'fs';
import https from 'https';
import http from 'http';
import type { GenerationParams } from '../../shared/types';
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
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
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
export async function testApiKey(): Promise<{ success: boolean; message: string }> {
    const apiKey = getApiKey('gemini');
    if (!apiKey) {
        return { success: false, message: 'api.keyNotSet' };
    }

    try {
        const url = `${GEMINI_API_BASE}/v1beta/models?key=${apiKey}`;
        const response = await httpsRequest(url, { method: 'GET' }, '');
        const parsed = JSON.parse(response);
        if (parsed.models && Array.isArray(parsed.models)) {
            return { success: true, message: 'api.keyValid' };
        }
        return { success: false, message: 'api.keyInvalid' };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, message };
    }
}

// Check if a model is Imagen (non-Gemini generative model)
function isImagenModel(modelId: string): boolean {
    return modelId.startsWith('imagen');
}

// Extract HTTP status code from error message (format: "HTTP 429: ...")
function extractHttpStatus(error: Error): number | null {
    const match = error.message.match(/^HTTP (\d+):/);
    return match ? parseInt(match[1], 10) : null;
}

// Map API errors to i18n keys for renderer-side translation
function toUserFriendlyError(err: unknown): Error {
    const original = err instanceof Error ? err : new Error(String(err));
    const status = err instanceof Error ? extractHttpStatus(original) : null;

    const statusKeyMap: Record<number, string> = {
        429: 'api.error.quotaExceeded',
        401: 'api.error.invalidKey',
        403: 'api.error.accessDenied',
        404: 'api.error.modelNotFound',
        500: 'api.error.serverError',
        503: 'api.error.serviceUnavailable',
    };

    // For errors with HTTP status and JSON body, try to extract API message first
    if (status) {
        const bodyMatch = original.message.match(/^HTTP \d+: (.+)$/s);
        if (bodyMatch) {
            try {
                const parsed = JSON.parse(bodyMatch[1]);
                const apiMsg: string = parsed?.error?.message || '';
                if (apiMsg) {
                    const key = classifyApiMessage(apiMsg);
                    if (key) {
                        return new Error(key);
                    }
                }
            } catch {
                // Not JSON, continue to status-based handling
            }
        }
    }

    if (status && statusKeyMap[status]) {
        return new Error(statusKeyMap[status]);
    }

    // For 400 errors without a matched classification, include the raw API detail
    if (status === 400) {
        const bodyMatch = original.message.match(/^HTTP 400: (.+)$/s);
        if (bodyMatch) {
            try {
                const parsed = JSON.parse(bodyMatch[1]);
                const apiMsg: string = parsed?.error?.message || '';
                if (apiMsg) {
                    return new Error(`api.error.invalidRequest::detail=${apiMsg}`);
                }
            } catch {
                // Not JSON
            }
        }
        return new Error('api.error.invalidRequestGeneric');
    }

    return original;
}

// Classify common API error messages into i18n keys
function classifyApiMessage(apiMsg: string): string | null {
    const lower = apiMsg.toLowerCase();

    if (
        lower.includes('only available on paid plans') ||
        lower.includes('upgrade your account') ||
        lower.includes('paid tier') ||
        lower.includes('enable billing')
    ) {
        return 'api.error.paidPlanRequired';
    }

    if (lower.includes('quota') || lower.includes('rate limit') || lower.includes('resource exhausted')) {
        return 'api.error.quotaExceeded';
    }

    if (lower.includes('billing')) {
        return 'api.error.billingRequired';
    }

    if (lower.includes('permission') || lower.includes('not authorized') || lower.includes('forbidden')) {
        return 'api.error.accessDenied';
    }

    return null;
}

// Generate images using Gemini API
export async function generateImages(params: GenerationParams): Promise<{ buffers: Buffer[]; mimeType: string }> {
    const apiKey = getApiKey('gemini');
    if (!apiKey) {
        throw new Error('api.keyNotSet');
    }

    try {
        if (isImagenModel(params.model)) {
            return await generateWithImagen(params, apiKey);
        }
        return await generateWithGemini(params, apiKey);
    } catch (err) {
        console.error('API error (raw):', err instanceof Error ? err.message : err);
        throw toUserFriendlyError(err);
    }
}

// Generate with Imagen models
async function generateWithImagen(
    params: GenerationParams,
    apiKey: string
): Promise<{ buffers: Buffer[]; mimeType: string }> {
    const url = `${GEMINI_API_BASE}/v1beta/models/${params.model}:predict?key=${apiKey}`;

    // Embed negative prompt into main prompt text (negativePrompt param is deprecated)
    let promptText = params.prompt;
    if (params.negativePrompt) {
        promptText += `\n\nDo not include: ${params.negativePrompt}`;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parameters: any = {
        sampleCount: params.numberOfImages,
        aspectRatio: params.aspectRatio,
    };

    // imageSize is only supported by models with supportedQualities
    const modelDef = MODEL_DEFINITIONS.find(m => m.id === params.model);
    if (modelDef && modelDef.supportedQualities.length > 0) {
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
        throw new Error(`HTTP ${parsed.error.code}: ${JSON.stringify({ error: parsed.error })}`);
    }

    if (!parsed.predictions || parsed.predictions.length === 0) {
        throw new Error('api.error.noImagesGenerated');
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
    if (params.negativePrompt) {
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
    if (geminiModelDef && geminiModelDef.supportedQualities.length > 0) {
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
            throw new Error(`HTTP ${parsed.error.code}: ${JSON.stringify({ error: parsed.error })}`);
        }

        if (!parsed.candidates || parsed.candidates.length === 0) {
            throw new Error('api.error.noResponse');
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
        throw new Error('api.error.noImagesGenerated');
    }

    return { buffers: allBuffers, mimeType: resultMimeType };
}

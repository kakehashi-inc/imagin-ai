import fs from 'fs';
import https from 'https';
import http from 'http';
import type { GenerationParams } from '../../shared/types';
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
        return { success: false, message: 'API key is not set.' };
    }

    try {
        const url = `${GEMINI_API_BASE}/v1beta/models?key=${apiKey}`;
        const response = await httpsRequest(url, { method: 'GET' }, '');
        const parsed = JSON.parse(response);
        if (parsed.models && Array.isArray(parsed.models)) {
            return { success: true, message: 'API key is valid.' };
        }
        return { success: false, message: 'Unexpected API response.' };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, message };
    }
}

// Check if a model is Imagen (non-Gemini generative model)
function isImagenModel(modelId: string): boolean {
    return modelId.startsWith('imagen');
}

// Generate images using Gemini API
export async function generateImages(params: GenerationParams): Promise<{ buffers: Buffer[]; mimeType: string }> {
    const apiKey = getApiKey('gemini');
    if (!apiKey) {
        throw new Error('API key is not set. Please configure it in settings.');
    }

    if (isImagenModel(params.model)) {
        return generateWithImagen(params, apiKey);
    }
    return generateWithGemini(params, apiKey);
}

// Generate with Imagen models
async function generateWithImagen(
    params: GenerationParams,
    apiKey: string
): Promise<{ buffers: Buffer[]; mimeType: string }> {
    const url = `${GEMINI_API_BASE}/v1beta/models/${params.model}:predict?key=${apiKey}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestBody: any = {
        instances: [{ prompt: params.prompt }],
        parameters: {
            sampleCount: params.numberOfImages,
            aspectRatio: params.aspectRatio,
            outputMimeType: params.outputMimeType,
            safetySetting: params.safetyFilterLevel,
        },
    };

    if (params.negativePrompt) {
        requestBody.parameters.negativePrompt = params.negativePrompt;
    }

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
        throw new Error(`API Error (${parsed.error.code}): ${parsed.error.message}`);
    }

    if (!parsed.predictions || parsed.predictions.length === 0) {
        throw new Error('No images were generated. The content may have been blocked by safety filters.');
    }

    const buffers = parsed.predictions.map(p => Buffer.from(p.bytesBase64Encoded, 'base64'));
    return { buffers, mimeType: params.outputMimeType };
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestBody: any = {
        contents: [{ parts }],
        generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            responseMimeType: params.outputMimeType,
        },
    };

    const allBuffers: Buffer[] = [];
    const resultMimeType = params.outputMimeType;

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
            throw new Error(`API Error (${parsed.error.code}): ${parsed.error.message}`);
        }

        if (!parsed.candidates || parsed.candidates.length === 0) {
            throw new Error('No response received. The content may have been blocked by safety filters.');
        }

        for (const candidate of parsed.candidates) {
            if (candidate.content?.parts) {
                for (const part of candidate.content.parts) {
                    if (part.inlineData?.data) {
                        allBuffers.push(Buffer.from(part.inlineData.data, 'base64'));
                    }
                }
            }
        }
    }

    if (allBuffers.length === 0) {
        throw new Error('No images were generated. The content may have been blocked by safety filters.');
    }

    return { buffers: allBuffers, mimeType: resultMimeType };
}

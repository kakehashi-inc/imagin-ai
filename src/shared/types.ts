// Platform identifier
export type PlatformId = 'win32' | 'darwin' | 'linux';

// App theme setting
export type AppTheme = 'light' | 'dark' | 'system';

// App language setting
export type AppLanguage = 'ja' | 'en';

// App info
export type AppInfo = {
    name: string;
    version: string;
    language: AppLanguage;
    theme: AppTheme;
    os: PlatformId;
};

// --- API Provider ---
export type ApiProvider = 'gemini';

// --- Model definition ---
export type ModelDefinition = {
    id: string;
    displayName: string;
    provider: ApiProvider;
    supportedAspectRatios: string[];
    supportedQualities: string[];
    supportsImageInput: boolean;
    supportsNegativePrompt: boolean;
    maxImages: number;
};

// --- Generation parameters ---
export type AspectRatio = '1:1' | '9:16' | '16:9' | '3:4' | '4:3' | '2:3' | '3:2' | '4:5' | '5:4' | '21:9';

export type Quality = '1k' | '2k' | '4k';

export type GenerationParams = {
    model: string;
    prompt: string;
    negativePrompt: string;
    aspectRatio: AspectRatio;
    quality: Quality;
    numberOfImages: number;
    referenceImagePaths: string[];
};

// --- History entry ---
export type HistoryEntry = {
    id: string;
    createdAt: string;
    updatedAt: string;
    model: string;
    modelDisplayName: string;
    prompt: string;
    negativePrompt: string;
    aspectRatio: AspectRatio;
    quality: Quality;
    numberOfImages: number;
    referenceImagePaths: string[];
    generatedImagePaths: string[];
    imageWidth?: number;
    imageHeight?: number;
    fileSize?: number;
};

// --- Settings ---
export type AppSettings = {
    language: AppLanguage;
    theme: AppTheme;
    historyDir: string;
};

// --- API test result ---
export type ApiTestResult = {
    success: boolean;
    message: string;
};

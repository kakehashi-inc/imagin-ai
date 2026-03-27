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

// --- Media type ---
export type MediaType = 'image' | 'video' | 'audio';

// --- Video generation parameters ---
export type VideoDuration = 4 | 6 | 8;
export type VideoResolution = '720p' | '1080p' | '4k';

// --- Model definition ---
export type ModelDefinition = {
    id: string;
    displayName: string;
    provider: ApiProvider;
    mediaType: MediaType;
    supportedAspectRatios: string[];
    // Image model properties
    supportedQualities?: string[];
    supportsImageInput?: boolean;
    maxImages?: number;
    // Video model properties
    supportedDurations?: VideoDuration[];
    supportedResolutions?: VideoResolution[];
    supportsSeed?: boolean;
    // Common
    supportsNegativePrompt?: boolean;
    costLabel?: string;
    noteKey?: string;
};

// --- Generation parameters ---
export type AspectRatio =
    | '1:1'
    | '4:3'
    | '3:2'
    | '5:4'
    | '16:9'
    | '21:9'
    | '4:1'
    | '8:1'
    | '3:4'
    | '2:3'
    | '4:5'
    | '9:16'
    | '1:4'
    | '1:8';

export type Quality = '512px' | '1k' | '2k' | '4k';

export type GenerationParams = {
    model: string;
    prompt: string;
    negativePrompt: string;
    aspectRatio: AspectRatio;
    quality: Quality;
    numberOfImages: number;
    referenceImagePaths: string[];
    duration?: VideoDuration;
    resolution?: VideoResolution;
    seed?: number;
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
    mediaType?: MediaType;
    videoDuration?: VideoDuration;
    videoResolution?: VideoResolution;
    seed?: number;
    audioTexts?: string[];
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

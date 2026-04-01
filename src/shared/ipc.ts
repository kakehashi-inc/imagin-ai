import type {
    AppInfo,
    AppLanguage,
    AppTheme,
    AppSettings,
    ApiTestResult,
    GenerationParams,
    GenerationResult,
    HistoryEntry,
} from './types';

// IPC API type definition
export type IpcApi = {
    // App info & settings
    getAppInfo(): Promise<AppInfo>;
    setTheme(theme: AppTheme): Promise<{ theme: AppTheme }>;
    setLanguage(language: AppLanguage): Promise<{ language: AppLanguage }>;

    // Window controls
    minimize(): Promise<void>;
    maximizeOrRestore(): Promise<boolean>;
    isMaximized(): Promise<boolean>;
    close(): Promise<void>;

    // Settings
    getSettings(): Promise<AppSettings>;
    saveSettings(settings: Partial<AppSettings>): Promise<AppSettings>;
    getHistoryDir(): Promise<string>;
    changeHistoryDir(newDir: string, moveExisting: boolean): Promise<{ success: boolean; historyDir: string }>;

    // API Key
    getApiKey(provider: string): Promise<string>;
    saveApiKey(provider: string, key: string): Promise<{ success: boolean }>;
    testApiKey(provider: string): Promise<ApiTestResult>;

    // Generation
    executeGeneration(params: GenerationParams): Promise<GenerationResult>;

    // History
    getAllHistory(): Promise<HistoryEntry[]>;
    getHistoryPage(offset: number, limit: number): Promise<{ entries: HistoryEntry[]; total: number }>;
    deleteHistory(id: string): Promise<void>;
    deleteAllHistory(): Promise<void>;
    exportAllHistory(): Promise<{ success: boolean; path?: string }>;
    saveImageAs(imagePath: string): Promise<{ success: boolean; path?: string }>;
    getHistoryCount(): Promise<number>;
    getThumbnail(imagePath: string): Promise<string>;
    getImage(imagePath: string): Promise<string>;

    // Disk space
    checkDiskSpace(): Promise<{ free: number; low: boolean }>;

    // File dialogs
    selectImages(): Promise<string[]>;
    selectDirectory(): Promise<string | null>;

    // Image viewer window
    openImageViewer(imagePath: string, title: string): Promise<void>;

    // Video viewer window
    openVideoViewer(videoPath: string, title: string): Promise<void>;

    // Save video as
    saveVideoAs(videoPath: string): Promise<{ success: boolean; path?: string }>;

    // Audio player window
    openAudioPlayer(audioPath: string, title: string, audioTexts?: string[]): Promise<void>;

    // Save audio as
    saveAudioAs(audioPath: string): Promise<{ success: boolean; path?: string }>;

    // Event listeners
    onExportProgress(callback: (percent: number) => void): () => void;
    onGenerationProgress(callback: (progress: import('./types').GenerationProgress) => void): () => void;
};

declare global {
    interface Window {
        imaginai: IpcApi;
    }
}

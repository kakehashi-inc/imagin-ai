import type {
    AppInfo,
    AppLanguage,
    AppTheme,
    AppSettings,
    ApiTestResult,
    ApiKeysData,
    ActiveKeyInfo,
    GenerationParams,
    GenerationResult,
    HistoryEntry,
    UpdateState,
} from './types';

export type UpdaterApi = {
    getState(): Promise<UpdateState>;
    check(): Promise<void>;
    download(): Promise<void>;
    quitAndInstall(): Promise<void>;
    onStateChanged(callback: (state: UpdateState) => void): () => void;
};

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

    // API Keys (multi-key storage)
    getApiKeysData(): Promise<ApiKeysData>;
    saveApiKeysData(data: Partial<ApiKeysData>): Promise<{ success: boolean; data: ApiKeysData }>;
    setActiveApiKeyId(id: string): Promise<{ success: boolean; data: ApiKeysData }>;
    getActiveKeyInfo(): Promise<ActiveKeyInfo>;
    testApiKey(rawKey?: string): Promise<ApiTestResult>;

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

    // Audio player window (sections: ordered groups with optional heading labels)
    openAudioPlayer(audioPath: string, title: string, sections?: { label?: string; items: string[] }[]): Promise<void>;

    // Save audio as
    saveAudioAs(audioPath: string): Promise<{ success: boolean; path?: string }>;

    // Event listeners
    onExportProgress(callback: (percent: number) => void): () => void;
    onGenerationProgress(callback: (progress: import('./types').GenerationProgress) => void): () => void;

    // Auto-updater
    updater: UpdaterApi;
};

declare global {
    interface Window {
        imaginai: IpcApi;
    }
}

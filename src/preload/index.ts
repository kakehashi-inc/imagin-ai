import { contextBridge, ipcRenderer } from 'electron';
import type { IpcApi } from '../shared/ipc';

// IPC channel definitions (local copy to avoid importing shared at runtime)
const CH = {
    APP_GET_INFO: 'app:getInfo',
    APP_SET_THEME: 'app:setTheme',
    APP_SET_LANGUAGE: 'app:setLanguage',
    WINDOW_MINIMIZE: 'window:minimize',
    WINDOW_MAXIMIZE_OR_RESTORE: 'window:maximizeOrRestore',
    WINDOW_CLOSE: 'window:close',
    WINDOW_IS_MAXIMIZED: 'window:isMaximized',
    MAIN_CONSOLE: 'main:console',
    SETTINGS_GET: 'settings:get',
    SETTINGS_SAVE: 'settings:save',
    SETTINGS_GET_HISTORY_DIR: 'settings:getHistoryDir',
    SETTINGS_CHANGE_HISTORY_DIR: 'settings:changeHistoryDir',
    API_KEY_GET: 'apiKey:get',
    API_KEY_SAVE: 'apiKey:save',
    API_KEY_TEST: 'apiKey:test',
    GENERATION_EXECUTE: 'generation:execute',
    HISTORY_GET_ALL: 'history:getAll',
    HISTORY_GET_PAGE: 'history:getPage',
    HISTORY_DELETE: 'history:delete',
    HISTORY_DELETE_ALL: 'history:deleteAll',
    HISTORY_EXPORT_ALL: 'history:exportAll',
    HISTORY_SAVE_IMAGE_AS: 'history:saveImageAs',
    HISTORY_GET_COUNT: 'history:getCount',
    HISTORY_GET_THUMBNAIL: 'history:getThumbnail',
    HISTORY_GET_IMAGE: 'history:getImage',
    DISK_CHECK_SPACE: 'disk:checkSpace',
    DIALOG_SELECT_IMAGES: 'dialog:selectImages',
    DIALOG_SELECT_DIRECTORY: 'dialog:selectDirectory',
    IMAGE_VIEWER_OPEN: 'imageViewer:open',
    VIDEO_VIEWER_OPEN: 'videoViewer:open',
    HISTORY_SAVE_VIDEO_AS: 'history:saveVideoAs',
    AUDIO_PLAYER_OPEN: 'audioPlayer:open',
    HISTORY_SAVE_AUDIO_AS: 'history:saveAudioAs',
    EXPORT_PROGRESS: 'export:progress',
    GENERATION_PROGRESS: 'generation:progress',
} as const;

const api: IpcApi = {
    // App info & settings
    async getAppInfo() {
        return ipcRenderer.invoke(CH.APP_GET_INFO);
    },
    async setTheme(theme) {
        return ipcRenderer.invoke(CH.APP_SET_THEME, theme);
    },
    async setLanguage(language) {
        return ipcRenderer.invoke(CH.APP_SET_LANGUAGE, language);
    },

    // Window controls
    async minimize() {
        return ipcRenderer.invoke(CH.WINDOW_MINIMIZE);
    },
    async maximizeOrRestore() {
        return ipcRenderer.invoke(CH.WINDOW_MAXIMIZE_OR_RESTORE);
    },
    async isMaximized() {
        return ipcRenderer.invoke(CH.WINDOW_IS_MAXIMIZED);
    },
    async close() {
        return ipcRenderer.invoke(CH.WINDOW_CLOSE);
    },

    // Settings
    async getSettings() {
        return ipcRenderer.invoke(CH.SETTINGS_GET);
    },
    async saveSettings(settings) {
        return ipcRenderer.invoke(CH.SETTINGS_SAVE, settings);
    },
    async getHistoryDir() {
        return ipcRenderer.invoke(CH.SETTINGS_GET_HISTORY_DIR);
    },
    async changeHistoryDir(newDir, moveExisting) {
        return ipcRenderer.invoke(CH.SETTINGS_CHANGE_HISTORY_DIR, newDir, moveExisting);
    },

    // API Key
    async getApiKey(provider) {
        return ipcRenderer.invoke(CH.API_KEY_GET, provider);
    },
    async saveApiKey(provider, key) {
        return ipcRenderer.invoke(CH.API_KEY_SAVE, provider, key);
    },
    async testApiKey(provider) {
        return ipcRenderer.invoke(CH.API_KEY_TEST, provider);
    },

    // Generation
    async executeGeneration(params) {
        return ipcRenderer.invoke(CH.GENERATION_EXECUTE, params);
    },

    // History
    async getAllHistory() {
        return ipcRenderer.invoke(CH.HISTORY_GET_ALL);
    },
    async getHistoryPage(offset, limit) {
        return ipcRenderer.invoke(CH.HISTORY_GET_PAGE, offset, limit);
    },
    async deleteHistory(id) {
        return ipcRenderer.invoke(CH.HISTORY_DELETE, id);
    },
    async deleteAllHistory() {
        return ipcRenderer.invoke(CH.HISTORY_DELETE_ALL);
    },
    async exportAllHistory() {
        return ipcRenderer.invoke(CH.HISTORY_EXPORT_ALL);
    },
    async saveImageAs(imagePath) {
        return ipcRenderer.invoke(CH.HISTORY_SAVE_IMAGE_AS, imagePath);
    },
    async getHistoryCount() {
        return ipcRenderer.invoke(CH.HISTORY_GET_COUNT);
    },
    async getThumbnail(imagePath) {
        return ipcRenderer.invoke(CH.HISTORY_GET_THUMBNAIL, imagePath);
    },
    async getImage(imagePath) {
        return ipcRenderer.invoke(CH.HISTORY_GET_IMAGE, imagePath);
    },

    // Disk space
    async checkDiskSpace() {
        return ipcRenderer.invoke(CH.DISK_CHECK_SPACE);
    },

    // File dialogs
    async selectImages() {
        return ipcRenderer.invoke(CH.DIALOG_SELECT_IMAGES);
    },
    async selectDirectory() {
        return ipcRenderer.invoke(CH.DIALOG_SELECT_DIRECTORY);
    },

    // Image viewer window
    async openImageViewer(imagePath, title) {
        return ipcRenderer.invoke(CH.IMAGE_VIEWER_OPEN, imagePath, title);
    },

    // Video viewer window
    async openVideoViewer(videoPath, title) {
        return ipcRenderer.invoke(CH.VIDEO_VIEWER_OPEN, videoPath, title);
    },

    // Save video as
    async saveVideoAs(videoPath) {
        return ipcRenderer.invoke(CH.HISTORY_SAVE_VIDEO_AS, videoPath);
    },

    // Audio player window
    async openAudioPlayer(audioPath, title, audioTexts) {
        return ipcRenderer.invoke(CH.AUDIO_PLAYER_OPEN, audioPath, title, audioTexts);
    },

    // Save audio as
    async saveAudioAs(audioPath) {
        return ipcRenderer.invoke(CH.HISTORY_SAVE_AUDIO_AS, audioPath);
    },

    // Event listeners
    onExportProgress(callback) {
        const handler = (_event: Electron.IpcRendererEvent, percent: number) => callback(percent);
        ipcRenderer.on(CH.EXPORT_PROGRESS, handler);
        return () => {
            ipcRenderer.removeListener(CH.EXPORT_PROGRESS, handler);
        };
    },
    onGenerationProgress(callback) {
        const handler = (_event: Electron.IpcRendererEvent, progress: import('../shared/types').GenerationProgress) =>
            callback(progress);
        ipcRenderer.on(CH.GENERATION_PROGRESS, handler);
        return () => {
            ipcRenderer.removeListener(CH.GENERATION_PROGRESS, handler);
        };
    },
};

contextBridge.exposeInMainWorld('imaginai', api);

// Forward main process console messages to DevTools
ipcRenderer.on(
    CH.MAIN_CONSOLE,
    (
        _event,
        data: {
            level: string;
            args: Array<{ type: string; value?: string; message?: string; stack?: string; name?: string }>;
        }
    ) => {
        const { level, args } = data;
        const deserializedArgs = args.map(arg => {
            if (arg.type === 'error') {
                const error = new Error(arg.message || 'Unknown error');
                if (arg.stack) error.stack = arg.stack;
                if (arg.name) error.name = arg.name;
                return error;
            } else if (arg.type === 'object') {
                try {
                    return JSON.parse(arg.value || '{}');
                } catch {
                    return arg.value;
                }
            } else {
                return arg.value;
            }
        });

        switch (level) {
            case 'log':
                console.log('[Main]', ...deserializedArgs);
                break;
            case 'error':
                console.error('[Main]', ...deserializedArgs);
                break;
            case 'warn':
                console.warn('[Main]', ...deserializedArgs);
                break;
            case 'info':
                console.info('[Main]', ...deserializedArgs);
                break;
            case 'debug':
                console.debug('[Main]', ...deserializedArgs);
                break;
            default:
                console.log('[Main]', ...deserializedArgs);
        }
    }
);

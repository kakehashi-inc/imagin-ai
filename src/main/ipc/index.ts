import { ipcMain, dialog, BrowserWindow, screen, nativeImage, nativeTheme } from 'electron';
import path from 'path';
import fs from 'fs';
import { IPC_CHANNELS, MODEL_DEFINITIONS, HISTORY_MAX_COUNT } from '../../shared/constants';
import { loadSettings, mergeSettings, ensureHistoryDir } from '../services/settings-service';
import { getApiKey, saveApiKey } from '../services/api-key-service';
import { testApiKey, generateImages } from '../services/gemini-service';
import {
    getAllHistory,
    getHistoryCount,
    deleteHistoryEntry,
    deleteAllHistory,
    exportAllHistory,
    createHistoryEntries,
    getThumbnailDataUrl,
    getImageDataUrl,
    moveHistoryDir,
} from '../services/history-service';
import type { GenerationParams } from '../../shared/types';
import { translate } from '../../shared/i18n/translate';

function t(key: string, params?: Record<string, string | number>): string {
    return translate(loadSettings().language, key, params);
}

/**
 * Register all application IPC handlers
 */
export function registerIpcHandlers() {
    // --- Settings ---
    ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
        return loadSettings();
    });

    ipcMain.handle(IPC_CHANNELS.SETTINGS_SAVE, async (_e, settings) => {
        return mergeSettings(settings);
    });

    ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_HISTORY_DIR, async () => {
        return ensureHistoryDir();
    });

    ipcMain.handle(IPC_CHANNELS.SETTINGS_CHANGE_HISTORY_DIR, async (_e, newDir: string, moveExisting: boolean) => {
        try {
            if (moveExisting) {
                moveHistoryDir(newDir);
            } else {
                ensureHistoryDir(newDir);
            }
            const settings = mergeSettings({ historyDir: newDir });
            return { success: true, historyDir: settings.historyDir };
        } catch (err) {
            console.error('Failed to change history dir:', err);
            return { success: false, historyDir: loadSettings().historyDir };
        }
    });

    // --- API Key ---
    ipcMain.handle(IPC_CHANNELS.API_KEY_GET, async (_e, provider: string) => {
        return getApiKey(provider);
    });

    ipcMain.handle(IPC_CHANNELS.API_KEY_SAVE, async (_e, provider: string, key: string) => {
        saveApiKey(provider, key);
    });

    ipcMain.handle(IPC_CHANNELS.API_KEY_TEST, async () => {
        return testApiKey();
    });

    // --- Generation ---
    ipcMain.handle(IPC_CHANNELS.GENERATION_EXECUTE, async (_e, params: GenerationParams) => {
        // Check history limit
        const count = getHistoryCount();
        if (count >= HISTORY_MAX_COUNT) {
            throw new Error(t('ipc.historyLimitExceeded', { limit: HISTORY_MAX_COUNT }));
        }

        // Find model display name
        const modelDef = MODEL_DEFINITIONS.find(m => m.id === params.model);
        const modelDisplayName = modelDef?.displayName || params.model;

        // Generate images
        const result = await generateImages(params);

        // Save to history
        const entries = createHistoryEntries(params, modelDisplayName, result.buffers, result.mimeType);
        return entries;
    });

    // --- History ---
    ipcMain.handle(IPC_CHANNELS.HISTORY_GET_ALL, async () => {
        return getAllHistory();
    });

    ipcMain.handle(IPC_CHANNELS.HISTORY_GET_COUNT, async () => {
        return getHistoryCount();
    });

    ipcMain.handle(IPC_CHANNELS.HISTORY_DELETE, async (_e, id: string) => {
        deleteHistoryEntry(id);
    });

    ipcMain.handle(IPC_CHANNELS.HISTORY_DELETE_ALL, async () => {
        deleteAllHistory();
    });

    ipcMain.handle(IPC_CHANNELS.HISTORY_EXPORT_ALL, async () => {
        const win = BrowserWindow.getFocusedWindow();
        if (!win) return { success: false };

        const result = await dialog.showSaveDialog(win, {
            title: t('dialog.exportHistory'),
            defaultPath: 'imaginai-history.zip',
            filters: [{ name: t('dialog.zipFilter'), extensions: ['zip'] }],
        });

        if (result.canceled || !result.filePath) {
            return { success: false };
        }

        try {
            await exportAllHistory(result.filePath, (percent: number) => {
                if (!win.isDestroyed()) {
                    win.webContents.send(IPC_CHANNELS.EXPORT_PROGRESS, percent);
                }
            });
            return { success: true, path: result.filePath };
        } catch (err) {
            console.error('Failed to export history:', err);
            throw err;
        }
    });

    ipcMain.handle(IPC_CHANNELS.HISTORY_SAVE_IMAGE_AS, async (_e, imagePath: string) => {
        const win = BrowserWindow.getFocusedWindow();
        if (!win) return { success: false };

        const ext = path.extname(imagePath).toLowerCase().replace('.', '');
        const filters =
            ext === 'jpg' || ext === 'jpeg'
                ? [{ name: t('dialog.jpegFilter'), extensions: ['jpg', 'jpeg'] }]
                : [{ name: t('dialog.pngFilter'), extensions: ['png'] }];

        const result = await dialog.showSaveDialog(win, {
            title: t('dialog.saveImageAs'),
            defaultPath: path.basename(imagePath),
            filters,
        });

        if (result.canceled || !result.filePath) {
            return { success: false };
        }

        try {
            fs.copyFileSync(imagePath, result.filePath);
            return { success: true, path: result.filePath };
        } catch (err) {
            console.error('Failed to save image:', err);
            throw err;
        }
    });

    ipcMain.handle(IPC_CHANNELS.HISTORY_GET_THUMBNAIL, async (_e, imagePath: string) => {
        return getThumbnailDataUrl(imagePath);
    });

    ipcMain.handle(IPC_CHANNELS.HISTORY_GET_IMAGE, async (_e, imagePath: string) => {
        return getImageDataUrl(imagePath);
    });

    // --- Disk Space ---
    ipcMain.handle(IPC_CHANNELS.DISK_CHECK_SPACE, async () => {
        try {
            const historyDir = ensureHistoryDir();
            const root = path.parse(historyDir).root || historyDir;
            const stats = fs.statfsSync(root);
            const free = stats.bfree * stats.bsize;
            // Warn if less than 100MB free
            const LOW_THRESHOLD = 100 * 1024 * 1024;
            return { free, low: free < LOW_THRESHOLD };
        } catch {
            return { free: -1, low: false };
        }
    });

    // --- File Dialogs ---
    ipcMain.handle(IPC_CHANNELS.DIALOG_SELECT_IMAGES, async () => {
        const win = BrowserWindow.getFocusedWindow();
        if (!win) return [];

        const result = await dialog.showOpenDialog(win, {
            title: t('dialog.selectImages'),
            filters: [{ name: t('dialog.imageFilter'), extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
            properties: ['openFile', 'multiSelections'],
        });

        return result.canceled ? [] : result.filePaths;
    });

    ipcMain.handle(IPC_CHANNELS.DIALOG_SELECT_DIRECTORY, async () => {
        const win = BrowserWindow.getFocusedWindow();
        if (!win) return null;

        const result = await dialog.showOpenDialog(win, {
            title: t('dialog.selectDirectory'),
            properties: ['openDirectory', 'createDirectory'],
        });

        return result.canceled ? null : result.filePaths[0] || null;
    });

    // --- Image Viewer Window ---
    ipcMain.handle(IPC_CHANNELS.IMAGE_VIEWER_OPEN, async (_e, imagePath: string, title: string) => {
        openImageViewerWindow(imagePath, title);
    });
}

function openImageViewerWindow(imagePath: string, title: string) {
    // Get image dimensions
    let imgWidth = 800;
    let imgHeight = 600;

    try {
        const img = nativeImage.createFromPath(imagePath);
        const size = img.getSize();
        if (size.width > 0 && size.height > 0) {
            imgWidth = size.width;
            imgHeight = size.height;
        }
    } catch (err) {
        console.warn('Failed to get image dimensions:', err);
    }

    // Constrain to screen size
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    const maxWidth = Math.floor(screenWidth * 0.9);
    const maxHeight = Math.floor(screenHeight * 0.9);

    let winWidth = imgWidth;
    let winHeight = imgHeight;

    if (winWidth > maxWidth || winHeight > maxHeight) {
        const scaleX = maxWidth / winWidth;
        const scaleY = maxHeight / winHeight;
        const scale = Math.min(scaleX, scaleY);
        winWidth = Math.floor(winWidth * scale);
        winHeight = Math.floor(winHeight * scale);
    }

    // Minimum size
    winWidth = Math.max(winWidth, 300);
    winHeight = Math.max(winHeight, 200);

    const viewerWindow = new BrowserWindow({
        width: winWidth,
        height: winHeight,
        title,
        autoHideMenuBar: true,
        webPreferences: {
            // Allow data:text/html to reference local file:// images
            webSecurity: false,
        },
    });

    const fileUrl = `file:///${imagePath.replace(/\\/g, '/')}`;
    const bg = nativeTheme.shouldUseDarkColors ? '#1a1a1a' : '#f5f5f5';
    const html = `<style>*{margin:0}html,body{width:100%;height:100%;overflow:hidden;background:${bg}}img{width:100%;height:100%;object-fit:contain}</style><img src="${fileUrl}">`;
    viewerWindow.loadURL(`data:text/html,${encodeURIComponent(html)}`);
}

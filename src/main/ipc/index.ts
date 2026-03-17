import { ipcMain, dialog, BrowserWindow, screen, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
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
    createHistoryEntry,
    getThumbnailDataUrl,
    getImageDataUrl,
    moveHistoryDir,
} from '../services/history-service';
import type { GenerationParams } from '../../shared/types';

const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

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
            throw new Error(
                `History limit exceeded (${HISTORY_MAX_COUNT} entries). Please clean up history before generating.`
            );
        }

        // Find model display name
        const modelDef = MODEL_DEFINITIONS.find(m => m.id === params.model);
        const modelDisplayName = modelDef?.displayName || params.model;

        // Generate images
        const result = await generateImages(params);

        // Save to history
        const entry = createHistoryEntry(params, modelDisplayName, result.buffers, result.mimeType);
        return entry;
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
            title: 'Export History Archive',
            defaultPath: 'imaginai-history.zip',
            filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
        });

        if (result.canceled || !result.filePath) {
            return { success: false };
        }

        try {
            await exportAllHistory(result.filePath);
            deleteAllHistory();
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
                ? [{ name: 'JPEG Image', extensions: ['jpg', 'jpeg'] }]
                : [{ name: 'PNG Image', extensions: ['png'] }];

        const result = await dialog.showSaveDialog(win, {
            title: 'Save Image As',
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

    // --- File Dialogs ---
    ipcMain.handle(IPC_CHANNELS.DIALOG_SELECT_IMAGES, async () => {
        const win = BrowserWindow.getFocusedWindow();
        if (!win) return [];

        const result = await dialog.showOpenDialog(win, {
            title: 'Select Reference Images',
            filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
            properties: ['openFile', 'multiSelections'],
        });

        return result.canceled ? [] : result.filePaths;
    });

    ipcMain.handle(IPC_CHANNELS.DIALOG_SELECT_DIRECTORY, async () => {
        const win = BrowserWindow.getFocusedWindow();
        if (!win) return null;

        const result = await dialog.showOpenDialog(win, {
            title: 'Select Directory',
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
            preload: path.join(__dirname, '../../preload/index.js'),
        },
    });

    // Load a simple HTML page that displays the image
    const imageDataUrl = getImageDataUrl(imagePath);
    const escapedTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${escapedTitle}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; background: #1a1a1a; }
        body { display: flex; align-items: center; justify-content: center; }
        img { max-width: 100%; max-height: 100%; object-fit: contain; }
    </style>
</head>
<body>
    <img src="${imageDataUrl}" alt="Generated Image" />
</body>
</html>`;

    if (isDev) {
        viewerWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    } else {
        // Write temp HTML file for production
        const tmpDir = path.join(os.tmpdir(), 'imaginai-viewer');
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }
        const tmpFile = path.join(tmpDir, `viewer-${Date.now()}.html`);
        fs.writeFileSync(tmpFile, htmlContent, 'utf-8');
        viewerWindow.loadFile(tmpFile);

        viewerWindow.on('closed', () => {
            try {
                fs.unlinkSync(tmpFile);
            } catch {
                // Ignore cleanup errors
            }
        });
    }
}

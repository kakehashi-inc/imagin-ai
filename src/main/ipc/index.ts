import { ipcMain, dialog, BrowserWindow, screen, nativeImage, nativeTheme } from 'electron';
import path from 'path';
import fs from 'fs';
import { IPC_CHANNELS, MODEL_DEFINITIONS, HISTORY_MAX_COUNT } from '../../shared/constants';
import { loadSettings, mergeSettings, ensureHistoryDir } from '../services/settings-service';
import { getApiKeysData, saveApiKeysData, setActiveApiKeyId, getActiveKeyInfo } from '../services/api-key-service';
import { testApiKey, generateImages, setGenerationProgressCallback, GeminiApiError } from '../services/gemini-service';
import {
    getAllHistory,
    getHistoryPage,
    getHistoryCount,
    deleteHistoryEntry,
    deleteAllHistory,
    exportAllHistory,
    createHistoryEntries,
    createVideoHistoryEntry,
    createAudioHistoryEntry,
    getThumbnailDataUrl,
    getImageDataUrl,
    moveHistoryDir,
} from '../services/history-service';
import type { GenerationParams } from '../../shared/types';

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

    // --- API Keys ---
    ipcMain.handle(IPC_CHANNELS.API_KEYS_GET_DATA, async () => {
        return getApiKeysData();
    });

    ipcMain.handle(IPC_CHANNELS.API_KEYS_SAVE_DATA, async (_e, data: Parameters<typeof saveApiKeysData>[0]) => {
        return saveApiKeysData(data);
    });

    ipcMain.handle(IPC_CHANNELS.API_KEYS_SET_ACTIVE, async (_e, id: string) => {
        return setActiveApiKeyId(id);
    });

    ipcMain.handle(IPC_CHANNELS.API_KEYS_GET_ACTIVE_INFO, async () => {
        return getActiveKeyInfo();
    });

    ipcMain.handle(IPC_CHANNELS.API_KEY_TEST, async (_e, rawKey?: string) => {
        return testApiKey(rawKey);
    });

    // --- Generation ---
    ipcMain.handle(
        IPC_CHANNELS.GENERATION_EXECUTE,
        async (_e, params: GenerationParams): Promise<import('../../shared/types').GenerationResult> => {
            // Check history limit
            const count = getHistoryCount();
            if (count >= HISTORY_MAX_COUNT) {
                return {
                    success: false,
                    error: {
                        httpStatus: 0,
                        apiCode: null,
                        apiStatus: 'HISTORY_LIMIT_EXCEEDED',
                        apiMessage: String(HISTORY_MAX_COUNT),
                    },
                };
            }

            // Find model definition
            const modelDef = MODEL_DEFINITIONS.find(m => m.id === params.model);
            const modelDisplayName = modelDef?.displayName || params.model;
            const isVideo = modelDef?.mediaType === 'video';
            // Both music (Lyria) and voice (TTS) produce audio files; the same history-entry
            // creator handles both. Keep the dispatch decision local to avoid overloading a
            // single "audio-like" abstraction in shared code.
            const producesAudioFile = modelDef?.mediaType === 'music' || modelDef?.mediaType === 'voice';

            // Set up progress callback for video generation
            const win = BrowserWindow.getFocusedWindow();
            if (isVideo && win) {
                setGenerationProgressCallback(progress => {
                    if (!win.isDestroyed()) {
                        win.webContents.send(IPC_CHANNELS.GENERATION_PROGRESS, progress);
                    }
                });
            }

            try {
                // Generate images, video, or audio (measure elapsed time)
                const startTime = Date.now();
                const result = await generateImages(params);
                const elapsedMs = Date.now() - startTime;

                let entries;
                if (producesAudioFile) {
                    entries = result.buffers.map(buf =>
                        createAudioHistoryEntry(
                            params,
                            modelDisplayName,
                            buf,
                            result.mimeType,
                            result.audioTexts,
                            elapsedMs
                        )
                    );
                } else if (isVideo) {
                    entries = result.buffers.map(buf =>
                        createVideoHistoryEntry(params, modelDisplayName, buf, elapsedMs)
                    );
                } else {
                    entries = createHistoryEntries(
                        params,
                        modelDisplayName,
                        result.buffers,
                        result.mimeType,
                        elapsedMs
                    );
                }
                return { success: true, entries };
            } catch (err) {
                console.error('Generation error:', err instanceof Error ? err.message : err);
                if (err instanceof GeminiApiError) {
                    return { success: false, error: err.detail };
                }
                // Unexpected error (network failure, etc.)
                return {
                    success: false,
                    error: {
                        httpStatus: 0,
                        apiCode: null,
                        apiStatus: null,
                        apiMessage: err instanceof Error ? err.message : String(err),
                    },
                };
            } finally {
                setGenerationProgressCallback(null);
            }
        }
    );

    // --- History ---
    ipcMain.handle(IPC_CHANNELS.HISTORY_GET_ALL, async () => {
        return getAllHistory();
    });

    ipcMain.handle(IPC_CHANNELS.HISTORY_GET_PAGE, async (_e, offset: number, limit: number) => {
        return getHistoryPage(offset, limit);
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
            title: 'Export History',
            defaultPath: 'imaginai-history.zip',
            filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
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
            title: 'Select Images',
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

    // --- Video Viewer Window ---
    ipcMain.handle(IPC_CHANNELS.VIDEO_VIEWER_OPEN, async (_e, videoPath: string, title: string) => {
        openVideoViewerWindow(videoPath, title);
    });

    // --- Audio Player Window ---
    ipcMain.handle(
        IPC_CHANNELS.AUDIO_PLAYER_OPEN,
        async (_e, audioPath: string, title: string, sections?: { label?: string; items: string[] }[]) => {
            openAudioPlayerWindow(audioPath, title, sections);
        }
    );

    // --- Save Audio As ---
    ipcMain.handle(IPC_CHANNELS.HISTORY_SAVE_AUDIO_AS, async (_e, audioPath: string) => {
        const win = BrowserWindow.getFocusedWindow();
        if (!win) return { success: false };

        const result = await dialog.showSaveDialog(win, {
            title: 'Save Audio As',
            defaultPath: path.basename(audioPath),
            filters: [{ name: 'MP3 Audio', extensions: ['mp3'] }],
        });

        if (result.canceled || !result.filePath) {
            return { success: false };
        }

        try {
            fs.copyFileSync(audioPath, result.filePath);
            return { success: true, path: result.filePath };
        } catch (err) {
            console.error('Failed to save audio:', err);
            throw err;
        }
    });

    // --- Save Video As ---
    ipcMain.handle(IPC_CHANNELS.HISTORY_SAVE_VIDEO_AS, async (_e, videoPath: string) => {
        const win = BrowserWindow.getFocusedWindow();
        if (!win) return { success: false };

        const result = await dialog.showSaveDialog(win, {
            title: 'Save Video As',
            defaultPath: path.basename(videoPath),
            filters: [{ name: 'MP4 Video', extensions: ['mp4'] }],
        });

        if (result.canceled || !result.filePath) {
            return { success: false };
        }

        try {
            fs.copyFileSync(videoPath, result.filePath);
            return { success: true, path: result.filePath };
        } catch (err) {
            console.error('Failed to save video:', err);
            throw err;
        }
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

function openVideoViewerWindow(videoPath: string, title: string) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    const winWidth = Math.min(960, Math.floor(screenWidth * 0.7));
    const winHeight = Math.min(540, Math.floor(screenHeight * 0.7));

    const viewerWindow = new BrowserWindow({
        width: winWidth,
        height: winHeight,
        title,
        autoHideMenuBar: true,
        webPreferences: {
            webSecurity: false,
        },
    });

    const fileUrl = `file:///${videoPath.replace(/\\/g, '/')}`;
    const bg = nativeTheme.shouldUseDarkColors ? '#1a1a1a' : '#f5f5f5';
    const html = `<style>*{margin:0}html,body{width:100%;height:100%;overflow:hidden;background:${bg};display:flex;align-items:center;justify-content:center}video{max-width:100%;max-height:100%}</style><video src="${fileUrl}" controls autoplay></video>`;
    viewerWindow.loadURL(`data:text/html,${encodeURIComponent(html)}`);
}

function openAudioPlayerWindow(audioPath: string, title: string, sections?: { label?: string; items: string[] }[]) {
    const validSections = (sections ?? []).filter(s => s && s.items && s.items.length > 0);
    const hasText = validSections.length > 0;
    const viewerWindow = new BrowserWindow({
        width: 480,
        height: hasText ? 520 : 200,
        title,
        autoHideMenuBar: true,
        webPreferences: {
            webSecurity: false,
        },
    });

    const fileUrl = `file:///${audioPath.replace(/\\/g, '/')}`;
    const isDark = nativeTheme.shouldUseDarkColors;
    const bg = isDark ? '#1a1a1a' : '#f5f5f5';
    const fg = isDark ? '#e0e0e0' : '#333333';
    const fgMuted = isDark ? '#888' : '#666';
    const border = isDark ? '#333333' : '#dddddd';
    const groupBg = isDark ? '#222' : '#fff';

    const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const preStyle = `white-space:pre-wrap;word-wrap:break-word;font-family:'Segoe UI',sans-serif;font-size:14px;line-height:1.6;margin:0;padding:12px`;

    let textHtml = '';
    if (hasText) {
        textHtml = validSections
            .map(section => {
                const labelHtml = section.label
                    ? `<div style="padding:8px 12px 4px;font-size:11px;font-weight:600;letter-spacing:0.04em;color:${fgMuted};text-transform:uppercase;border-bottom:1px solid ${border}">${escapeHtml(section.label)}</div>`
                    : '';
                const itemsHtml = section.items
                    .map((text, i) => {
                        const sep =
                            i > 0 ? `<hr style="border:none;border-top:1px dashed ${border};margin:4px 12px">` : '';
                        return `${sep}<pre style="${preStyle};color:${fg}">${escapeHtml(text)}</pre>`;
                    })
                    .join('');
                return `<section style="background:${groupBg};border:1px solid ${border};border-radius:6px;margin:8px 8px 0;overflow:hidden">${labelHtml}${itemsHtml}</section>`;
            })
            .join('');
    }

    const bodyHtml = hasText ? `<div style="flex:1;overflow:auto;padding-bottom:8px">${textHtml}</div>` : '';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><style>*{margin:0;box-sizing:border-box}html,body{width:100%;height:100%;background:${bg};display:flex;flex-direction:column}audio{width:100%;flex-shrink:0}</style><audio src="${fileUrl}" controls autoplay></audio>${bodyHtml}</body></html>`;
    viewerWindow.loadURL(`data:text/html;charset=utf-8;base64,${Buffer.from(html, 'utf-8').toString('base64')}`);
}

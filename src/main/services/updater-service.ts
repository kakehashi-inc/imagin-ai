import { BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import { IPC_CHANNELS } from '../../shared/constants';
import type { UpdateState } from '../../shared/types';

const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
// Portable build sets PORTABLE_EXECUTABLE_FILE at runtime. Auto-update must be skipped
// because electron-updater would otherwise download and run the NSIS installer.
const isPortable = !!process.env.PORTABLE_EXECUTABLE_FILE;

let initialized = false;
let startupCheckScheduled = false;
let autoInstallOnDownloaded = false;
let state: UpdateState = { status: 'idle' };

function broadcast(): void {
    for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) {
            win.webContents.send(IPC_CHANNELS.UPDATER_STATE_CHANGED, state);
        }
    }
}

export function initUpdater(): void {
    if (isDev || isPortable || initialized) return;
    initialized = true;

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.logger = console;

    autoUpdater.on('checking-for-update', () => {
        state = { status: 'checking' };
    });

    autoUpdater.on('update-available', info => {
        state = { status: 'available', version: info?.version };
        broadcast();
    });

    autoUpdater.on('update-not-available', () => {
        state = { status: 'not-available' };
    });

    autoUpdater.on('download-progress', progress => {
        state = {
            status: 'downloading',
            version: state.version,
            progress: Math.round(progress?.percent ?? 0),
        };
        broadcast();
    });

    autoUpdater.on('update-downloaded', info => {
        state = { status: 'downloaded', version: info?.version ?? state.version };
        broadcast();
        if (autoInstallOnDownloaded) {
            setTimeout(() => quitAndInstall(), 1500);
        }
    });

    autoUpdater.on('error', err => {
        console.error('[updater] error:', err);
        autoInstallOnDownloaded = false;
        state = { status: 'idle' };
        broadcast();
    });
}

export function getUpdateState(): UpdateState {
    return state;
}

export async function checkForUpdates(): Promise<void> {
    if (isDev || isPortable || !initialized) return;
    try {
        await autoUpdater.checkForUpdates();
    } catch (err) {
        console.error('[updater] checkForUpdates failed:', err);
    }
}

export async function downloadUpdate(): Promise<void> {
    if (isDev || isPortable || !initialized) return;
    autoInstallOnDownloaded = true;
    try {
        await autoUpdater.downloadUpdate();
    } catch (err) {
        autoInstallOnDownloaded = false;
        console.error('[updater] downloadUpdate failed:', err);
    }
}

export function quitAndInstall(): void {
    if (isDev || isPortable || !initialized) return;
    setImmediate(() => {
        for (const win of BrowserWindow.getAllWindows()) {
            if (!win.isDestroyed()) {
                win.destroy();
            }
        }
        autoUpdater.quitAndInstall(false, true);
    });
}

export function scheduleStartupCheck(window: BrowserWindow, delayMs = 3000): void {
    if (isDev || isPortable || startupCheckScheduled) return;
    startupCheckScheduled = true;

    const run = () => {
        setTimeout(() => {
            checkForUpdates();
        }, delayMs);
    };

    if (window.webContents.isLoading()) {
        window.webContents.once('did-finish-load', run);
    } else {
        run();
    }
}

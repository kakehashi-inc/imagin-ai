import path from 'path';
import { app, BrowserWindow, nativeTheme, ipcMain, shell } from 'electron';
import { setupConsoleBridge, setMainWindow } from './utils/console-bridge';
import { registerIpcHandlers } from './ipc/index';
import { loadSettings, mergeSettings, ensureHistoryDir } from './services/settings-service';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: false,
        titleBarStyle: 'hidden',
        webPreferences: {
            preload: path.join(__dirname, '../preload/index.js'),
        },
        show: false,
    });

    // Set main window for console bridge
    setMainWindow(mainWindow);

    // DevTools keyboard toggle (F12 / Ctrl+Shift+I / Cmd+Option+I)
    mainWindow.webContents.on('before-input-event', (event, input) => {
        const isToggleCombo =
            (input.key?.toLowerCase?.() === 'i' && (input.control || input.meta) && input.shift) || input.key === 'F12';
        if (isToggleCombo) {
            event.preventDefault();
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.toggleDevTools();
            }
        }
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:3001');
        try {
            mainWindow.webContents.openDevTools({ mode: 'detach' });
        } catch {
            // Ignore DevTools open failure
        }
    } else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    // Open external links in the default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https://') || url.startsWith('http://')) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });

    mainWindow.on('ready-to-show', () => mainWindow?.show());
    // Close all modeless viewer/player windows before the main window itself closes
    mainWindow.on('close', () => {
        for (const win of BrowserWindow.getAllWindows()) {
            if (win !== mainWindow && !win.isDestroyed()) {
                win.destroy();
            }
        }
    });
    mainWindow.on('closed', () => {
        setMainWindow(null);
        mainWindow = null;
    });
}

app.whenReady().then(async () => {
    // Setup console bridge
    setupConsoleBridge();

    // Ensure history directory exists
    ensureHistoryDir();

    // Load saved settings and apply theme
    const settings = loadSettings();
    if (settings.theme !== 'system') {
        nativeTheme.themeSource = settings.theme;
    }

    // Register application IPC handlers
    registerIpcHandlers();

    // App info IPC
    ipcMain.handle('app:getInfo', async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pkg = require('../../package.json');
        const currentSettings = loadSettings();
        return {
            name: app.getName() || pkg.name || 'ImaginAI',
            version: pkg.version || app.getVersion(),
            language: currentSettings.language,
            theme: currentSettings.theme,
            os: process.platform as 'win32' | 'darwin' | 'linux',
        };
    });

    ipcMain.handle('app:setTheme', (_e, theme: 'light' | 'dark' | 'system') => {
        nativeTheme.themeSource = theme;
        mergeSettings({ theme });
        return { theme };
    });

    ipcMain.handle('app:setLanguage', (_e, lang: 'ja' | 'en') => {
        mergeSettings({ language: lang });
        return { language: lang };
    });

    // Window control IPC
    ipcMain.handle('window:minimize', () => {
        mainWindow?.minimize();
    });
    ipcMain.handle('window:maximizeOrRestore', () => {
        if (!mainWindow) return false;
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
            return false;
        }
        mainWindow.maximize();
        return true;
    });
    ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false);
    ipcMain.handle('window:close', () => {
        mainWindow?.close();
    });

    createWindow();
});

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

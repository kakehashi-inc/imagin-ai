/* eslint-disable no-console -- This module wraps every console method (log /
   info / debug included) so main-process output also reaches DevTools; it has
   to read and replace those methods by name. */
import { BrowserWindow } from 'electron';

let mainWindow: BrowserWindow | null = null;

export function setMainWindow(window: BrowserWindow | null) {
    mainWindow = window;
}

function sendToRenderer(level: 'log' | 'error' | 'warn' | 'info' | 'debug', ...args: unknown[]) {
    // Send to renderer process for DevTools output
    if (mainWindow && !mainWindow.isDestroyed()) {
        try {
            // Serialize arguments for IPC (handle objects, errors, etc.)
            const serializedArgs = args.map(arg => {
                if (arg instanceof Error) {
                    return {
                        type: 'error',
                        message: arg.message,
                        stack: arg.stack,
                        name: arg.name,
                    };
                } else if (typeof arg === 'object' && arg !== null) {
                    try {
                        return {
                            type: 'object',
                            value: JSON.stringify(arg, null, 2),
                        };
                    } catch {
                        return {
                            type: 'object',
                            value: String(arg),
                        };
                    }
                } else {
                    return {
                        type: 'primitive',
                        value: String(arg),
                    };
                }
            });
            mainWindow.webContents.send('main:console', { level, args: serializedArgs });
        } catch {
            // Ignore errors when sending to renderer
        }
    }
}

const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
};

export function setupConsoleBridge() {
    // Override console methods to also send to renderer
    console.log = (...args: unknown[]) => {
        originalConsole.log(...args);
        sendToRenderer('log', ...args);
    };

    console.error = (...args: unknown[]) => {
        originalConsole.error(...args);
        sendToRenderer('error', ...args);
    };

    console.warn = (...args: unknown[]) => {
        originalConsole.warn(...args);
        sendToRenderer('warn', ...args);
    };

    console.info = (...args: unknown[]) => {
        originalConsole.info(...args);
        sendToRenderer('info', ...args);
    };

    console.debug = (...args: unknown[]) => {
        originalConsole.debug(...args);
        sendToRenderer('debug', ...args);
    };
}

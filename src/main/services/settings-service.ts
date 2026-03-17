import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import type { AppSettings, AppLanguage, AppTheme } from '../../shared/types';

const SETTINGS_FILE_NAME = 'settings.json';

function getDefaultHistoryDir(): string {
    return path.join(app.getPath('userData'), 'history');
}

function getSettingsFilePath(): string {
    return path.join(app.getPath('userData'), SETTINGS_FILE_NAME);
}

function getDefaultSettings(): AppSettings {
    return {
        language: app.getLocale().startsWith('ja') ? 'ja' : 'en',
        theme: 'system',
        historyDir: getDefaultHistoryDir(),
    };
}

export function loadSettings(): AppSettings {
    const filePath = getSettingsFilePath();
    try {
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf-8');
            const parsed = JSON.parse(raw) as Partial<AppSettings>;
            const defaults = getDefaultSettings();
            return {
                language: (parsed.language as AppLanguage) || defaults.language,
                theme: (parsed.theme as AppTheme) || defaults.theme,
                historyDir: parsed.historyDir || defaults.historyDir,
            };
        }
    } catch (err) {
        console.error('Failed to load settings:', err);
    }
    return getDefaultSettings();
}

export function saveSettings(settings: AppSettings): void {
    const filePath = getSettingsFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(settings, null, 4), 'utf-8');
}

export function mergeSettings(partial: Partial<AppSettings>): AppSettings {
    const current = loadSettings();
    const merged: AppSettings = {
        ...current,
        ...partial,
    };
    saveSettings(merged);
    return merged;
}

export function ensureHistoryDir(dir?: string): string {
    const historyDir = dir || loadSettings().historyDir;
    if (!fs.existsSync(historyDir)) {
        fs.mkdirSync(historyDir, { recursive: true });
    }
    return historyDir;
}

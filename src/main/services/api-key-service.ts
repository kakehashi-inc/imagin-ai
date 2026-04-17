import { safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import {
    API_KEY_CUSTOM_MAX,
    API_KEY_ID_DEFAULT,
    API_KEY_ID_FREE_TIER,
    API_KEY_ID_CUSTOM_PREFIX,
} from '../../shared/constants';
import type { ApiKeysData, ApiKeyCustomEntry, ActiveKeyInfo, ApiKeyOption } from '../../shared/types';

const API_KEYS_FILE = 'api-keys.enc';

function getKeysFilePath(): string {
    return path.join(app.getPath('userData'), API_KEYS_FILE);
}

function emptyData(): ApiKeysData {
    return {
        defaultKey: '',
        defaultIsFreeTier: false,
        freeTierKey: '',
        customs: [],
        activeId: API_KEY_ID_DEFAULT,
    };
}

function sanitizeCustoms(raw: unknown): ApiKeyCustomEntry[] {
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, API_KEY_CUSTOM_MAX).map(entry => {
        const e = entry as Record<string, unknown>;
        return {
            title: typeof e?.title === 'string' ? e.title : '',
            key: typeof e?.key === 'string' ? e.key : '',
            isFreeTier: Boolean(e?.isFreeTier),
        };
    });
}

function sanitizeData(parsed: unknown): ApiKeysData {
    const p = parsed as Record<string, unknown> | null;
    if (!p || typeof p !== 'object') return emptyData();

    // Legacy migration: { gemini: "xxx" } -> new structure with defaultKey
    if (typeof p.gemini === 'string' && p.defaultKey === undefined) {
        return {
            defaultKey: p.gemini,
            defaultIsFreeTier: false,
            freeTierKey: '',
            customs: [],
            activeId: API_KEY_ID_DEFAULT,
        };
    }

    const customs = sanitizeCustoms(p.customs);
    const activeId = typeof p.activeId === 'string' ? p.activeId : API_KEY_ID_DEFAULT;
    return {
        defaultKey: typeof p.defaultKey === 'string' ? p.defaultKey : '',
        defaultIsFreeTier: typeof p.defaultIsFreeTier === 'boolean' ? p.defaultIsFreeTier : false,
        freeTierKey: typeof p.freeTierKey === 'string' ? p.freeTierKey : '',
        customs,
        activeId: validateActiveId(activeId, customs),
    };
}

function validateActiveId(id: string, customs: ApiKeyCustomEntry[]): string {
    if (id === API_KEY_ID_DEFAULT || id === API_KEY_ID_FREE_TIER) return id;
    if (id.startsWith(API_KEY_ID_CUSTOM_PREFIX)) {
        const idx = Number(id.slice(API_KEY_ID_CUSTOM_PREFIX.length));
        if (Number.isInteger(idx) && idx >= 0 && idx < customs.length) return id;
    }
    return API_KEY_ID_DEFAULT;
}

function loadData(): ApiKeysData {
    const filePath = getKeysFilePath();
    try {
        if (fs.existsSync(filePath)) {
            const encrypted = fs.readFileSync(filePath);
            if (safeStorage.isEncryptionAvailable()) {
                const decrypted = safeStorage.decryptString(encrypted);
                return sanitizeData(JSON.parse(decrypted));
            }
        }
    } catch (err) {
        console.error('Failed to load API keys:', err);
    }
    return emptyData();
}

function writeData(data: ApiKeysData): boolean {
    const filePath = getKeysFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(JSON.stringify(data));
        fs.writeFileSync(filePath, encrypted);
        return true;
    }
    console.warn('Encryption not available, storing keys in plain text is not supported.');
    return false;
}

export function getApiKeysData(): ApiKeysData {
    return loadData();
}

export function saveApiKeysData(incoming: Partial<ApiKeysData>): { success: boolean; data: ApiKeysData } {
    const current = loadData();
    const customs = incoming.customs !== undefined ? sanitizeCustoms(incoming.customs) : current.customs;
    const merged: ApiKeysData = {
        defaultKey: incoming.defaultKey ?? current.defaultKey,
        defaultIsFreeTier: incoming.defaultIsFreeTier ?? current.defaultIsFreeTier,
        freeTierKey: incoming.freeTierKey ?? current.freeTierKey,
        customs,
        activeId: validateActiveId(incoming.activeId ?? current.activeId, customs),
    };
    const saved = writeData(merged);
    return { success: saved, data: merged };
}

export function setActiveApiKeyId(id: string): { success: boolean; data: ApiKeysData } {
    const current = loadData();
    const newId = validateActiveId(id, current.customs);
    const updated: ApiKeysData = { ...current, activeId: newId };
    const saved = writeData(updated);
    return { success: saved, data: updated };
}

function getActiveEntry(data: ApiKeysData): {
    key: string;
    title: string;
    isFreeTier: boolean;
    kind: 'default' | 'freeTier' | 'custom';
} {
    if (data.activeId === API_KEY_ID_FREE_TIER) {
        return { key: data.freeTierKey, title: '', isFreeTier: true, kind: 'freeTier' };
    }
    if (data.activeId.startsWith(API_KEY_ID_CUSTOM_PREFIX)) {
        const idx = Number(data.activeId.slice(API_KEY_ID_CUSTOM_PREFIX.length));
        const entry = data.customs[idx];
        if (entry) {
            return { key: entry.key, title: entry.title, isFreeTier: entry.isFreeTier, kind: 'custom' };
        }
    }
    return { key: data.defaultKey, title: '', isFreeTier: data.defaultIsFreeTier, kind: 'default' };
}

export function getActiveApiKey(): string {
    const data = loadData();
    return getActiveEntry(data).key;
}

export function getActiveKeyInfo(): ActiveKeyInfo {
    const data = loadData();
    const entry = getActiveEntry(data);
    return {
        id: data.activeId,
        kind: entry.kind,
        title: entry.title,
        isFreeTier: entry.isFreeTier,
        hasKey: entry.key.length > 0,
    };
}

export function listApiKeyOptions(): ApiKeyOption[] {
    const data = loadData();
    const options: ApiKeyOption[] = [
        {
            id: API_KEY_ID_DEFAULT,
            kind: 'default',
            title: '',
            hasKey: data.defaultKey.length > 0,
            isFreeTier: data.defaultIsFreeTier,
        },
        {
            id: API_KEY_ID_FREE_TIER,
            kind: 'freeTier',
            title: '',
            hasKey: data.freeTierKey.length > 0,
            isFreeTier: true,
        },
    ];
    data.customs.forEach((c, i) => {
        options.push({
            id: `${API_KEY_ID_CUSTOM_PREFIX}${i}`,
            kind: 'custom',
            title: c.title,
            hasKey: c.key.length > 0,
            isFreeTier: c.isFreeTier,
        });
    });
    return options;
}

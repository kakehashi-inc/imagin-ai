import { safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import {
    API_KEY_CUSTOM_MAX,
    API_KEY_SCHEMA_VERSION,
    GEMINI_API_VERSION,
    makeApiKeyId,
    parseApiKeyId,
} from '../../shared/constants';
import type {
    ActiveKeyInfo,
    ApiKeySlot,
    ApiKeysData,
    ApiProvider,
    ApiTestResult,
    ProviderKeySet,
} from '../../shared/types';

const API_KEYS_FILE = 'api-keys.enc';
const API_KEYS_BACKUP_FILE = 'api-keys.enc.bak.v1';

function getKeysFilePath(): string {
    return path.join(app.getPath('userData'), API_KEYS_FILE);
}

function getBackupFilePath(): string {
    return path.join(app.getPath('userData'), API_KEYS_BACKUP_FILE);
}

// =============================================================================
// Defaults
// =============================================================================

function emptySlot(isFreeTier: boolean): ApiKeySlot {
    return { key: '', isFreeTier, title: '' };
}

function emptyProviderKeySet(): ProviderKeySet {
    return {
        default: emptySlot(false),
        freeTier: emptySlot(true),
        customs: [],
    };
}

function emptyData(): ApiKeysData {
    return {
        schemaVersion: API_KEY_SCHEMA_VERSION,
        providers: {
            gemini: emptyProviderKeySet(),
            openai: emptyProviderKeySet(),
        },
        activeId: makeApiKeyId('gemini', 'default'),
    };
}

// =============================================================================
// Sanitization & validation (new schema)
// =============================================================================

function sanitizeSlot(raw: unknown, defaultIsFreeTier: boolean): ApiKeySlot {
    const r = (raw ?? {}) as Record<string, unknown>;
    return {
        key: typeof r.key === 'string' ? r.key : '',
        isFreeTier: typeof r.isFreeTier === 'boolean' ? r.isFreeTier : defaultIsFreeTier,
        title: typeof r.title === 'string' ? r.title : '',
    };
}

function sanitizeCustomSlots(raw: unknown): ApiKeySlot[] {
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, API_KEY_CUSTOM_MAX).map(entry => sanitizeSlot(entry, false));
}

function sanitizeProviderKeySet(raw: unknown): ProviderKeySet {
    const r = (raw ?? {}) as Record<string, unknown>;
    return {
        default: sanitizeSlot(r.default, false),
        freeTier: sanitizeSlot(r.freeTier, true),
        customs: sanitizeCustomSlots(r.customs),
    };
}

function validateActiveId(id: string, data: { providers: Record<ApiProvider, ProviderKeySet> }): string {
    const parsed = parseApiKeyId(id);
    if (!parsed) return makeApiKeyId('gemini', 'default');
    const set = data.providers[parsed.provider];
    if (!set) return makeApiKeyId('gemini', 'default');
    if (parsed.kind === 'default') return id;
    if (parsed.kind === 'freeTier') return id;
    if (parsed.kind === 'custom') {
        const idx = parsed.index!;
        if (idx >= 0 && idx < set.customs.length) return id;
    }
    return makeApiKeyId('gemini', 'default');
}

function sanitizeNewSchema(parsed: Record<string, unknown>): ApiKeysData {
    const providersRaw = (parsed.providers ?? {}) as Record<string, unknown>;
    const providers: Record<ApiProvider, ProviderKeySet> = {
        gemini: sanitizeProviderKeySet(providersRaw.gemini),
        openai: sanitizeProviderKeySet(providersRaw.openai),
    };
    const rawActive = typeof parsed.activeId === 'string' ? parsed.activeId : makeApiKeyId('gemini', 'default');
    return {
        schemaVersion: API_KEY_SCHEMA_VERSION,
        providers,
        activeId: validateActiveId(rawActive, { providers }),
    };
}

// =============================================================================
// Migration (legacy v1 / pre-v1 -> v2)
// =============================================================================

function migrateLegacyActiveId(legacyId: string): string {
    // Legacy ids had no provider prefix: 'default' / 'freeTier' / 'custom:N'.
    // Everything legacy is Gemini.
    if (legacyId === 'default') return makeApiKeyId('gemini', 'default');
    if (legacyId === 'freeTier') return makeApiKeyId('gemini', 'freeTier');
    if (legacyId.startsWith('custom:')) {
        const idx = Number(legacyId.slice('custom:'.length));
        if (Number.isInteger(idx) && idx >= 0) {
            return makeApiKeyId('gemini', `custom:${idx}` as const);
        }
    }
    // Already prefixed (e.g. user manually set), let validateActiveId handle it.
    return legacyId;
}

function migrateFromLegacy(parsed: Record<string, unknown>): ApiKeysData {
    // Pre-pre-v1: { gemini: "<rawKey>" } -> single default key.
    if (typeof parsed.gemini === 'string' && parsed.defaultKey === undefined) {
        const gemini: ProviderKeySet = {
            default: { key: parsed.gemini as string, isFreeTier: false, title: '' },
            freeTier: emptySlot(true),
            customs: [],
        };
        return {
            schemaVersion: API_KEY_SCHEMA_VERSION,
            providers: { gemini, openai: emptyProviderKeySet() },
            activeId: makeApiKeyId('gemini', 'default'),
        };
    }

    // v1: flat fields on the top-level (defaultKey, freeTierKey, customs[], activeId, defaultIsFreeTier).
    const defaultKey = typeof parsed.defaultKey === 'string' ? parsed.defaultKey : '';
    const defaultIsFreeTier = typeof parsed.defaultIsFreeTier === 'boolean' ? parsed.defaultIsFreeTier : false;
    const freeTierKey = typeof parsed.freeTierKey === 'string' ? parsed.freeTierKey : '';
    const customsRaw = Array.isArray(parsed.customs) ? parsed.customs : [];
    const customs: ApiKeySlot[] = customsRaw.slice(0, API_KEY_CUSTOM_MAX).map(entry => {
        const e = (entry ?? {}) as Record<string, unknown>;
        return {
            key: typeof e.key === 'string' ? e.key : '',
            isFreeTier: typeof e.isFreeTier === 'boolean' ? e.isFreeTier : false,
            title: typeof e.title === 'string' ? e.title : '',
        };
    });
    const gemini: ProviderKeySet = {
        default: { key: defaultKey, isFreeTier: defaultIsFreeTier, title: '' },
        freeTier: { key: freeTierKey, isFreeTier: true, title: '' },
        customs,
    };
    const activeRaw = typeof parsed.activeId === 'string' ? parsed.activeId : 'default';
    const migrated: ApiKeysData = {
        schemaVersion: API_KEY_SCHEMA_VERSION,
        providers: { gemini, openai: emptyProviderKeySet() },
        activeId: makeApiKeyId('gemini', 'default'),
    };
    migrated.activeId = validateActiveId(migrateLegacyActiveId(activeRaw), migrated);
    return migrated;
}

// =============================================================================
// Load / Write (encrypted via safeStorage)
// =============================================================================

function writeBackup(encryptedBuf: Buffer): void {
    try {
        const backupPath = getBackupFilePath();
        if (!fs.existsSync(backupPath)) {
            fs.writeFileSync(backupPath, encryptedBuf);
        }
    } catch (err) {
        console.warn('Failed to write API keys backup:', err);
    }
}

async function writeEncrypted(data: ApiKeysData): Promise<boolean> {
    const filePath = getKeysFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!(await safeStorage.isAsyncEncryptionAvailable())) {
        console.warn('Encryption not available, storing keys in plain text is not supported.');
        return false;
    }
    const encrypted = await safeStorage.encryptStringAsync(JSON.stringify(data));
    fs.writeFileSync(filePath, encrypted);
    return true;
}

async function loadData(): Promise<ApiKeysData> {
    const filePath = getKeysFilePath();
    try {
        if (!fs.existsSync(filePath)) return emptyData();
        if (!(await safeStorage.isAsyncEncryptionAvailable())) return emptyData();

        const encrypted = fs.readFileSync(filePath);
        const { result: decrypted, shouldReEncrypt } = await safeStorage.decryptStringAsync(encrypted);
        const parsed = JSON.parse(decrypted) as Record<string, unknown>;

        // v2: schemaVersion present -> sanitize and return.
        if (parsed && typeof parsed === 'object' && parsed.schemaVersion === API_KEY_SCHEMA_VERSION) {
            const data = sanitizeNewSchema(parsed);
            // The OS key was rotated or upgraded; store the data under the new key.
            if (shouldReEncrypt) await writeEncrypted(data);
            return data;
        }

        // Anything else: migrate. Save a one-time backup of the original
        // encrypted blob before overwriting with the new schema.
        writeBackup(encrypted);
        const migrated = migrateFromLegacy(parsed ?? {});
        await writeEncrypted(migrated);
        return migrated;
    } catch (err) {
        console.error('Failed to load API keys:', err);
        return emptyData();
    }
}

// =============================================================================
// Public API
// =============================================================================

export async function getApiKeysData(): Promise<ApiKeysData> {
    return loadData();
}

export async function saveApiKeysData(incoming: ApiKeysData): Promise<{ success: boolean; data: ApiKeysData }> {
    // Always re-sanitize the incoming payload before persisting.
    const sanitized = sanitizeNewSchema(incoming as unknown as Record<string, unknown>);
    const saved = await writeEncrypted(sanitized);
    return { success: saved, data: sanitized };
}

export async function setActiveApiKeyId(id: string): Promise<{ success: boolean; data: ApiKeysData }> {
    const current = await loadData();
    const newId = validateActiveId(id, current);
    const updated: ApiKeysData = { ...current, activeId: newId };
    const saved = await writeEncrypted(updated);
    return { success: saved, data: updated };
}

function getActiveEntry(data: ApiKeysData): {
    provider: ApiProvider;
    kind: 'default' | 'freeTier' | 'custom';
    slot: ApiKeySlot;
} {
    const parsed = parseApiKeyId(data.activeId);
    const fallback = data.providers.gemini.default;
    if (!parsed) {
        return { provider: 'gemini', kind: 'default', slot: fallback };
    }
    const set = data.providers[parsed.provider];
    if (parsed.kind === 'default') return { provider: parsed.provider, kind: 'default', slot: set.default };
    if (parsed.kind === 'freeTier') return { provider: parsed.provider, kind: 'freeTier', slot: set.freeTier };
    if (parsed.kind === 'custom') {
        const slot = set.customs[parsed.index!];
        if (slot) return { provider: parsed.provider, kind: 'custom', slot };
    }
    return { provider: 'gemini', kind: 'default', slot: fallback };
}

// Returns the active key string (empty if not configured) together with the
// provider derived from the active key id, read in one decryption pass.
export async function getActiveKeyAndProvider(): Promise<{ key: string; provider: ApiProvider }> {
    const entry = getActiveEntry(await loadData());
    return { key: entry.slot.key, provider: entry.provider };
}

export async function getActiveKeyInfo(): Promise<ActiveKeyInfo> {
    const data = await loadData();
    const entry = getActiveEntry(data);
    return {
        id: data.activeId,
        provider: entry.provider,
        kind: entry.kind,
        title: entry.slot.title ?? '',
        isFreeTier: entry.slot.isFreeTier,
        hasKey: entry.slot.key.length > 0,
    };
}

// =============================================================================
// testApiKey: provider-specific validation
// =============================================================================

// Dynamically import providers' SDKs only when needed to keep the hot startup
// path light. SDK errors are normalized into the renderer-visible ApiTestResult.
async function testGeminiKey(key: string): Promise<ApiTestResult> {
    try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: key, apiVersion: GEMINI_API_VERSION });
        // models.list returns a Pager; iterating once is enough to confirm auth.
        const pager = await ai.models.list();
        // Pull at least one page so a 401 surfaces.
        for await (const _model of pager) {
            void _model;
            break;
        }
        return { success: true, status: 'KEY_VALID', rawMessage: null };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // SDK throws on 401/403; treat those as INVALID, anything else as TEST_ERROR.
        if (/401|403|UNAUTHENTICATED|PERMISSION_DENIED/i.test(message)) {
            return { success: false, status: 'KEY_INVALID', rawMessage: message };
        }
        return { success: false, status: 'TEST_ERROR', rawMessage: message };
    }
}

async function testOpenAIKey(key: string): Promise<ApiTestResult> {
    try {
        const OpenAI = (await import('openai')).default;
        const client = new OpenAI({ apiKey: key });
        // Listing models is the cheapest authenticated endpoint.
        await client.models.list();
        return { success: true, status: 'KEY_VALID', rawMessage: null };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (/401|403|invalid_api_key/i.test(message)) {
            return { success: false, status: 'KEY_INVALID', rawMessage: message };
        }
        return { success: false, status: 'TEST_ERROR', rawMessage: message };
    }
}

export async function testApiKey(provider: ApiProvider, rawKey: string): Promise<ApiTestResult> {
    if (!rawKey) {
        return { success: false, status: 'KEY_NOT_SET', rawMessage: null };
    }
    if (provider === 'gemini') return testGeminiKey(rawKey);
    if (provider === 'openai') return testOpenAIKey(rawKey);
    return { success: false, status: 'TEST_ERROR', rawMessage: `Unknown provider: ${provider}` };
}

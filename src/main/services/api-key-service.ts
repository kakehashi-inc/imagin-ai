import { safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

const API_KEYS_FILE = 'api-keys.enc';

function getKeysFilePath(): string {
    return path.join(app.getPath('userData'), API_KEYS_FILE);
}

function loadEncryptedKeys(): Record<string, string> {
    const filePath = getKeysFilePath();
    try {
        if (fs.existsSync(filePath)) {
            const encrypted = fs.readFileSync(filePath);
            if (safeStorage.isEncryptionAvailable()) {
                const decrypted = safeStorage.decryptString(encrypted);
                return JSON.parse(decrypted);
            }
        }
    } catch (err) {
        console.error('Failed to load API keys:', err);
    }
    return {};
}

function saveEncryptedKeys(keys: Record<string, string>): void {
    const filePath = getKeysFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(JSON.stringify(keys));
        fs.writeFileSync(filePath, encrypted);
    } else {
        console.warn('Encryption not available, storing keys in plain text is not supported.');
        throw new Error('Encryption is not available on this system.');
    }
}

export function getApiKey(provider: string): string {
    const keys = loadEncryptedKeys();
    return keys[provider] || '';
}

export function saveApiKey(provider: string, key: string): void {
    const keys = loadEncryptedKeys();
    if (key) {
        keys[provider] = key;
    } else {
        delete keys[provider];
    }
    saveEncryptedKeys(keys);
}

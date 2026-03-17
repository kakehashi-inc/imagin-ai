import enTranslations from '../../renderer/i18n/locales/en';
import jaTranslations from '../../renderer/i18n/locales/ja';

const resources: Record<string, Record<string, string>> = {
    en: enTranslations,
    ja: jaTranslations,
};

/**
 * Simple translation function for Main process use.
 * Locale data is shared with the Renderer i18n locale files.
 */
export function translate(lang: string, key: string, params?: Record<string, string | number>): string {
    const translations = resources[lang] || resources['en'];
    let text = translations[key] ?? resources['en'][key] ?? key;
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
        }
    }
    return text;
}

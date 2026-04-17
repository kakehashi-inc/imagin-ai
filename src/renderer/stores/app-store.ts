import { create } from 'zustand';
import type { ActiveKeyInfo, AppInfo, AppLanguage, AppTheme, AppSettings } from '../../shared/types';

type AppState = {
    info: AppInfo | undefined;
    settings: AppSettings | undefined;
    activeKeyInfo: ActiveKeyInfo | undefined;
    initialized: boolean;
    // Actions
    initialize: () => Promise<void>;
    setTheme: (theme: AppTheme) => Promise<void>;
    setLanguage: (language: AppLanguage) => Promise<void>;
    loadSettings: () => Promise<void>;
    updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
    refreshActiveKeyInfo: () => Promise<void>;
    setActiveApiKey: (id: string) => Promise<void>;
};

export const useAppStore = create<AppState>((set, get) => ({
    info: undefined,
    settings: undefined,
    activeKeyInfo: undefined,
    initialized: false,

    initialize: async () => {
        const info = await window.imaginai.getAppInfo();
        const settings = await window.imaginai.getSettings();
        const activeKeyInfo = await window.imaginai.getActiveKeyInfo();
        set({ info, settings, activeKeyInfo, initialized: true });
    },

    setTheme: async (theme: AppTheme) => {
        await window.imaginai.setTheme(theme);
        const state = get();
        set({
            info: state.info ? { ...state.info, theme } : state.info,
            settings: state.settings ? { ...state.settings, theme } : state.settings,
        });
    },

    setLanguage: async (language: AppLanguage) => {
        await window.imaginai.setLanguage(language);
        const state = get();
        set({
            info: state.info ? { ...state.info, language } : state.info,
            settings: state.settings ? { ...state.settings, language } : state.settings,
        });
    },

    loadSettings: async () => {
        const settings = await window.imaginai.getSettings();
        set({ settings });
    },

    updateSettings: async (partial: Partial<AppSettings>) => {
        const settings = await window.imaginai.saveSettings(partial);
        set({ settings });
    },

    refreshActiveKeyInfo: async () => {
        const activeKeyInfo = await window.imaginai.getActiveKeyInfo();
        set({ activeKeyInfo });
    },

    setActiveApiKey: async (id: string) => {
        await window.imaginai.setActiveApiKeyId(id);
        const activeKeyInfo = await window.imaginai.getActiveKeyInfo();
        set({ activeKeyInfo });
    },
}));

import { create } from 'zustand';
import type { HistoryEntry } from '../../shared/types';
import { HISTORY_MAX_COUNT } from '../../shared/constants';

type HistoryState = {
    entries: HistoryEntry[];
    thumbnails: Map<string, string>;
    searchQuery: string;
    isLoading: boolean;
    // Actions
    loadHistory: () => Promise<void>;
    setSearchQuery: (query: string) => void;
    deleteEntry: (id: string) => Promise<void>;
    deleteAll: () => Promise<void>;
    exportAll: () => Promise<{ success: boolean; path?: string }>;
    getFilteredEntries: () => HistoryEntry[];
    isOverLimit: () => boolean;
    getCount: () => number;
    loadThumbnail: (imagePath: string) => Promise<void>;
};

export const useHistoryStore = create<HistoryState>((set, get) => ({
    entries: [],
    thumbnails: new Map(),
    searchQuery: '',
    isLoading: false,

    loadHistory: async () => {
        set({ isLoading: true });
        try {
            const entries = await window.imaginai.getAllHistory();
            set({ entries });

            // Load thumbnails for first image of each entry
            for (const entry of entries) {
                if (entry.generatedImagePaths.length > 0) {
                    get().loadThumbnail(entry.generatedImagePaths[0]);
                }
            }
        } catch (err) {
            console.error('Failed to load history:', err);
        } finally {
            set({ isLoading: false });
        }
    },

    setSearchQuery: (query: string) => set({ searchQuery: query }),

    deleteEntry: async (id: string) => {
        await window.imaginai.deleteHistory(id);
        const state = get();
        set({ entries: state.entries.filter(e => e.id !== id) });
    },

    deleteAll: async () => {
        await window.imaginai.deleteAllHistory();
        set({ entries: [], thumbnails: new Map() });
    },

    exportAll: async () => {
        return await window.imaginai.exportAllHistory();
    },

    getFilteredEntries: () => {
        const state = get();
        if (!state.searchQuery.trim()) {
            return state.entries;
        }
        const query = state.searchQuery.toLowerCase();
        return state.entries.filter(e => e.prompt.toLowerCase().includes(query));
    },

    isOverLimit: () => {
        return get().entries.length >= HISTORY_MAX_COUNT;
    },

    getCount: () => {
        return get().entries.length;
    },

    loadThumbnail: async (imagePath: string) => {
        const state = get();
        if (state.thumbnails.has(imagePath)) return;
        try {
            const dataUrl = await window.imaginai.getThumbnail(imagePath);
            if (dataUrl) {
                const newThumbnails = new Map(get().thumbnails);
                newThumbnails.set(imagePath, dataUrl);
                set({ thumbnails: newThumbnails });
            }
        } catch (err) {
            console.error('Failed to load thumbnail:', err);
        }
    },
}));

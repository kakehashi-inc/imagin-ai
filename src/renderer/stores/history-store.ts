import { create } from 'zustand';
import type { HistoryEntry } from '../../shared/types';
import { HISTORY_MAX_COUNT, HISTORY_PAGE_SIZE } from '../../shared/constants';

type HistoryState = {
    entries: HistoryEntry[];
    totalCount: number;
    thumbnails: Map<string, string>;
    searchQuery: string;
    isLoading: boolean;
    hasMore: boolean;
    // Actions
    loadHistory: () => Promise<void>;
    loadMore: () => Promise<void>;
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
    totalCount: 0,
    thumbnails: new Map(),
    searchQuery: '',
    isLoading: false,
    hasMore: true,

    loadHistory: async () => {
        set({ isLoading: true, entries: [], thumbnails: new Map(), hasMore: true });
        try {
            const result = await window.imaginai.getHistoryPage(0, HISTORY_PAGE_SIZE);
            set({
                entries: result.entries,
                totalCount: result.total,
                hasMore: result.entries.length < result.total,
            });
        } catch (err) {
            console.error('Failed to load history:', err);
        } finally {
            set({ isLoading: false });
        }
    },

    loadMore: async () => {
        const state = get();
        if (state.isLoading || !state.hasMore) return;

        set({ isLoading: true });
        try {
            const offset = state.entries.length;
            const result = await window.imaginai.getHistoryPage(offset, HISTORY_PAGE_SIZE);
            const merged = [...state.entries, ...result.entries];
            set({
                entries: merged,
                totalCount: result.total,
                hasMore: merged.length < result.total,
            });
        } catch (err) {
            console.error('Failed to load more history:', err);
        } finally {
            set({ isLoading: false });
        }
    },

    setSearchQuery: (query: string) => set({ searchQuery: query }),

    deleteEntry: async (id: string) => {
        await window.imaginai.deleteHistory(id);
        const state = get();
        set({
            entries: state.entries.filter(e => e.id !== id),
            totalCount: state.totalCount - 1,
        });
    },

    deleteAll: async () => {
        await window.imaginai.deleteAllHistory();
        set({ entries: [], thumbnails: new Map(), totalCount: 0, hasMore: false });
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
        return get().totalCount >= HISTORY_MAX_COUNT;
    },

    getCount: () => {
        return get().totalCount;
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

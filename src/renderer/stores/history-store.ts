import { create } from 'zustand';
import type { ApiProvider, HistoryEntry, MediaType } from '../../shared/types';
import { HISTORY_MAX_COUNT, HISTORY_PAGE_SIZE } from '../../shared/constants';

// 'all' acts as the no-filter sentinel for both provider and mediaType filters.
export type ProviderFilter = ApiProvider | 'all';
export type MediaTypeFilter = MediaType | 'all';

type HistoryState = {
    entries: HistoryEntry[];
    totalCount: number;
    thumbnails: Map<string, string>;
    searchQuery: string;
    filterModel: string;
    filterProvider: ProviderFilter;
    filterMediaType: MediaTypeFilter;
    isLoading: boolean;
    hasMore: boolean;
    // Actions
    loadHistory: () => Promise<void>;
    loadMore: () => Promise<void>;
    setSearchQuery: (query: string) => void;
    setFilterModel: (model: string) => void;
    setFilterProvider: (provider: ProviderFilter) => void;
    setFilterMediaType: (mediaType: MediaTypeFilter) => void;
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
    filterModel: '',
    filterProvider: 'all',
    filterMediaType: 'all',
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
    setFilterModel: (model: string) => set({ filterModel: model }),
    setFilterProvider: (provider: ProviderFilter) => set({ filterProvider: provider }),
    setFilterMediaType: (mediaType: MediaTypeFilter) => set({ filterMediaType: mediaType }),

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
        let result = state.entries;
        if (state.filterProvider !== 'all') {
            result = result.filter(e => e.provider === state.filterProvider);
        }
        if (state.filterMediaType !== 'all') {
            result = result.filter(e => e.mediaType === state.filterMediaType);
        }
        if (state.filterModel) {
            result = result.filter(e => e.model === state.filterModel);
        }
        if (state.searchQuery.trim()) {
            const query = state.searchQuery.toLowerCase();
            result = result.filter(e => e.prompt.toLowerCase().includes(query));
        }
        return result;
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

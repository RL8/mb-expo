import { create } from 'zustand';
import { fetchAlbumsWithMetrics } from '../lib/supabase';

export const useDataStore = create((set, get) => ({
  albums: [],
  songs: [],
  isLoading: true,
  error: null,

  // View state (persists across navigation)
  selectedMetric: 'default',
  subModeIndex: 0,
  sortBy: 'date',

  setSelectedMetric: (metric) => set({ selectedMetric: metric }),
  setSubModeIndex: (index) => set({ subModeIndex: index }),
  setSortBy: (sort) => set({ sortBy: sort }),

  // Combined setter for metric change (resets subMode and updates sort)
  changeMetric: (metric) => set({
    selectedMetric: metric,
    subModeIndex: 0,
    sortBy: metric === 'default' ? 'date' : 'value',
  }),

  cycleSubMode: (subModesLength) => set((state) => ({
    subModeIndex: (state.subModeIndex + 1) % subModesLength,
  })),

  // Load data from Supabase
  loadData: async () => {
    if (get().albums.length > 0) return; // Already loaded

    try {
      set({ isLoading: true, error: null });
      const { albums, songs } = await fetchAlbumsWithMetrics();
      set({ albums, songs, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Get album by slug (display_name converted to slug)
  getAlbumBySlug: (slug) => {
    const albums = get().albums;
    return albums.find(a =>
      a.display_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '') === slug ||
      a.id.toString() === slug
    );
  },

  // Get album by ID
  getAlbumById: (id) => {
    return get().albums.find(a => a.id === id || a.id.toString() === id);
  },

  // Get song by ID
  getSongById: (id) => {
    return get().songs.find(s => s.id === id || s.id.toString() === id);
  },

  // Get songs for an album
  getSongsForAlbum: (albumId) => {
    return get().songs.filter(s => s.album_id === albumId);
  },

  // Get sorted albums
  getSortedAlbums: () => {
    return [...get().albums].sort((a, b) =>
      new Date(a.official_release_date) - new Date(b.official_release_date)
    );
  },
}));

// Helper to generate slug from album name
export function albumToSlug(album) {
  return album.display_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
}

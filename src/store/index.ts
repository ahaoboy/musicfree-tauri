import { create } from 'zustand';
import {
  LocalAudio,
  LocalPlaylist,
  Config,
  get_config,
  save_config,
  get_loacl_url,
} from '../api';

// Playback Mode
export type PlayMode = 'sequence' | 'list-loop' | 'single-loop' | 'shuffle';

// Theme types
export type ThemeMode = 'light' | 'dark' | 'auto';

// App state interface
interface AppState {
  // Config data
  config: Config | null;
  playlists: LocalPlaylist[];
  audios: LocalAudio[];

  // Current playback state
  currentAudio: LocalAudio | null;
  audioUrl: string | null;
  isPlaying: boolean;
  playbackRate: number;
  playMode: PlayMode; // Added
  playbackQueue: LocalAudio[]; // Added

  // Theme
  themeMode: ThemeMode;

  // Loading states
  isConfigLoading: boolean;

  // Audio element reference (managed externally)
  audioElement: HTMLAudioElement | null;

  // Actions
  loadConfig: () => Promise<void>;
  saveConfig: (config: Config) => Promise<void>;
  setThemeMode: (mode: ThemeMode) => void;
  playAudio: (audio: LocalAudio, queue?: LocalAudio[]) => Promise<void>; // Updated signature
  pauseAudio: () => void;
  resumeAudio: () => void;
  togglePlay: () => void;
  playNext: (auto?: boolean) => Promise<void>; // Added
  playPrev: () => Promise<void>; // Added
  togglePlayMode: () => void; // Added
  setAudioElement: (element: HTMLAudioElement | null) => void;
  addAudiosToConfig: (audios: LocalAudio[]) => Promise<void>;
  addPlaylistToConfig: (playlist: LocalPlaylist) => Promise<void>;
  setLastAudio: (audio: LocalAudio) => Promise<void>;
  setPlaybackRate: (rate: number) => void;
  toggleFavorite: (audio: LocalAudio) => Promise<void>;
}

// Helper to get system theme
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return 'light';
};

// Helper to apply theme to document
const applyTheme = (mode: ThemeMode) => {
  if (typeof document !== 'undefined') {
    const actualTheme = mode === 'auto' ? getSystemTheme() : mode;
    document.documentElement.setAttribute(
      'data-prefers-color-scheme',
      actualTheme
    );
  }
};

// Create the store
export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  config: null,
  playlists: [],
  audios: [],
  currentAudio: null,
  audioUrl: null,
  isPlaying: false,
  playbackRate: 1,
  playMode: 'sequence',
  playbackQueue: [],
  themeMode: 'auto',
  isConfigLoading: false,
  audioElement: null,

  // Load config from backend
  loadConfig: async () => {
    set({ isConfigLoading: true });
    try {
      const config = await get_config();
      const savedTheme = localStorage.getItem('themeMode') as ThemeMode | null;
      const themeMode = savedTheme || config.theme as ThemeMode || 'auto';

      applyTheme(themeMode);

      // Sort playlists: Favorites first
      const playlists = (config.playlists || []).sort((a, b) => {
        if (a.id === "Favorites") return -1;
        if (b.id === "Favorites") return 1;
        return 0;
      });

      set({
        config,
        playlists: playlists,
        audios: config.audios || [],
        themeMode,
        currentAudio: config.last_audio || null,
        isConfigLoading: false,
      });

      // Restore playback queue
      if (config.last_audio) {
        const lastAudioId = config.last_audio.audio.id;
        let queue: LocalAudio[] = [];

        // 1. Try to find in playlists
        const foundPlaylist = playlists.find(p => p.audios.some(a => a.audio.id === lastAudioId));
        if (foundPlaylist) {
          queue = foundPlaylist.audios;
        } else {
          // 2. Try to find in all audios (Music list)
          const foundInAll = (config.audios || []).some(a => a.audio.id === lastAudioId);
          if (foundInAll) {
            queue = config.audios || [];
          } else {
            // 3. Fallback to just this audio
            queue = [config.last_audio];
          }
        }
        set({ playbackQueue: queue });
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      set({ isConfigLoading: false });
    }
  },

  // Save config to backend
  saveConfig: async (config: Config) => {
    try {
      await save_config(config);
      set({
        config,
        playlists: config.playlists || [],
        audios: config.audios || [],
      });
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    }
  },

  // Set theme mode
  setThemeMode: (mode: ThemeMode) => {
    localStorage.setItem('themeMode', mode);
    applyTheme(mode);
    set({ themeMode: mode });

    // Also save to config
    const { config } = get();
    if (config) {
      const updatedConfig = { ...config, theme: mode };
      save_config(updatedConfig).catch((error) => {
        console.error('Failed to save theme to config:', error);
      });
    }
  },

  // Set audio element
  setAudioElement: (element: HTMLAudioElement | null) => {
    set({ audioElement: element });
    if (element) {
      element.onended = () => {
        get().playNext(true);
      };
    }
  },

  // Play audio
  playAudio: async (audio: LocalAudio, queue?: LocalAudio[]) => {
    const { audioElement } = get();
    try {
      const url = await get_loacl_url(audio.path);

      // Update queue if provided
      if (queue) {
        set({ playbackQueue: queue });
      }

      set({
        currentAudio: audio,
        audioUrl: url,
        isPlaying: true,
      });

      if (audioElement) {
        audioElement.src = url;
        audioElement.playbackRate = get().playbackRate; // Ensure rate is preserved
        await audioElement.play();
      }

      // Save as last played audio
      get().setLastAudio(audio);
    } catch (error) {
      console.error('Failed to play audio:', error);
      set({ isPlaying: false });
    }
  },

  // Play Next
  playNext: async (auto: boolean = false) => {
    const { currentAudio, playbackQueue, playMode, playAudio } = get();
    if (!currentAudio || playbackQueue.length === 0) return;

    const currentIndex = playbackQueue.findIndex(a => a.audio.id === currentAudio.audio.id);
    if (currentIndex === -1) return; // Should not happen

    let nextIndex = -1;

    if (playMode === 'single-loop') {
      if (auto) {
        nextIndex = currentIndex; // Repeat same
      } else {
        nextIndex = (currentIndex + 1) % playbackQueue.length; // Manual next goes to next
      }
    } else if (playMode === 'shuffle') {
      // Simple random for now
      nextIndex = Math.floor(Math.random() * playbackQueue.length);
    } else if (playMode === 'list-loop') {
      nextIndex = (currentIndex + 1) % playbackQueue.length;
    } else {
      // sequence
      if (currentIndex < playbackQueue.length - 1) {
        nextIndex = currentIndex + 1;
      } else {
        // End of list, stop if auto, or wrap if manual (optional, usually sequence stops)
        if (auto) {
          get().pauseAudio();
          return;
        } else {
          // For manual next at end, maybe wrap or do nothing? Let's wrap for better UX or stop?
          // Standard sequence usually stops. But user might want to go back to start manually.
          nextIndex = 0;
        }
      }
    }

    if (nextIndex >= 0) {
      await playAudio(playbackQueue[nextIndex]);
    }
  },

  // Play Prev
  playPrev: async () => {
    const { currentAudio, playbackQueue, playMode, playAudio } = get();
    if (!currentAudio || playbackQueue.length === 0) return;

    const currentIndex = playbackQueue.findIndex(a => a.audio.id === currentAudio.audio.id);
    if (currentIndex === -1) return;

    let prevIndex = -1;

    if (playMode === 'shuffle') {
      prevIndex = Math.floor(Math.random() * playbackQueue.length);
    } else {
      // For prev, we usually just go back. Logic can be refined.
      prevIndex = (currentIndex - 1 + playbackQueue.length) % playbackQueue.length;
    }

    if (prevIndex >= 0) {
      await playAudio(playbackQueue[prevIndex]);
    }
  },

  // Toggle Play Mode
  togglePlayMode: () => {
    const { playMode } = get();
    const modes: PlayMode[] = ['sequence', 'list-loop', 'single-loop', 'shuffle'];
    const nextIndex = (modes.indexOf(playMode) + 1) % modes.length;
    set({ playMode: modes[nextIndex] });
  },

  // Pause audio
  pauseAudio: () => {
    const { audioElement } = get();
    if (audioElement) {
      audioElement.pause();
    }
    set({ isPlaying: false });
  },

  // Resume audio
  resumeAudio: () => {
    const { audioElement, audioUrl, currentAudio, playAudio } = get();

    // If no URL but we have a current audio, try to play it (lazy load)
    if (!audioUrl && currentAudio) {
      playAudio(currentAudio);
      return;
    }

    if (audioElement && audioUrl) {
      audioElement.play().catch((error) => {
        console.error('Failed to resume audio:', error);
      });
      set({ isPlaying: true });
    }
  },

  // Toggle play/pause
  togglePlay: () => {
    const { isPlaying } = get();
    if (isPlaying) {
      get().pauseAudio();
    } else {
      get().resumeAudio();
    }
  },

  // Add audios to config
  addAudiosToConfig: async (newAudios: LocalAudio[]) => {
    const { config } = get();
    if (!config) return;

    const existingIds = new Set(config.audios.map((a) => a.audio.id));
    const uniqueNewAudios = newAudios.filter(
      (a) => !existingIds.has(a.audio.id)
    );

    if (uniqueNewAudios.length === 0) return;

    const updatedConfig: Config = {
      ...config,
      audios: [...config.audios, ...uniqueNewAudios],
    };

    await get().saveConfig(updatedConfig);
  },

  // Add playlist to config
  addPlaylistToConfig: async (playlist: LocalPlaylist) => {
    const { config } = get();
    if (!config) return;

    const existingIndex = config.playlists.findIndex(
      (p) => p.id === playlist.id
    );
    let updatedPlaylists: LocalPlaylist[];

    if (existingIndex >= 0) {
      // Update existing playlist
      updatedPlaylists = [...config.playlists];
      updatedPlaylists[existingIndex] = playlist;
    } else {
      // Add new playlist
      updatedPlaylists = [...config.playlists, playlist];
    }

    const updatedConfig: Config = {
      ...config,
      playlists: updatedPlaylists,
    };

    await get().saveConfig(updatedConfig);
  },

  // Set last played audio
  setLastAudio: async (audio: LocalAudio) => {
    const { config } = get();
    if (!config) return;

    const updatedConfig: Config = {
      ...config,
      last_audio: audio,
    };

    try {
      await save_config(updatedConfig);
      set({ config: updatedConfig });
    } catch (error) {
      console.error('Failed to save last audio:', error);
    }
  },

  // Set playback rate
  setPlaybackRate: (rate: number) => {
    const { audioElement } = get();
    set({ playbackRate: rate });
    if (audioElement) {
      audioElement.playbackRate = rate;
    }
  },

  // Toggle favorite
  toggleFavorite: async (audio: LocalAudio) => {
    const { config } = get();
    if (!config) return;

    const favId = "Favorites";
    let playlists = [...config.playlists];
    let favPlaylist = playlists.find(p => p.id === favId);

    if (!favPlaylist) {
      favPlaylist = {
        id: favId,
        cover_path: null,
        audios: [],
        platform: 'File',
      };
      playlists.push(favPlaylist);
    }

    // Check if audio exists
    const exists = favPlaylist.audios.some(a => a.audio.id === audio.audio.id);

    let updatedFavPlaylist = { ...favPlaylist };
    if (exists) {
      updatedFavPlaylist.audios = favPlaylist.audios.filter(a => a.audio.id !== audio.audio.id);
      console.log("Removed from favorites");
    } else {
      updatedFavPlaylist.audios = [audio, ...favPlaylist.audios]; // Add to top
      console.log("Added to favorites");
    }

    // Update playlists array
    playlists = playlists.map(p => p.id === favId ? updatedFavPlaylist : p);

    // Sort playlists: Favorites first, then others
    playlists.sort((a, b) => {
      if (a.id === "Favorites") return -1;
      if (b.id === "Favorites") return 1;
      return 0;
    });

    const updatedConfig: Config = {
      ...config,
      playlists,
    };

    await get().saveConfig(updatedConfig);
  }
}));

// Export convenience hooks
export const useConfig = () => useAppStore((state) => state.config);
export const usePlaylists = () => useAppStore((state) => state.playlists);
export const useAudios = () => useAppStore((state) => state.audios);
export const useCurrentAudio = () => useAppStore((state) => state.currentAudio);
export const useIsPlaying = () => useAppStore((state) => state.isPlaying);
export const usePlaybackRate = () => useAppStore((state) => state.playbackRate);
export const usePlayMode = () => useAppStore((state) => state.playMode);
export const useThemeMode = () => useAppStore((state) => state.themeMode);

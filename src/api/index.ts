import { invoke } from "@tauri-apps/api/core";

export type Audio = {
  id: string;
  title: string;
  download_url: string;
  cover?: string;
  platform: string;
};

export type LocalAudio = {
  audio: Audio;
  path: string;
  cover_path: string | null;
}

export type Playlist = {
  title?: string;
  cover?: string;
  audios: Audio[];
  platform: string;
}

export type LocalPlaylist = {
  id: string;
  cover_path: string | null;
  cover?: string;
  audios: LocalAudio[];
  platform: string;
}

export type Config = {
  audios: LocalAudio[];
  playlists: LocalPlaylist[];
  theme: undefined | string
  last_audio?: LocalAudio;
}

export function extract_audios(url: string): Promise<Playlist> {
  return invoke("extract_audios", { url })
}

export async function download_audio(audio: Audio): Promise<LocalAudio[]> {
  const result = await invoke("download_audio", { audio });

  // Handle both single object and array responses
  if (Array.isArray(result)) {
    return result;
  } else if (result && typeof result === 'object') {
    // Backend returned a single LocalAudio object
    return [result as LocalAudio];
  } else {
    return [];
  }
}

export function app_dir(): Promise<string> {
  return invoke("app_dir");
}

export function read_file(path: string): Promise<Uint8Array> {
  return invoke("read_file", { path });
}

export function download_cover(url: string, platform: string): Promise<string | null> {
  return invoke("download_cover", { url, platform });
}

// export async function get_loacl_url(path: string): Promise<string> {
//   const appDataDirPath: string = await invoke("app_dir");
//   const localPath = await join(appDataDirPath, path);
//   const assetUrl = convertFileSrc(localPath);
//   return assetUrl
// }

export async function get_loacl_url(path: string): Promise<string> {
  const bin = await read_file(path);
  const blob = new Blob([new Uint8Array(bin)]);
  const assetUrl = URL.createObjectURL(blob)
  return assetUrl
}

export function get_config(): Promise<Config> {
  return invoke("get_config").then((result: any) => {
    console.log('📦 Raw config result:', result);

    // Handle Rust Result type (Ok/Err)
    let config: any;
    if (result && typeof result === 'object') {
      if ('Ok' in result) {
        config = result.Ok;
        console.log('✅ Config loaded successfully:', config);
      } else if ('Err' in result) {
        console.error('❌ Config error:', result.Err);
        return { audios: [], playlists: [], settings: { auto_download_cover: true, default_audio_format: 'mp3' } };
      } else {
        // Direct config object
        config = result;
      }
    } else {
      console.warn('⚠️ Invalid config result, using default');
      return { audios: [], playlists: [], settings: { auto_download_cover: true, default_audio_format: 'mp3' } };
    }

    // Ensure config has required fields
    if (!config || typeof config !== 'object') {
      console.warn('⚠️ Invalid config object, using default');
      return { audios: [], playlists: [], settings: { auto_download_cover: true, default_audio_format: 'mp3' } };
    }
    if (!Array.isArray(config.audios)) {
      console.warn('⚠️ Config missing audios array, initializing');
      return { ...config, audios: [], playlists: config.playlists || [], settings: config.settings || { auto_download_cover: true, default_audio_format: 'mp3' } };
    }
    if (!Array.isArray(config.playlists)) {
      console.warn('⚠️ Config missing playlists array, initializing');
      config.playlists = [];
    }
    if (!config.settings) {
      console.warn('⚠️ Config missing settings, initializing');
      config.settings = { auto_download_cover: true, default_audio_format: 'mp3' };
    }

    return config as Config;
  }).catch(error => {
    console.error('❌ Failed to get config:', error);
    return { audios: [], playlists: [], settings: { auto_download_cover: true, default_audio_format: 'mp3' } };
  });
}

export function save_config(config: Config): Promise<Config> {
  return invoke("save_config", { config }).then((result: any) => {
    console.log('📦 Raw save config result:', result);

    // Handle Rust Result type (Ok/Err)
    if (result && typeof result === 'object') {
      if ('Ok' in result) {
        console.log('✅ Config saved successfully');
        return config;
      } else if ('Err' in result) {
        console.error('❌ Save config error:', result.Err);
        throw new Error(result.Err);
      }
    }

    return config;
  }).catch(error => {
    console.error('❌ Failed to save config:', error);
    throw error;
  });
}


// Get all downloaded local audios
export async function get_local_audios(): Promise<LocalAudio[]> {
  try {
    console.log('📂 Loading local audios from config...');
    const config = await get_config();
    console.log('📂 Config loaded:', config);
    console.log('📂 Found', config.audios?.length || 0, 'local audios');
    return config.audios || [];
  } catch (error) {
    console.error('❌ Failed to load local audios:', error);
    return [];
  }
}

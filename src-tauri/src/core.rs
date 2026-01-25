use std::path::PathBuf;

use musicfree::{Audio, Platform};
use serde::{Deserialize, Serialize};

pub const ASSETS_DIR: &str = "assets";
pub const AUDIOS_DIR: &str = "audios";
pub const COVERS_DIR: &str = "covers";
pub const CONFIG_FILE: &str = "musicfree.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalAudio {
    pub path: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cover_path: Option<String>,
    pub audio: Audio,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalPlaylist {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub download_url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cover_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cover: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub audios: Vec<LocalAudio>,
    pub platform: Platform,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Config {
    #[serde(default)]
    pub playlists: Vec<LocalPlaylist>,
}

pub fn get_config_path(app_dir: PathBuf) -> PathBuf {
    app_dir.join(CONFIG_FILE)
}

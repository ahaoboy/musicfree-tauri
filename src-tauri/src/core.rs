use musicfree::{Audio, Platform};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalAudio {
    pub path: String,
    pub cover_path: Option<String>,
    pub audio: Audio,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalPlaylist {
    pub id: String,
    pub cover_path: Option<String>,
    pub cover: Option<String>,
    pub audios: Vec<LocalAudio>,
    pub platform: Platform,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Config {
    // Add fields as needed, inferred from usage in lib.rs
}

// Assuming Config was in api.rs or defined implicitly, but lib.rs imported it from `crate::api::Config`.
// Actually, looking at imports in lib.rs: `use crate::api::{Config, get_config_path};`
// The structs LocalAudio and LocalPlaylist were in lib.rs.
// So I will only put those here for now.

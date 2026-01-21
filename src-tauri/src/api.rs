use crate::core::{LocalAudio, LocalPlaylist};
use musicfree::{Audio, Platform};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

const ASSETS_DIR: &str = "assets";
const AUDIOS_DIR: &str = "audios";
const COVERS_DIR: &str = "covers";

fn write<P: AsRef<Path>, C: AsRef<[u8]>>(p: P, c: C) -> std::io::Result<()> {
    let p = p.as_ref();
    if let Some(d) = p.parent()
        && !d.exists()
    {
        std::fs::create_dir_all(d)?;
    }
    std::fs::write(p, c)
}

pub async fn download_audio(audio: &Audio, app_dir: PathBuf) -> anyhow::Result<LocalAudio> {
    let id = format!("{:x}", md5::compute(&audio.download_url));
    let filename = format!(
        "{}{}",
        id,
        audio
            .format
            .clone()
            .unwrap_or(musicfree::core::AudioFormat::Mp3)
            .extension()
    );
    let audio_path = format!(
        "{}/{:?}/{}/{}",
        ASSETS_DIR, audio.platform, AUDIOS_DIR, filename
    );
    let file_path = app_dir.join(&audio_path);

    if !file_path.exists() {
        println!("Downloading audio: {}", audio.title);
        let bin = audio
            .platform
            .extractor()
            .download(&audio.download_url)
            .await?;
        write(&file_path, bin)?;
        println!("Successfully downloaded audio: {}", audio_path);
    } else {
        println!(
            "Audio file already exists, skipping download: {}",
            audio_path
        );
    }

    let cover_path = if let Some(url) = &audio.cover {
        download_cover(url, audio.platform, app_dir).await
    } else {
        None
    };

    Ok(LocalAudio {
        path: audio_path,
        audio: audio.clone(),
        cover_path,
    })
}

pub async fn download_cover(
    cover_url: &str,
    platform: Platform,
    app_dir: PathBuf,
) -> Option<String> {
    let filename = cover_url.split("/").last()?;
    let cover_path = format!("{}/{:?}/{}/{}", ASSETS_DIR, platform, COVERS_DIR, filename);
    let full_cover_path = app_dir.join(&cover_path);
    if full_cover_path.exists() {
        return Some(cover_path);
    }
    if let Ok(cover_data) = platform.extractor().download_cover(cover_url).await
        && let Ok(_) = write(&full_cover_path, &cover_data)
    {
        return Some(cover_path);
    }
    None
}

const CONFIG_FILE: &str = "musicfree.json";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Config {
    pub audios: Vec<LocalAudio>,
    pub playlists: Vec<LocalPlaylist>,
    pub theme: Option<String>,
    pub last_audio: Option<LocalAudio>,
}

pub fn get_config_path(app_dir: PathBuf) -> PathBuf {
    app_dir.join(CONFIG_FILE)
}

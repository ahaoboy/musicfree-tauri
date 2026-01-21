use crate::{core::{LocalAudio, LocalPlaylist}, error::AppResult};
use musicfree::{Audio, Platform, file};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

pub const ASSETS_DIR: &str = "assets";
pub const AUDIOS_DIR: &str = "audios";
pub const COVERS_DIR: &str = "covers";
pub const CONFIG_FILE: &str = "musicfree.json";

fn write<P: AsRef<Path>, C: AsRef<[u8]>>(p: P, c: C) -> std::io::Result<()> {
    let p = p.as_ref();
    if let Some(d) = p.parent()
        && !d.exists()
    {
        std::fs::create_dir_all(d)?;
    }
    std::fs::write(p, c)
}

pub fn get_audio_filename(audio: &Audio) -> String {
    let id = format!("{:x}", md5::compute(&audio.download_url));
    format!(
        "{}_{}{}",
        audio.id,
        id,
        audio
            .format
            .clone()
            .unwrap_or(musicfree::core::AudioFormat::Mp3)
            .extension()
    )
}

pub fn get_cover_filename(cover_url: &str) -> String {
    let id = format!("{:x}", md5::compute(&cover_url));
    let filename = cover_url.split("/").last().unwrap_or("cover.jpg");
    format!("{id}_{filename}")
}

pub async fn download_audio(audio: &Audio, app_dir: PathBuf) -> anyhow::Result<LocalAudio> {
    let filename = get_audio_filename(audio);
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

pub async fn exists_audio(audio: &Audio, app_dir: PathBuf) -> AppResult<Option<String>> {
    let filename = get_audio_filename(audio);
    let audio_path = format!(
        "{}/{:?}/{}/{}",
        ASSETS_DIR, audio.platform, AUDIOS_DIR, filename
    );
    let file_path = app_dir.join(&audio_path);

    if !file_path.exists() {
        return Ok(None);
    }
    return Ok(Some(audio_path));
}

pub async fn exists_cover(cover_url: &str, platform: Platform, app_dir: PathBuf) -> AppResult<Option<String>> {
    let filename = get_cover_filename(cover_url);
    let cover_path = format!("{}/{:?}/{}/{}", ASSETS_DIR, platform, COVERS_DIR, filename);
    let full_cover_path = app_dir.join(&cover_path);
    if full_cover_path.exists() {
        return Ok(Some(cover_path));
    }
    Ok(None)
}

pub async fn download_cover(
    cover_url: &str,
    platform: Platform,
    app_dir: PathBuf,
) -> Option<String> {
    let filename = get_cover_filename(cover_url);
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

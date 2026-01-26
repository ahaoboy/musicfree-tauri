use crate::{
    core::{ASSETS_DIR, AUDIOS_DIR, COVERS_DIR, LocalAudio},
    error::{AppError, AppResult},
};
use musicfree::{Audio, Platform};
use std::path::{Path, PathBuf};
use tauri::Manager;

pub async fn app_dir(app_handle: &tauri::AppHandle) -> AppResult<PathBuf> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Unknown(e.to_string()))?;

    if !tokio::fs::try_exists(&app_data_dir).await.unwrap_or(false) {
        tokio::fs::create_dir_all(&app_data_dir).await.map_err(AppError::Io)?;
    }
    Ok(app_data_dir)
}

async fn write<P: AsRef<Path>, C: AsRef<[u8]>>(p: P, c: C) -> std::io::Result<()> {
    let p = p.as_ref();
    if let Some(d) = p.parent()
        && !tokio::fs::try_exists(d).await.unwrap_or(false) {
            tokio::fs::create_dir_all(d).await?;
        }
    tokio::fs::write(p, c).await
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
    let id = format!("{:x}", md5::compute(cover_url));
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

    if !tokio::fs::try_exists(&file_path).await.unwrap_or(false) {
        println!("Downloading audio: {}", audio.title);
        let bin = audio
            .platform
            .extractor()
            .download(&audio.download_url)
            .await?;
        write(&file_path, bin).await?;
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

    if !tokio::fs::try_exists(&file_path).await.unwrap_or(false) {
        return Ok(None);
    }
    Ok(Some(audio_path))
}

pub async fn exists_cover(
    cover_url: &str,
    platform: Platform,
    app_dir: PathBuf,
) -> AppResult<Option<String>> {
    let filename = get_cover_filename(cover_url);
    let cover_path = format!("{}/{:?}/{}/{}", ASSETS_DIR, platform, COVERS_DIR, filename);
    let full_cover_path = app_dir.join(&cover_path);
    if tokio::fs::try_exists(&full_cover_path).await.unwrap_or(false) {
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
    if tokio::fs::try_exists(&full_cover_path).await.unwrap_or(false) {
        return Some(cover_path);
    }
    if let Ok(cover_data) = platform.extractor().download_cover(cover_url).await
        && let Ok(_) = write(&full_cover_path, &cover_data).await
    {
        return Some(cover_path);
    }
    None
}

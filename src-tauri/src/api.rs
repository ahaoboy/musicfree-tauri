use crate::{
    core::{ASSETS_DIR, AUDIOS_DIR, COVERS_DIR, Config, LocalAudio},
    error::{AppError, AppResult},
};
use musicfree::{Audio, Platform};
use std::{
    collections::HashSet,
    path::{Path, PathBuf},
};
use tauri::Manager;
use walkdir::WalkDir;

pub async fn app_dir(app_handle: &tauri::AppHandle) -> AppResult<PathBuf> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Unknown(e.to_string()))?;

    if !tokio::fs::try_exists(&app_data_dir).await.unwrap_or(false) {
        tokio::fs::create_dir_all(&app_data_dir)
            .await
            .map_err(AppError::Io)?;
    }
    Ok(app_data_dir)
}

pub fn external_dir(app_handle: &tauri::AppHandle) -> AppResult<PathBuf> {
    Ok(app_handle
        .path()
        .home_dir()
        .map_err(|e| AppError::Unknown(e.to_string()))?
        .join(crate::core::APP_NAME))
}

async fn write<P: AsRef<Path>, C: AsRef<[u8]>>(p: P, c: C) -> std::io::Result<()> {
    let p = p.as_ref();
    if let Some(d) = p.parent()
        && !tokio::fs::try_exists(d).await.unwrap_or(false)
    {
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
        let download_future = audio.platform.extractor().download(&audio.download_url);
        let bin =
            match tokio::time::timeout(std::time::Duration::from_secs(60), download_future).await {
                Ok(Ok(data)) => data,
                Ok(Err(e)) => {
                    eprintln!("Download failed for '{}': {e}", audio.title);
                    return Err(e.into());
                }
                Err(_) => {
                    eprintln!("Download timed out for '{}'", audio.title);
                    return Err(anyhow::anyhow!("Download timed out for '{}'", audio.title));
                }
            };

        write(&file_path, bin).await.map_err(|e| {
            eprintln!("Failed to write audio file for '{}': {e}", audio.title);
            AppError::Io(e)
        })?;
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
    if tokio::fs::try_exists(&full_cover_path)
        .await
        .unwrap_or(false)
    {
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
    if tokio::fs::try_exists(&full_cover_path)
        .await
        .unwrap_or(false)
    {
        return Some(cover_path);
    }
    let download_future = platform.extractor().download_cover(cover_url);
    match tokio::time::timeout(std::time::Duration::from_secs(30), download_future).await {
        Ok(Ok(cover_data)) => {
            if let Err(e) = write(&full_cover_path, &cover_data).await {
                eprintln!("Failed to write cover file: {e}");
            } else {
                return Some(cover_path);
            }
        }
        Ok(Err(e)) => eprintln!("Cover download failed: {e}"),
        Err(_) => eprintln!("Cover download timed out"),
    }
    None
}

pub fn get_used_paths(config: &Config) -> HashSet<String> {
    let mut used_paths = HashSet::new();
    for playlist in &config.playlists {
        if let Some(ref cover_path) = playlist.cover_path {
            used_paths.insert(cover_path.replace("\\", "/"));
        }
        for audio in &playlist.audios {
            used_paths.insert(audio.path.replace("\\", "/"));
            if let Some(ref cover_path) = audio.cover_path {
                used_paths.insert(cover_path.replace("\\", "/"));
            }
        }
    }
    used_paths
}

pub fn get_save_filename(audio: &musicfree::Audio) -> String {
    let id = format!("{:x}", md5::compute(&audio.download_url));
    let id_prefix = &id[..6.min(id.len())];
    // Sanitize title for filesystem safety
    let safe_title = sanitize_filename::sanitize(&audio.title);
    format!(
        "{}-{}{}",
        safe_title,
        id_prefix,
        audio
            .format
            .clone()
            .unwrap_or(musicfree::core::AudioFormat::Mp3)
            .extension()
    )
}

pub async fn save_audio(
    playlist: &crate::core::LocalPlaylist,
    audio: &crate::core::LocalAudio,
    app_dir: PathBuf,
    target_dir: PathBuf,
) -> AppResult<String> {
    let filename = get_save_filename(&audio.audio);
    let playlist_title =
        sanitize_filename::sanitize(playlist.title.as_deref().unwrap_or("Unknown"));

    // Build target path: target_dir / Platform / playlist_title / filename
    let dest_path = target_dir
        .join(format!("{:?}", audio.audio.platform))
        .join(&playlist_title)
        .join(&filename);

    // Source path: app_dir / audio.path
    let src_path = app_dir.join(&audio.path);

    if !tokio::fs::try_exists(&src_path).await.unwrap_or(false) {
        return Err(AppError::Unknown(format!(
            "Source audio file not found: {}",
            src_path.display()
        )));
    }

    // Create destination directory
    if let Some(parent) = dest_path.parent()
        && !tokio::fs::try_exists(parent).await.unwrap_or(false)
    {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(AppError::Io)?;
    }

    // Copy file
    tokio::fs::copy(&src_path, &dest_path)
        .await
        .map_err(AppError::Io)?;

    Ok(dest_path.to_string_lossy().to_string())
}

pub async fn get_cache_files(
    app_handle: &tauri::AppHandle,
    config: &Config,
) -> AppResult<Vec<PathBuf>> {
    let app_dir = app_dir(app_handle).await?;
    let assets_dir = app_dir.join(ASSETS_DIR);

    if !assets_dir.exists() {
        return Ok(vec![]);
    }

    let used_paths = get_used_paths(config);
    let mut cache_files = Vec::new();

    // Use WalkDir to find all files in assets directory
    for entry in WalkDir::new(&assets_dir) {
        let entry = entry.map_err(|e| AppError::Io(e.into()))?;
        let path = entry.path();

        if path.is_file() {
            // Get relative path from app_dir to match config paths
            if let Ok(relative_path) = path.strip_prefix(&app_dir) {
                let relative_path_str = relative_path
                    .to_string_lossy()
                    .to_string()
                    .replace("\\", "/");
                if !used_paths.contains(&relative_path_str) {
                    cache_files.push(path.to_path_buf());
                }
            }
        }
    }

    Ok(cache_files)
}

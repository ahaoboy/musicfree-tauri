use crate::api::{self};
use crate::core::{ASSETS_DIR, CONFIG_FILE, Config, LocalAudio, get_config_path};
use crate::error::{AppError, AppResult};
use chrono::Local;
use musicfree::{Audio, Platform, Playlist};
use std::collections::HashSet;
use std::fs::File;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use tauri::Manager;
use walkdir::WalkDir;
use zip::write::FileOptions;

#[tauri::command]
pub async fn app_dir(app_handle: tauri::AppHandle) -> AppResult<PathBuf> {
    api::app_dir(&app_handle).await
}

const CARGO_PKG_VERSION: &str = env!("CARGO_PKG_VERSION");
const GIT_HASH: &str = git_version::git_version!();
const VERSION: &str = const_str::concat!(CARGO_PKG_VERSION, " ", GIT_HASH);

#[tauri::command]
pub async fn app_version() -> &'static str {
    VERSION
}

#[tauri::command]
pub async fn extract_audios(url: &str) -> AppResult<(Playlist, Option<usize>)> {
    musicfree::extract(url)
        .await
        .map_err(|e| AppError::MusicFree(e.to_string()))
}

#[tauri::command]
pub async fn get_config(app_handle: tauri::AppHandle) -> AppResult<Config> {
    let dir = app_dir(app_handle).await?;
    let p = get_config_path(dir);

    if !tokio::fs::try_exists(&p).await.unwrap_or(false) {
        return Ok(Config::default());
    }

    let s = tokio::fs::read_to_string(&p).await.map_err(AppError::Io)?;
    let config: Config = serde_json::from_str(&s).map_err(AppError::Serde)?;
    Ok(config)
}

#[tauri::command]
pub async fn save_config(config: Config, app_handle: tauri::AppHandle) -> AppResult<()> {
    let dir = app_dir(app_handle).await?;
    let s = serde_json::to_string_pretty(&config).map_err(AppError::Serde)?;

    let p = get_config_path(dir);
    tokio::fs::write(p, s).await.map_err(AppError::Io)?;
    Ok(())
}

#[tauri::command]
pub async fn download_audio(audio: Audio, app_handle: tauri::AppHandle) -> AppResult<LocalAudio> {
    let dir = app_dir(app_handle).await?;

    api::download_audio(&audio, dir)
        .await
        .map_err(|e| AppError::Unknown(e.to_string()))
}

#[tauri::command]
pub async fn exists_audio(audio: Audio, app_handle: tauri::AppHandle) -> AppResult<Option<String>> {
    let dir = app_dir(app_handle).await?;
    api::exists_audio(&audio, dir).await
}

#[tauri::command]
pub async fn exists_cover(
    url: &str,
    platform: Platform,
    app_handle: tauri::AppHandle,
) -> AppResult<Option<String>> {
    let dir = app_dir(app_handle).await?;
    api::exists_cover(url, platform, dir).await
}

#[tauri::command]
pub async fn download_cover(
    url: &str,
    platform: Platform,
    app_handle: tauri::AppHandle,
) -> AppResult<Option<String>> {
    let dir = app_dir(app_handle).await?;

    Ok(api::download_cover(url, platform, dir).await)
}

#[tauri::command]
pub async fn read_file(path: &str, app_handle: tauri::AppHandle) -> AppResult<Vec<u8>> {
    let dir = app_dir(app_handle).await?;
    let path = dir.join(path);
    let bin = tokio::fs::read(path).await.map_err(AppError::Io)?;
    Ok(bin)
}

#[tauri::command]
pub async fn remove_file(path: &str, app_handle: tauri::AppHandle) -> AppResult<()> {
    let dir = app_dir(app_handle).await?;
    let p = dir.join(path);

    // Security check: ensure path is within app directory
    if !p.starts_with(&dir) {
        return Ok(());
    }

    if tokio::fs::try_exists(&p).await.unwrap_or(false) {
        tokio::fs::remove_file(p).await.map_err(AppError::Io)?;
    }
    Ok(())
}
#[tauri::command]
pub async fn clear_all_data(app_handle: tauri::AppHandle) -> AppResult<()> {
    let dir = app_dir(app_handle).await?;

    // Delete ASSETS_DIR
    let assets_dir = dir.join(ASSETS_DIR);
    if tokio::fs::try_exists(&assets_dir).await.unwrap_or(false) {
        tokio::fs::remove_dir_all(&assets_dir)
            .await
            .map_err(AppError::Io)?;
    }

    // Delete musicfree.json
    let config_path = get_config_path(dir);
    if tokio::fs::try_exists(&config_path).await.unwrap_or(false) {
        tokio::fs::remove_file(&config_path)
            .await
            .map_err(AppError::Io)?;
    }

    Ok(())
}

#[tauri::command]
pub async fn get_storage_size(app_handle: tauri::AppHandle) -> AppResult<u64> {
    let dir = app_dir(app_handle).await?;
    let mut total_size: u64 = 0;

    // Calculate ASSETS_DIR size
    let assets_dir = dir.join(ASSETS_DIR);
    if tokio::fs::try_exists(&assets_dir).await.unwrap_or(false) {
        total_size += Box::pin(get_dir_size(assets_dir)).await?;
    }

    // Add musicfree.json size
    let config_path = get_config_path(dir);
    if tokio::fs::try_exists(&config_path).await.unwrap_or(false)
        && let Ok(metadata) = tokio::fs::metadata(&config_path).await {
            total_size += metadata.len();
        }

    Ok(total_size)
}

#[tauri::command]
pub async fn get_cache_size(app_handle: tauri::AppHandle) -> AppResult<u64> {
    let config = get_config(app_handle.clone()).await?;
    let cache_files = api::get_cache_files(&app_handle, &config).await?;
    let mut total_size: u64 = 0;

    for file in cache_files {
        if let Ok(metadata) = tokio::fs::metadata(file).await {
            total_size += metadata.len();
        }
    }

    Ok(total_size)
}

#[tauri::command]
pub async fn clear_cache(app_handle: tauri::AppHandle) -> AppResult<()> {
    let config = get_config(app_handle.clone()).await?;
    let cache_files = api::get_cache_files(&app_handle, &config).await?;

    for file in cache_files {
        if tokio::fs::try_exists(&file).await.unwrap_or(false) {
            tokio::fs::remove_file(file).await.map_err(AppError::Io)?;
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn export_data(app_handle: tauri::AppHandle) -> AppResult<String> {
    let app_dir = api::app_dir(&app_handle).await?;
    let download_dir = app_handle
        .path()
        .download_dir()
        .map_err(|e| AppError::Unknown(e.to_string()))?;

    // Ensure download dir exists
    if !tokio::fs::try_exists(&download_dir).await.unwrap_or(false) {
        tokio::fs::create_dir_all(&download_dir)
            .await
            .map_err(AppError::Io)?;
    }

    let date_str = Local::now().format("%Y-%m-%d").to_string();
    let zip_filename = format!("musicfree-{}.zip", date_str);
    let zip_path = download_dir.join(&zip_filename);

    let app_dir_clone = app_dir.clone();
    let zip_path_clone = zip_path.clone();

    // Spawn blocking task for compression
    tokio::task::spawn_blocking(move || -> AppResult<()> {
        let file = File::create(zip_path_clone).map_err(AppError::Io)?;
        let mut zip = zip::ZipWriter::new(file);
        let options = FileOptions::<()>::default()
            .compression_method(zip::CompressionMethod::Stored)
            .unix_permissions(0o755);

        // Add musicfree.json
        let config_path = get_config_path(app_dir_clone.clone());
        if config_path.exists() {
            zip.start_file(CONFIG_FILE, options)
                .map_err(|e| AppError::Unknown(e.to_string()))?;
            let content = std::fs::read(&config_path).map_err(AppError::Io)?;
            zip.write_all(&content).map_err(AppError::Io)?;
        }

        // Add assets directory
        let assets_path = app_dir_clone.join(ASSETS_DIR);
        if assets_path.exists() {
            for entry in WalkDir::new(&assets_path) {
                let entry = entry.map_err(|e| AppError::Io(e.into()))?;
                let path = entry.path();
                if path.is_file() {
                    let name = path.strip_prefix(&app_dir_clone).unwrap();
                    let name_str = name.to_str().unwrap().replace("\\", "/");

                    zip.start_file(name_str, options)
                        .map_err(|e| AppError::Unknown(e.to_string()))?;
                    let mut f = File::open(path).map_err(AppError::Io)?;
                    let mut buffer = Vec::new();
                    f.read_to_end(&mut buffer).map_err(AppError::Io)?;
                    zip.write_all(&buffer).map_err(AppError::Io)?;
                }
            }
        }

        zip.finish().map_err(|e| AppError::Unknown(e.to_string()))?;
        Ok(())
    })
    .await
    .map_err(|e| AppError::Unknown(e.to_string()))??;

    Ok(zip_filename)
}

#[tauri::command]
pub async fn import_data(app_handle: tauri::AppHandle) -> AppResult<String> {
    let app_dir = api::app_dir(&app_handle).await?;
    let download_dir = app_handle
        .path()
        .download_dir()
        .map_err(|e| AppError::Unknown(e.to_string()))?;

    // 1. Find latest musicfree-*.zip
    let mut latest_zip: Option<(PathBuf, std::time::SystemTime)> = None;

    let mut entries = tokio::fs::read_dir(&download_dir).await.map_err(AppError::Io)?;
    while let Ok(Some(entry)) = entries.next_entry().await {
        let path = entry.path();
        if let Some(name) = path.file_name().and_then(|n| n.to_str())
            && name.starts_with("musicfree-")
            && name.ends_with(".zip")
            && let Ok(metadata) = entry.metadata().await
            && let Ok(modified) = metadata.modified()
        {
            match latest_zip {
                Some((_, time)) => {
                    if modified > time {
                        latest_zip = Some((path, modified));
                    }
                }
                None => {
                    latest_zip = Some((path, modified));
                }
            }
        }
    }

    let (zip_path, _) = latest_zip.ok_or(AppError::Unknown("No backup file found".to_string()))?;
    let zip_filename = zip_path.file_name().unwrap().to_string_lossy().to_string();

    // 2. Unzip to temp
    let temp_dir = std::env::temp_dir().join("musicfree_import_temp");
    if tokio::fs::try_exists(&temp_dir).await.unwrap_or(false) {
        tokio::fs::remove_dir_all(&temp_dir)
            .await
            .map_err(AppError::Io)?;
    }
    tokio::fs::create_dir_all(&temp_dir)
        .await
        .map_err(AppError::Io)?;

    let temp_dir_clone = temp_dir.clone();
    let zip_path_clone = zip_path.clone();

    // Spawn blocking task for extraction
    tokio::task::spawn_blocking(move || -> AppResult<()> {
        let file = File::open(&zip_path_clone).map_err(AppError::Io)?;
        let mut archive =
            zip::ZipArchive::new(file).map_err(|e| AppError::Unknown(e.to_string()))?;

        for i in 0..archive.len() {
            let mut file = archive
                .by_index(i)
                .map_err(|e| AppError::Unknown(e.to_string()))?;
            let outpath = match file.enclosed_name() {
                Some(path) => temp_dir_clone.join(path),
                None => continue,
            };

            if file.name().ends_with('/') {
                std::fs::create_dir_all(&outpath).map_err(AppError::Io)?;
            } else {
                if let Some(p) = outpath.parent()
                    && !p.exists()
                {
                    std::fs::create_dir_all(p).map_err(AppError::Io)?;
                }
                let mut outfile = File::create(&outpath).map_err(AppError::Io)?;
                std::io::copy(&mut file, &mut outfile).map_err(AppError::Io)?;
            }
        }
        Ok(())
    })
    .await
    .map_err(|e| AppError::Unknown(e.to_string()))??;

    // 3. Load configs
    let import_config_path = temp_dir.join(CONFIG_FILE);
    if !tokio::fs::try_exists(&import_config_path).await.unwrap_or(false) {
        // Cleanup
        let _ = tokio::fs::remove_dir_all(&temp_dir).await;
        return Err(AppError::Unknown(
            "Invalid backup: no config file".to_string(),
        ));
    }

    let import_json = tokio::fs::read_to_string(&import_config_path)
        .await
        .map_err(AppError::Io)?;
    let import_config: Config = serde_json::from_str(&import_json).map_err(AppError::Serde)?;

    let local_config_path = get_config_path(app_dir.clone());
    let mut local_config: Config = if tokio::fs::try_exists(&local_config_path).await.unwrap_or(false)
    {
        let local_json = tokio::fs::read_to_string(&local_config_path)
            .await
            .map_err(AppError::Io)?;
        serde_json::from_str(&local_json).unwrap_or_default()
    } else {
        Config::default()
    };

    // 4. Merge Logic
    for import_playlist in import_config.playlists {
        let target_playlist_opt = local_config
            .playlists
            .iter_mut()
            .find(|p| p.id == import_playlist.id);

        if let Some(target_playlist) = target_playlist_opt {
            // Merge existing
            let existing_ids: HashSet<String> = target_playlist
                .audios
                .iter()
                .map(|a| a.audio.id.clone())
                .collect();

            for audio in import_playlist.audios {
                if !existing_ids.contains(&audio.audio.id) {
                    // Check and copy asset file
                    if let Some(ref relative_path) = audio.cover_path {
                        copy_asset_if_needed(&temp_dir, &app_dir, relative_path).await;
                    }
                    copy_asset_if_needed(&temp_dir, &app_dir, &audio.path).await;

                    target_playlist.audios.push(audio);
                }
            }
        } else {
            // Add new playlist
            // Copy all assets
            for audio in &import_playlist.audios {
                if let Some(ref relative_path) = audio.cover_path {
                    copy_asset_if_needed(&temp_dir, &app_dir, relative_path).await;
                }
                copy_asset_if_needed(&temp_dir, &app_dir, &audio.path).await;
            }
            // Add playlist if we need to copy cover for playlist itself?
            if let Some(ref cover_path) = import_playlist.cover_path {
                copy_asset_if_needed(&temp_dir, &app_dir, cover_path).await;
            }

            local_config.playlists.push(import_playlist);
        }
    }

    // 5. Save
    let s = serde_json::to_string_pretty(&local_config).map_err(AppError::Serde)?;
    tokio::fs::write(local_config_path, s).await.map_err(AppError::Io)?;

    // 6. Cleanup
    let _ = tokio::fs::remove_dir_all(&temp_dir).await;

    Ok(zip_filename)
}

async fn copy_asset_if_needed(src_root: &Path, dest_root: &Path, relative_path: &str) {
    // Basic security check: ensure relative path doesn't escape
    if relative_path.contains("..") {
        return;
    }

    let src_file = src_root.join(relative_path);
    let dest_file = dest_root.join(relative_path);

    if tokio::fs::try_exists(&src_file).await.unwrap_or(false)
        && !tokio::fs::try_exists(&dest_file).await.unwrap_or(false)
    {
        if let Some(parent) = dest_file.parent() {
            let _ = tokio::fs::create_dir_all(parent).await;
        }
        let _ = tokio::fs::copy(src_file, dest_file).await;
    }
}

async fn get_dir_size(path: PathBuf) -> AppResult<u64> {
    let mut total_size: u64 = 0;
    let mut entries = tokio::fs::read_dir(path).await.map_err(AppError::Io)?;

    while let Ok(Some(entry)) = entries.next_entry().await {
        let path = entry.path();
        if path.is_file() {
            if let Ok(metadata) = entry.metadata().await {
                total_size += metadata.len();
            }
        } else if path.is_dir() {
            total_size += Box::pin(get_dir_size(path)).await?;
        }
    }
    Ok(total_size)
}

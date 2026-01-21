use musicfree::{Audio, Platform, Playlist};
use std::path::PathBuf;
use tauri::Manager;

use crate::api::{self, Config, get_config_path};
use crate::core::LocalAudio;
use crate::error::{AppError, AppResult};

#[tauri::command]
pub async fn app_dir(app_handle: tauri::AppHandle) -> AppResult<PathBuf> {
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

const CARGO_PKG_VERSION: &str = env!("CARGO_PKG_VERSION");
const GIT_HASH: &str = git_version::git_version!();
const VERSION: &str = const_str::concat!(CARGO_PKG_VERSION, " ", GIT_HASH);

#[tauri::command]
pub async fn app_version() -> &'static str {
    VERSION
}

#[tauri::command]
pub async fn extract_audios(url: &str) -> AppResult<Playlist> {
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

    // api::download_audio seems to be async in api.rs?
    // In lib.rs it was: api::download_audio(&mut audio, dir).await
    // We need to check if api::download_audio returns Result<LocalAudio, String>
    // If so, we map it to AppError.

    api::download_audio(&audio, dir)
        .await
        .map_err(|e| AppError::Unknown(e.to_string()))
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
pub async fn clear_all_data(app_handle: tauri::AppHandle) -> AppResult<()> {
    let dir = app_dir(app_handle).await?;

    // Delete ASSETS_DIR
    let assets_dir = dir.join(api::ASSETS_DIR);
    if tokio::fs::try_exists(&assets_dir).await.unwrap_or(false) {
        tokio::fs::remove_dir_all(&assets_dir)
            .await
            .map_err(AppError::Io)?;
    }

    // Delete musicfree.json
    let config_path = api::get_config_path(dir);
    if tokio::fs::try_exists(&config_path).await.unwrap_or(false) {
        tokio::fs::remove_file(&config_path)
            .await
            .map_err(AppError::Io)?;
    }

    Ok(())
}

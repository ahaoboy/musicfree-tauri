pub mod api;
pub mod cmd;
pub mod core;
pub mod error;

use std::path::Path;
use tauri::http::{Response, StatusCode};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .register_uri_scheme_protocol("musicfree", |ctx, request| {
            // Get the URI path (e.g., "assets/covers/bilibili/q.jpg")
            let path = request.uri().path();

            // Remove leading slash if present
            let path = path.trim_start_matches('/');

            musicfree_protocol_handler(ctx.app_handle(), path)
        })
        .plugin(tauri_plugin_fs::init());

    #[cfg(target_os = "windows")]
    let builder = builder
        .plugin(tauri_plugin_media::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}));

    builder
        .invoke_handler(tauri::generate_handler![
            cmd::extract_audios,
            cmd::app_dir,
            cmd::read_file,
            cmd::download_audio,
            cmd::download_cover,
            cmd::get_config,
            cmd::save_config,
            cmd::clear_all_data,
            cmd::app_version,
            cmd::exists_audio,
            cmd::exists_cover,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Handler for musicfree:// protocol
/// Example: musicfree://assets/covers/bilibili/q.jpg
fn musicfree_protocol_handler(app_handle: &tauri::AppHandle, path: &str) -> Response<Vec<u8>> {
    // Get app data directory
    let app_data_dir = match api::app_dir(app_handle) {
        Ok(dir) => dir,
        Err(e) => {
            eprintln!("Failed to get app data directory: {}", e);
            return Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .header("Content-Type", "text/plain")
                .body(b"Failed to get app data directory".to_vec())
                .unwrap();
        }
    };

    // Construct full file path
    let file_path = app_data_dir.join(path);

    // Read file
    match std::fs::read(&file_path) {
        Ok(data) => {
            // Determine MIME type based on file extension
            let mime_type = get_mime_type(&file_path);

            Response::builder()
                .status(StatusCode::OK)
                .header("Content-Type", mime_type)
                .header("Access-Control-Allow-Origin", "*")
                .body(data)
                .unwrap()
        }
        Err(e) => {
            eprintln!("Failed to read file {:?}: {}", file_path, e);
            Response::builder()
                .status(StatusCode::NOT_FOUND)
                .header("Content-Type", "text/plain")
                .body(format!("File not found: {:?}", file_path).into_bytes())
                .unwrap()
        }
    }
}

/// Get MIME type based on file extension
fn get_mime_type(path: &Path) -> &'static str {
    match path.extension().and_then(|s| s.to_str()) {
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("png") => "image/png",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("svg") => "image/svg+xml",
        Some("mp3") => "audio/mpeg",
        Some("m4a") => "audio/mp4",
        Some("flac") => "audio/flac",
        Some("wav") => "audio/wav",
        Some("aac") => "audio/aac",
        Some("ogg") => "audio/ogg",
        Some("mp4") => "video/mp4",
        Some("webm") => "video/webm",
        Some("json") => "application/json",
        Some("txt") => "text/plain",
        _ => "application/octet-stream",
    }
}

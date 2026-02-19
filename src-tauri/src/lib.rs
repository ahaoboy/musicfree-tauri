pub mod api;
pub mod cmd;
pub mod core;
pub mod error;
pub mod sync;

use std::path::Path;
use std::io::SeekFrom;
use tauri::http::{Response, StatusCode};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .register_asynchronous_uri_scheme_protocol("musicfree", |ctx, request, responder| {
            // Get the URI path (e.g., "assets/covers/bilibili/q.jpg")
            let path = request.uri().path().to_string();

            // Get Range header if present
            let range = request
                .headers()
                .get("range")
                .and_then(|v| v.to_str().ok())
                .map(|s| s.to_string());

            // Remove leading slash if present
            let path = path.trim_start_matches('/').to_string();

            let app_handle = ctx.app_handle().clone();

            // Spawn async task to handle the request
            tauri::async_runtime::spawn(async move {
                let response = musicfree_protocol_handler_async(&app_handle, &path, range.as_deref()).await;
                responder.respond(response);
            });
        })
        .plugin(tauri_plugin_fs::init());

    #[cfg(target_os = "windows")]
    let builder = builder
        // .plugin(tauri_plugin_media::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}));

    builder
        .invoke_handler(tauri::generate_handler![
            cmd::extract_audios,
            cmd::app_dir,
            cmd::read_file,
            cmd::path_exists,
            cmd::download_audio,
            cmd::download_cover,
            cmd::get_config,
            cmd::save_config,
            cmd::clear_all_data,
            cmd::app_version,
            cmd::exists_audio,
            cmd::exists_cover,
            cmd::export_data,
            cmd::import_data,
            cmd::remove_file,
            cmd::get_storage_size,
            cmd::get_cache_size,
            cmd::clear_cache,
            cmd::sync_download,
            cmd::sync_update,
            cmd::sync_file_info,
            cmd::write_log,
            cmd::get_log_path,
            cmd::clear_log,
            cmd::get_log_size,
            cmd::read_log,
            cmd::get_local_yjs,
            cmd::save_local_yjs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Handler for musicfree:// protocol (async version)
/// Example: musicfree://assets/covers/bilibili/q.jpg
async fn musicfree_protocol_handler_async(
    app_handle: &tauri::AppHandle,
    path: &str,
    range: Option<&str>,
) -> Response<Vec<u8>> {
    // Get app data directory
    let app_data_dir = match api::app_dir(app_handle).await {
        Ok(dir) => dir,
        Err(e) => {
            eprintln!("Failed to get app data directory: {}", e);
            return match Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .header("Content-Type", "text/plain")
                .body(b"Failed to get app data directory".to_vec())
            {
                Ok(response) => response,
                Err(e) => {
                    eprintln!("Failed to build error response: {}", e);
                    Response::new(vec![])
                }
            };
        }
    };

    // Construct full file path
    let file_path = app_data_dir.join(path);

    // Determine MIME type based on file extension
    let mime_type = get_mime_type(&file_path);

    // Handle Range requests for audio/video streaming
    if let Some(range_header) = range {
        match handle_range_request_async(&file_path, range_header, mime_type).await {
            Ok(response) => response,
            Err(e) => {
                eprintln!("Failed to handle range request: {}", e);
                match Response::builder()
                    .status(StatusCode::INTERNAL_SERVER_ERROR)
                    .header("Content-Type", "text/plain")
                    .body(format!("Range request failed: {}", e).into_bytes())
                {
                    Ok(response) => response,
                    Err(e) => {
                        eprintln!("Failed to build error response: {}", e);
                        Response::new(vec![])
                    }
                }
            }
        }
    } else {
        // Read entire file for non-range requests
        match tokio::fs::read(&file_path).await {
            Ok(data) => {
                match Response::builder()
                    .status(StatusCode::OK)
                    .header("Content-Type", mime_type)
                    .header("Accept-Ranges", "bytes")
                    .header("Access-Control-Allow-Origin", "*")
                    .body(data)
                {
                    Ok(response) => response,
                    Err(e) => {
                        eprintln!("Failed to build response: {}", e);
                        Response::builder()
                            .status(StatusCode::INTERNAL_SERVER_ERROR)
                            .header("Content-Type", "text/plain")
                            .body(b"Failed to build response".to_vec())
                            .unwrap_or_else(|_| Response::new(vec![]))
                    }
                }
            }
            Err(e) => {
                eprintln!("Failed to read file {:?}: {}", file_path, e);
                match Response::builder()
                    .status(StatusCode::NOT_FOUND)
                    .header("Content-Type", "text/plain")
                    .body(format!("File not found: {:?}", file_path).into_bytes())
                {
                    Ok(response) => response,
                    Err(e) => {
                        eprintln!("Failed to build error response: {}", e);
                        Response::builder()
                            .status(StatusCode::INTERNAL_SERVER_ERROR)
                            .body(vec![])
                            .unwrap_or_else(|_| Response::new(vec![]))
                    }
                }
            }
        }
    }
}

/// Handle HTTP Range requests for streaming (async version)
async fn handle_range_request_async(
    file_path: &Path,
    range_header: &str,
    mime_type: &str,
) -> Result<Response<Vec<u8>>, Box<dyn std::error::Error>> {
    use tokio::io::{AsyncReadExt, AsyncSeekExt};

    let mut file = tokio::fs::File::open(file_path).await?;
    let file_size = file.metadata().await?.len();

    let (start, end) = parse_range(range_header, file_size)?;
    let chunk_size = end - start + 1;

    file.seek(SeekFrom::Start(start)).await?;
    let mut buf = vec![0; chunk_size as usize];
    file.read_exact(&mut buf).await?;

    Ok(Response::builder()
        .status(StatusCode::PARTIAL_CONTENT) // 206
        .header("Content-Type", mime_type)
        .header("Accept-Ranges", "bytes")
        .header("Content-Length", chunk_size.to_string())
        .header(
            "Content-Range",
            format!("bytes {}-{}/{}", start, end, file_size),
        )
        .header("Access-Control-Allow-Origin", "*")
        .body(buf)?)
}

/// Parse HTTP Range header
/// Examples: "bytes=0-1023", "bytes=0-", "bytes=-1000"
fn parse_range(range_header: &str, file_size: u64) -> Result<(u64, u64), Box<dyn std::error::Error>> {
    // Remove "bytes=" prefix
    let range = range_header
        .strip_prefix("bytes=")
        .ok_or("Invalid range header format")?;

    // Parse start-end
    let parts: Vec<&str> = range.split('-').collect();
    if parts.len() != 2 {
        return Err("Invalid range format".into());
    }

    let start = if parts[0].is_empty() {
        // Suffix range: bytes=-1000 (last 1000 bytes)
        let suffix_len: u64 = parts[1].parse()?;
        file_size.saturating_sub(suffix_len)
    } else {
        parts[0].parse()?
    };

    let end = if parts[1].is_empty() {
        // Open-ended range: bytes=1000- (from 1000 to end)
        file_size - 1
    } else {
        parts[1].parse::<u64>()?.min(file_size - 1)
    };

    if start > end || start >= file_size {
        return Err("Invalid range values".into());
    }

    Ok((start, end))
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

/// Android storage permission handling.
///
/// On Android 11+ (API 30+), `MANAGE_EXTERNAL_STORAGE` requires the user
/// to grant "All files access" via a system settings intent. This module
/// bridges Rust ↔ Kotlin via JNI, calling methods on `MainActivity`.

/// Check whether "All files access" is currently granted.
#[cfg(target_os = "android")]
fn has_all_files_permission(app: &tauri::AppHandle) -> Result<bool, String> {
    use tauri::Manager;

    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Failed to get main window".to_string())?;

    let (tx, rx) = std::sync::mpsc::channel();

    window
        .with_webview(move |webview| {
            webview.jni_handle().exec(move |env, context, _webview| {
                let res = env
                    .call_method(context, "hasAllFilesPermission", "()Z", &[])
                    .map_err(|e| format!("JNI call failed: {:?}", e))
                    .and_then(|val| {
                        val.z()
                            .map_err(|e| format!("Failed to get boolean: {:?}", e))
                    });
                let _ = tx.send(res);
            });
        })
        .map_err(|e| format!("Webview error: {:?}", e))?;

    rx.recv()
        .map_err(|e| format!("Channel receive failed: {:?}", e))?
}

/// Open system settings for the user to grant "All files access".
#[cfg(target_os = "android")]
fn request_all_files_permission(app: &tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;

    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Failed to get main window".to_string())?;

    let (tx, rx) = std::sync::mpsc::channel();

    window
        .with_webview(move |webview| {
            webview.jni_handle().exec(move |env, context, _webview| {
                let res = env
                    .call_method(context, "requestAllFilesPermission", "()V", &[])
                    .map(|_| ())
                    .map_err(|e| format!("JNI call failed: {:?}", e));
                let _ = tx.send(res);
            });
        })
        .map_err(|e| format!("Webview error: {:?}", e))?;

    rx.recv()
        .map_err(|e| format!("Channel receive failed: {:?}", e))?
}

/// Tauri command: check permission, request if needed, poll until granted.
/// Opens Android system settings for the user to grant "All files access",
/// then polls every 2 seconds until the user returns with permission granted.
#[cfg(target_os = "android")]
#[tauri::command]
pub async fn request_storage_permission(app: tauri::AppHandle) -> Result<bool, String> {
    match has_all_files_permission(&app) {
        Ok(true) => return Ok(true),
        Ok(false) => {
            request_all_files_permission(&app)?;

            // Poll until the user returns from settings and grants permission
            loop {
                tokio::time::sleep(std::time::Duration::from_secs(2)).await;
                match has_all_files_permission(&app) {
                    Ok(true) => return Ok(true),
                    Err(e) => return Err(e),
                    _ => continue,
                }
            }
        }
        Err(e) => Err(e),
    }
}

/// Stub for non-Android platforms.
#[cfg(not(target_os = "android"))]
#[tauri::command]
pub async fn request_storage_permission(_app: tauri::AppHandle) -> Result<bool, String> {
    Ok(true)
}

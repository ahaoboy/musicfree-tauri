use crate::error::SyncError;
use base64::{Engine as _, engine::general_purpose};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

const CONFIG_FILE_NAME: &str = "musicfree.json";

/// Response structure for GitHub repository file content
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct RepoFileResponse {
    name: String,
    path: String,
    sha: String,
    size: u64,
    content: Option<String>, // Base64 encoded
    encoding: Option<String>,
}

/// Payload for creating/updating files in GitHub repo
#[derive(Serialize)]
struct UpdateFilePayload {
    message: String,
    content: String, // Base64 encoded
    #[serde(skip_serializing_if = "Option::is_none")]
    sha: Option<String>, // Required for updates
    #[serde(skip_serializing_if = "Option::is_none")]
    branch: Option<String>,
}

/// Payload for deleting files
#[derive(Serialize)]
struct DeleteFilePayload {
    message: String,
    sha: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    branch: Option<String>,
}

/// Sync response structure (compatible with frontend)
#[derive(Debug, Serialize)]
pub struct SyncResponse {
    pub id: String,
    pub files: HashMap<String, SyncFile>,
}

#[derive(Debug, Serialize)]
pub struct SyncFile {
    pub content: Option<String>,
}

/// Parse GitHub repo URL to extract owner and repo name
/// Supports formats:
/// - https://github.com/owner/repo
/// - https://github.com/owner/repo.git
/// - owner/repo
fn parse_repo_url(repo_url: &str) -> Result<(String, String), SyncError> {
    let cleaned = repo_url
        .trim()
        .trim_end_matches(".git")
        .trim_end_matches('/');

    if let Some(path) = cleaned.strip_prefix("https://github.com/") {
        let parts: Vec<&str> = path.split('/').collect();
        if parts.len() >= 2 {
            return Ok((parts[0].to_string(), parts[1].to_string()));
        }
    } else if let Some(path) = cleaned.strip_prefix("http://github.com/") {
        let parts: Vec<&str> = path.split('/').collect();
        if parts.len() >= 2 {
            return Ok((parts[0].to_string(), parts[1].to_string()));
        }
    } else {
        // Try direct owner/repo format
        let parts: Vec<&str> = cleaned.split('/').collect();
        if parts.len() == 2 {
            return Ok((parts[0].to_string(), parts[1].to_string()));
        }
    }

    Err(SyncError::InvalidRepoUrl(repo_url.to_string()))
}

/// Download file content from GitHub repository (binary format)
/// repo_url: GitHub repository URL (e.g., "https://github.com/owner/repo" or "owner/repo")
pub async fn download(
    token: &str,
    repo_url: &str,
) -> Result<SyncResponse, SyncError> {
    let (owner, repo) = parse_repo_url(repo_url)?;
    let client = Client::new();
    let url = format!(
        "https://api.github.com/repos/{}/{}/contents/{}",
        owner, repo, CONFIG_FILE_NAME
    );

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "musicfree-tauri")
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .await?;

    let status = response.status();

    if status.as_u16() == 404 {
        // File doesn't exist yet, return empty
        return Ok(SyncResponse {
            id: repo_url.to_string(),
            files: HashMap::new(),
        });
    }

    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(SyncError::GitHubApi(format!("Status {}: {}", status, error_text)));
    }

    let repo_file: RepoFileResponse = response.json().await?;

    // Decode base64 content
    let content = if let Some(encoded) = repo_file.content {
        let cleaned = encoded.replace(['\n', '\r'], "");
        let decoded = general_purpose::STANDARD.decode(&cleaned)?;
        Some(String::from_utf8(decoded)?)
    } else {
        None
    };

    let mut files = HashMap::new();
    files.insert(
        CONFIG_FILE_NAME.to_string(),
        SyncFile { content },
    );

    Ok(SyncResponse {
        id: repo_url.to_string(),
        files,
    })
}

/// Upload/update file content to GitHub repository (binary format)
/// repo_url: GitHub repository URL
/// files: Map of filename to content (None = delete file)
pub async fn update(
    token: &str,
    repo_url: &str,
    files: HashMap<String, Option<String>>,
) -> Result<SyncResponse, SyncError> {
    let (owner, repo) = parse_repo_url(repo_url)?;
    let client = Client::new();

    for (file_path, content_opt) in files.iter() {
        let url = format!(
            "https://api.github.com/repos/{}/{}/contents/{}",
            owner, repo, file_path
        );

        if let Some(content) = content_opt {
            // Get current file SHA if it exists (required for updates)
            let sha = get_file_sha(&client, token, &owner, &repo, file_path).await;

            // Encode content as base64
            let encoded_content = general_purpose::STANDARD.encode(content.as_bytes());

            let payload = UpdateFilePayload {
                message: format!("Update {}", file_path),
                content: encoded_content,
                sha,
                branch: Some("main".to_string()),
            };

            let response = client
                .put(&url)
                .header("Authorization", format!("Bearer {}", token))
                .header("User-Agent", "musicfree-tauri")
                .header("Accept", "application/vnd.github.v3+json")
                .json(&payload)
                .send()
                .await?;

            if !response.status().is_success() {
                let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                return Err(SyncError::GitHubApi(format!("Failed to update {}: {}", file_path, error_text)));
            }
        } else {
            // Delete file
            if let Some(sha) = get_file_sha(&client, token, &owner, &repo, file_path).await {
                let payload = DeleteFilePayload {
                    message: format!("Delete {}", file_path),
                    sha,
                    branch: Some("main".to_string()),
                };

                let response = client
                    .delete(&url)
                    .header("Authorization", format!("Bearer {}", token))
                    .header("User-Agent", "musicfree-tauri")
                    .header("Accept", "application/vnd.github.v3+json")
                    .json(&payload)
                    .send()
                    .await?;

                if !response.status().is_success() {
                    let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                    return Err(SyncError::GitHubApi(format!("Failed to delete {}: {}", file_path, error_text)));
                }
            }
        }
    }

    // Return updated state
    download(token, repo_url).await
}

/// Helper function to get file SHA (needed for updates/deletes)
async fn get_file_sha(
    client: &Client,
    token: &str,
    owner: &str,
    repo: &str,
    file_path: &str,
) -> Option<String> {
    let url = format!(
        "https://api.github.com/repos/{}/{}/contents/{}",
        owner, repo, file_path
    );

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "musicfree-tauri")
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .await
        .ok()?;

    if response.status().as_u16() == 404 {
        return None;
    }

    let repo_file: RepoFileResponse = response.json().await.ok()?;
    Some(repo_file.sha)
}

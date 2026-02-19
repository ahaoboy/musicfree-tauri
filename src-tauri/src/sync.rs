use crate::error::SyncError;
use base64::{Engine as _, engine::general_purpose};
use reqwest::Client;
use serde::{Deserialize, Serialize};

const CONFIG_FILE_NAME: &str = "musicfree.yjs";

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

/// Lightweight file metadata returned to the frontend for change detection.
/// By comparing `sha` with a locally cached value, the frontend can skip
/// expensive downloads when the remote file has not changed.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub sha: String,
    pub size: u64,
    pub last_modified: Option<String>,
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

/// GitHub commit entry used when fetching the latest commit for a file.
#[derive(Debug, Deserialize)]
struct GitHubCommitEntry {
    commit: GitHubCommitDetail,
}

#[derive(Debug, Deserialize)]
struct GitHubCommitDetail {
    committer: Option<GitHubCommitter>,
}

#[derive(Debug, Deserialize)]
struct GitHubCommitter {
    date: Option<String>,
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

/// Retrieve file metadata (SHA, size, last_modified) from the GitHub API
/// **without** downloading the file content.  This allows the frontend to
/// decide whether a full download is necessary by comparing the remote SHA
/// against a locally cached value.
pub async fn get_file_info(
    token: &str,
    repo_url: &str,
    file_path: Option<&str>,
) -> Result<Option<FileInfo>, SyncError> {
    let (owner, repo) = parse_repo_url(repo_url)?;
    let client = Client::new();
    let file_name = file_path.unwrap_or(CONFIG_FILE_NAME);

    // Step 1: Get file metadata (SHA + size) via the Contents API
    let contents_url = format!(
        "https://api.github.com/repos/{}/{}/contents/{}",
        owner, repo, file_name
    );

    let response = client
        .get(&contents_url)
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "musicfree-tauri")
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .await?;

    let status = response.status();
    if status.as_u16() == 404 {
        return Ok(None); // File does not exist yet
    }
    if !status.is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(SyncError::GitHubApi(format!(
            "Status {}: {}",
            status, error_text
        )));
    }

    let repo_file: RepoFileResponse = response.json().await?;

    // Step 2: Get the last commit date for this specific file
    let commits_url = format!(
        "https://api.github.com/repos/{}/{}/commits?path={}&per_page=1",
        owner, repo, file_name
    );

    let last_modified = match client
        .get(&commits_url)
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "musicfree-tauri")
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .await
    {
        Ok(resp) if resp.status().is_success() => {
            let commits: Vec<GitHubCommitEntry> = resp.json().await.unwrap_or_default();
            commits
                .first()
                .and_then(|c| c.commit.committer.as_ref())
                .and_then(|cm| cm.date.clone())
        }
        _ => None,
    };

    Ok(Some(FileInfo {
        sha: repo_file.sha,
        size: repo_file.size,
        last_modified,
    }))
}

pub async fn download(
    token: &str,
    repo_url: &str,
    file_path: Option<&str>,
) -> Result<Vec<u8>, SyncError> {
    let (owner, repo) = parse_repo_url(repo_url)?;
    let client = Client::new();
    let file_name = file_path.unwrap_or(CONFIG_FILE_NAME);
    let url = format!(
        "https://api.github.com/repos/{}/{}/contents/{}",
        owner, repo, file_name
    );

    // Use raw format to get binary data directly without base64 encoding
    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "musicfree-tauri")
        .header("Accept", "application/vnd.github.raw")
        .send()
        .await?;

    let status = response.status();

    if status.as_u16() == 404 {
        // File doesn't exist yet, return empty
        return Ok(Vec::new());
    }

    if !status.is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(SyncError::GitHubApi(format!(
            "Status {}: {}",
            status, error_text
        )));
    }

    // Get raw binary data
    let bytes = response.bytes().await?;
    Ok(bytes.to_vec())
}

/// Upload/update file content to GitHub repository (binary format)
/// Note: GitHub API requires base64 encoding for the content field
pub async fn update(
    token: &str,
    repo_url: &str,
    content: Vec<u8>,
    file_path: Option<&str>,
    message: Option<&str>,
) -> Result<(), SyncError> {
    let (owner, repo) = parse_repo_url(repo_url)?;
    let client = Client::new();
    let file_name = file_path.unwrap_or(CONFIG_FILE_NAME);
    let url = format!(
        "https://api.github.com/repos/{}/{}/contents/{}",
        owner, repo, file_name
    );

    // Get current file SHA if it exists (required for updates)
    let sha = get_file_sha(&client, token, &owner, &repo, file_name).await;

    // Encode content as base64 (GitHub API requires base64 in the JSON payload)
    let encoded_content = general_purpose::STANDARD.encode(&content);

    let default_message = format!("Update {}", file_name);
    let payload = UpdateFilePayload {
        message: message.unwrap_or(&default_message).to_string(),
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
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(SyncError::GitHubApi(format!(
            "Failed to update {}: {}",
            file_name, error_text
        )));
    }

    Ok(())
}

/// Helper function to get file SHA (needed for updates)
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

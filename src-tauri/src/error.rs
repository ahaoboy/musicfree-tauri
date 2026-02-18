use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error("MusicFree error: {0}")]
    MusicFree(String),

    #[error("Path error: {0}")]
    PathError(String),

    #[error("Invalid UTF-8 in path")]
    InvalidUtf8,

    #[error("Sync error: {0}")]
    Sync(#[from] SyncError),

    #[error("Unknown error: {0}")]
    Unknown(String),
}

#[derive(Debug, Error)]
pub enum SyncError {
    #[error("Invalid repository URL: {0}")]
    InvalidRepoUrl(String),

    #[error("HTTP request failed: {0}")]
    HttpRequest(#[from] reqwest::Error),

    #[error("Base64 decode error: {0}")]
    Base64Decode(#[from] base64::DecodeError),

    #[error("UTF-8 decode error: {0}")]
    Utf8Decode(#[from] std::string::FromUtf8Error),

    #[error("File not found in repository: {0}")]
    FileNotFound(String),

    #[error("GitHub API error: {0}")]
    GitHubApi(String),
}

// Implement Serialize so we can return it to Tauri frontend
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;

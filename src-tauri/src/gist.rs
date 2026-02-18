use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Deserialize, Serialize)]
pub struct Gist {
    pub id: String,
    pub files: HashMap<String, GistFile>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GistFile {
    pub content: Option<String>,
}
#[derive(Serialize)]
struct UpdatePayload {
    files: HashMap<String, UpdateFile>,
}

#[derive(Serialize)]
struct UpdateFile {
    content: Option<String>, // None = delete
}

pub async fn download(
    token: &str,
    gist_id: &str,
) -> Result<Gist, reqwest::Error> {
    let client = Client::new();

    client
        .get(format!("https://api.github.com/gists/{}", gist_id))
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "rust-client")
        .send()
        .await?
        .json::<Gist>()
        .await
}

pub async fn update(
    token: &str,
    gist_id: &str,
    files: HashMap<String, Option<String>>,
) -> Result<Gist, reqwest::Error> {
    let client = Client::new();

    let payload = UpdatePayload {
        files: files
            .into_iter()
            .map(|(k, v)| (k, UpdateFile { content: v }))
            .collect(),
    };

    client
        .patch(format!("https://api.github.com/gists/{}", gist_id))
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "rust-client")
        .json(&payload)
        .send()
        .await?
        .json::<Gist>()
        .await
}

# MusicFree Tauri

A modern music player application built with Rust, Tauri, and React.

<div align="center">
  <img src="https://github.com/ahaoboy/musicfree-tauri/blob/main/public/icon.png?raw=true" alt="MusicFree Icon" width="256" height="256">
</div>

<div align="center">
  <table>
    <tr>
      <th align="center">Youtube</th>
      <th align="center">Bilibili</th>
    </tr>
    <tr>
      <td align="center">
        <video src="https://github.com/user-attachments/assets/0211df67-ca00-4bde-9d53-25fe15886074"></video>
      </td>
      <td align="center">
        <video src="https://github.com/user-attachments/assets/4fe1da37-6a9d-41d2-a7a2-7fbc1bf5cb54"></video>
      </td>
    </tr>
  </table>
</div>

## About

This is a desktop music player application that provides a seamless music listening experience.

## Features

- **Gesture Support**: Supports natural gesture operations. Swiping left or right allows you to switch between pages or exit the current page smoothly.
- **Media Session Integration**: Supports system-level media controls (lock screen, notification area, hardware keys) for play/pause, next/prev, and seeking on Windows. (Android support is currently not available, contributions are welcome via PR!)
- **Cloud Sync**: Sync your playlists and settings across devices using a private GitHub repository. Powered by Yjs for robust conflict resolution and offline-first experience.
- **Auto-Pause on Disconnect**: Automatically pauses playback when a Bluetooth device or headset is disconnected.
  > **Technical Note**: To detect device changes and identifying Bluetooth hardware, this feature utilizes the [MediaDevices API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/mediaDevices). As a result, the application requires **Bluetooth** and **Microphone** permissions. **MusicFree does not collect or upload any personal information.** If you have a more privacy-preserving or robust technical solution, contributions are welcome via Pull Requests!

## Installation

### Download Pre-built Binaries

Download the installer for your platform from the [Releases](https://github.com/ahaoboy/musicfree-tauri/releases) page.

### CLI

If you prefer a pure CLI without GUI, check out: [musicfree](https://github.com/ahaoboy/musicfree)


## Usage Guide

### Search Support
The search bar is highly flexible and supports several input formats:
- **Full URLs**: Paste direct links to single tracks or entire playlists.
  ```text
  https://www.youtube.com/watch?v=BnnbP7pCIvQ
  https://www.bilibili.com/video/BV1soUtYEEJ7
  https://www.youtube.com/watch?v=F5tSoaJ93ac&list=PLJP5_qSxMbkLzsriTWWMMhWhG7C7ThQPz
  ```
- **Short IDs**: Paste a video or playlist ID. The app automatically identifies the platform.
  ```text
  BnnbP7pCIvQ
  BV1soUtYEEJ7
  PLJP5_qSxMbkLzsriTWWMMhWhG7C7ThQPz
  ```
- **Sharing Messages**: Raw sharing text from mobile apps. The app extracts links and handles short links like `b23.tv`.
  ```text
  【Right Here Waiting - Richard Marx-哔哩哔哩】 https://b23.tv/fcic1pG
  ```

### Cloud Sync Setup

Keep your data synchronized across devices securely using GitHub:

1.  **Create a Repository**:
    *   Create a new **Private** repository on GitHub (e.g., `my-music-sync`).
    *   Initialize it with a README or keep it empty.
2.  **Generate a Personal Access Token (PAT)**:
    *   Go to **GitHub Settings** -> **Developer settings** -> **Personal access tokens** -> **Tokens (classic)**.
    *   Click "Generate new token (classic)".
    *   Give it a name (e.g., `MusicFree Sync`) and select the **`repo`** scope.
    *   *Alternative (Recommended)*: Use **Fine-grained tokens**, granting `Read and Write` access to only your sync repository's **Contents**.
3.  **Configure MusicFree**:
    *   Open **Settings** in MusicFree.
    *   Paste your **GitHub Token**.
    *   Enter your **Repository URL** (e.g., `https://github.com/your-username/my-music-sync`).
    *   Once configured, the app will automatically sync in the background based on your preferred interval.

**Why use a Private Repo?**
Your playlists and configurations are stored in an encrypted Yjs binary format (`musicfree.yjs`) and a human-readable JSON (`musicfree.json`). Using a private repository ensures your listening habits and data remain private to you.

### Data Management
In the Settings page, you will find two cleaning options:
- **Clear Cache**: Removes internal temporary files (such as cached cover images) generated during searching and downloading. These files help speed up repeated searches but can be safely removed to save space without losing your downloaded music.
- **Clear Storage**: **A complete reset.** This will delete all downloaded music, saved playlists, and configuration data, including the cache.

## Troubleshooting

### YouTube Download Failures
Due to intensified restrictions by YouTube, some videos may be unavailable for download depending on your IP region.
- **Currently, there is no universal workaround for these restrictions.**
- **Recommendation**: If a YouTube download fails, try searching for the same video or a re-upload on **Bilibili**.

## Development Notice

⚠️ **This project is still in development. Breaking changes may occur at any time.**

## Acknowledgments

Thanks to the following open source projects:

- [Rust](https://github.com/rust-lang/rust)
- [Tauri](https://github.com/tauri-apps/tauri)
- [React](https://github.com/facebook/react)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- [MusicFree](https://github.com/maotoumao/MusicFree)

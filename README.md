# MusicFree Tauri

A modern music player application built with Rust, Tauri, and React.

<div align="center">
  <img src="https://github.com/ahaoboy/musicfree-tauri/blob/main/public/icon.png?raw=true" alt="MusicFree Icon" width="256" height="256">
</div>



https://github.com/user-attachments/assets/990ff7c7-c1e6-4446-91a8-21c112a0e3f3



## About

This is a desktop music player application that provides a seamless music listening experience.

## Features

- **Gesture Support**: Supports natural gesture operations. Swiping left or right allows you to switch between pages or exit the current page smoothly.
- **Media Session Integration**: Supports system-level media controls (lock screen, notification area, hardware keys) for play/pause, next/prev, and seeking on Windows. (Android support is currently not available, contributions are welcome via PR!)
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
  https://www.bilibili.com/video/BV1aAV7zHEhJ
  https://www.youtube.com/watch?v=F5tSoaJ93ac&list=PLJP5_qSxMbkLzsriTWWMMhWhG7C7ThQPz
  ```
- **Short IDs**: Paste a video or playlist ID. The app automatically identifies the platform.
  ```text
  BnnbP7pCIvQ
  BV1aAV7zHEhJ
  PLJP5_qSxMbkLzsriTWWMMhWhG7C7ThQPz
  ```
- **Sharing Messages**: Raw sharing text from mobile apps. The app extracts links and handles short links like `b23.tv`.
  ```text
  【Right Here Waiting - Richard Marx-哔哩哔哩】 https://b23.tv/fcic1pG
  ```

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

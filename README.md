# Music Player

A complete music player application built with React TypeScript and Tauri, featuring audio extraction, download, and playback capabilities.

## Features

### 🎵 Audio Player
- **Full-featured audio player** with play, pause, seek, and volume controls
- **Playlist support** with next/previous track navigation
- **Loop functionality** for continuous playback
- **Progress tracking** with visual progress bar
- **Volume control** with slider interface
- **Responsive design** for mobile and desktop

### ⬇️ Download Manager
- **URL-based audio extraction** from various platforms
- **Batch download support** with select all functionality
- **Individual download controls** for each audio track
- **Download progress tracking** with status indicators
- **Error handling and retry** for failed downloads
- **Audio metadata display** including title, artist, platform, duration, and tags

### 📱 Mobile-First Design
- **Bottom navigation** with Player and Download tabs
- **Responsive layout** that adapts to different screen sizes
- **Touch-friendly controls** optimized for mobile interaction
- **Modern UI components** with smooth animations and transitions

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **State Management**: Zustand with devtools and selectors
- **Backend**: Tauri (Rust)
- **Styling**: CSS3 with modern features
- **Audio Handling**: HTML5 Audio API
- **File System**: Tauri's file system APIs

## Architecture

### Global State Management
The application uses **Zustand** for centralized state management with the following structure:

```typescript
interface AppStore {
  // UI State
  activeTab: 'player' | 'download';

  // Audio Library State
  localAudios: LocalAudio[];
  localAudiosLoading: boolean;
  localAudiosError: string;

  // Player State
  playback: PlaybackState;
  playlist: LocalAudio[];
  currentIndex: number;

  // Download State
  downloadQueue: DownloadProgress[];
  extractedAudios: Audio[];
  extractLoading: boolean;
  extractError: string;
}
```

### Store Features
- **Devtools Integration**: Full Redux DevTools support for debugging
- **Selectors**: Optimized selectors for performance
- **Async Actions**: Built-in support for async operations
- **Automatic Persistence**: State persists across app restarts

## Project Structure

```
src/
├── api/                 # API layer for Tauri commands
│   └── index.ts        # Audio extraction, download, and file operations
├── components/         # Reusable UI components
│   ├── AudioList.tsx   # Audio library display
│   ├── AudioPlayer.tsx # Main audio player controls
│   ├── BottomNavigation.tsx # Mobile navigation
│   └── DownloadPage.tsx # Download interface
├── hooks/              # Custom React hooks (legacy)
│   ├── useAudioPlayer.ts # Audio playback logic
│   └── useLocalAudios.ts # Local audio management
├── pages/              # Page components
│   └── PlayerPage.tsx  # Main player page
├── store/              # Global state management
│   └── index.ts        # Zustand store with actions and selectors
├── types/              # TypeScript type definitions
│   └── index.ts        # Audio, state, and app types
├── utils/              # Utility functions
│   └── index.ts        # Time formatting, validation, etc.
├── constants/          # App constants
│   └── index.ts        # Configuration values
└── App.tsx            # Main application component
```

## API Interface

The application uses the following Tauri commands:

### Core Functions
- `extract_audios(url: string): Promise<Audio[]>` - Extract audio information from URLs
- `download_audio_and_update_config(audio: Audio): Promise<LocalAudio[]>` - Download audio files and update config
- `download_audio(audio: Audio): Promise<LocalAudio[]>` - Download audio files (low-level)
- `get_config(): Promise<Config>` - Get application configuration
- `save_config(config: Config): Promise<Config>` - Save application configuration
- `get_local_audios(): Promise<LocalAudio[]>` - Get all downloaded audio files from config
- `delete_local_audio(audioId: string): Promise<boolean>` - Delete local audio files and update config
- `app_dir(): Promise<string>` - Get application directory path
- `get_play_url(audio: LocalAudio): Promise<string>` - Get playable URL for local audio

### Data Types

```typescript
type Audio = {
  id: string;
  title: string;
  download_url: string;
  local_url?: string;
  author: string[];
  cover?: string;
  tags: string[];
  duration?: number;
  platform: string;
  date: number;
};

type LocalAudio = {
  audio: Audio;
  path: string;
}

type Config = {
  audios: LocalAudio[];
}
```

## Key Features Implementation

### Global State Management (Zustand Store)
- **Centralized state** for all application data
- **Optimized selectors** for component performance
- **Async action creators** for API calls
- **DevTools integration** for debugging
- **Automatic persistence** and state hydration

### Config Management
- **Centralized configuration** using `get_config()` and `save_config()`
- **Automatic config updates** after downloads and deletions
- **Persistent audio library** stored in application config
- **Atomic operations** ensuring config consistency

### Audio Player Hook (`useAudioPlayer`)
- Manages audio playback state
- Handles play, pause, seek, and volume operations
- Supports playlist navigation and loop functionality
- Provides real-time progress updates

### Local Audio Management (`useLocalAudios`)
- Loads and manages downloaded audio files
- Handles adding new downloads to the library
- Supports audio deletion with cleanup

### Responsive Design
- Mobile-first approach with bottom navigation
- Adaptive layouts for different screen sizes
- Touch-optimized controls and interactions
- Consistent design language across components

## Usage

1. **Download Audio**:
   - Navigate to the Download tab
   - Enter a video/audio URL
   - Click "Extract" to find available audio
   - Select individual tracks or use "Select All"
   - Click "Download" to save audio files locally

2. **Play Audio**:
   - Navigate to the Player tab
   - Browse your downloaded audio library
   - Click on any track to start playback
   - Use player controls for playback management

3. **Player Controls**:
   - Play/Pause button for playback control
   - Progress slider for seeking within tracks
   - Volume slider for audio level adjustment
   - Previous/Next buttons for playlist navigation
   - Loop button for continuous playback

## Development

The application is built with modern React patterns:
- Functional components with hooks
- TypeScript for type safety
- Custom hooks for state management
- Modular component architecture
- Responsive CSS with mobile-first design

## Browser Compatibility

- Modern browsers with HTML5 Audio support
- Mobile browsers (iOS Safari, Chrome Mobile)
- Desktop browsers (Chrome, Firefox, Safari, Edge)

## Future Enhancements

- Shuffle mode for random playback
- Playlist creation and management
- Audio visualization
- Equalizer controls
- Search and filtering
- Import/export functionality
- Cloud storage integration
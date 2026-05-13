# ImaginAI

**[日本語版はこちら](README-ja.md)**

## 1. Overview

ImaginAI is a desktop application for controlling AI image/video/music/speech generation APIs through a dedicated GUI. It supports both **Google AI Studio** (Nano Banana for image, Imagen 4 for image, Veo 3.1 for video, Lyria 3 for music, Gemini TTS for speech) and **OpenAI** (GPT Image 2 / 1.5 / 1 for image), with an extensible architecture designed to accommodate additional AI generation APIs in the future.

Key features:

- **Image Generation**: Generate images from text prompts on either provider (Nano Banana / Imagen 4 / GPT Image)
- **Image Edit Mode**: Treat the prompt as an editing instruction applied to an attached reference image (supported on Nano Banana and GPT Image)
- **Video Generation**: Text-to-video and image-to-video with Veo 3.1
- **Music Generation**: Text-to-music and image-to-music with Lyria 3
- **Speech Generation (TTS)**: Text-to-speech with Gemini TTS, including style presets and built-in voices
- **Reference Image Attachment**: Via file picker, drag & drop, or attaching a previous history result
- **API Key Management**: Per-provider default key plus named custom keys, encrypted with Electron safeStorage; one-click provider switch from the title bar
- **Generation History**: Mixed thumbnail grid across providers with filters, search, parameter restore, save-as, and bulk ZIP export
- **Image/Video/Audio Viewer**: Modeless windows for viewing images and playing video/music/speech
- **Settings**: Language (Japanese/English), theme (light/dark/system), API key management with connection test, history save location
- **In-App Auto-Update** (installer builds only)
- **Security**: API keys encrypted with Electron safeStorage; IPC-based architecture prevents direct access from the Renderer process

## 2. Supported OS

- Windows 10/11
- macOS 10.15+
- Linux (Debian-based / RHEL-based)

Note: This project does not perform code signing on Windows. If SmartScreen displays a warning, select "More info" then "Run anyway".

## 3. Developer Reference

### Prerequisites

- Node.js 22.x or higher
- yarn 4
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd <repository-name>

# Install dependencies
yarn install

# Start development
yarn dev
```

DevTools:

- During development, DevTools opens automatically in detached mode
- Toggle with F12 or Ctrl+Shift+I (Cmd+Option+I on macOS) in both development and production builds

### Build / Distribution

- Windows: `yarn dist:win`
- macOS: `yarn dist:mac`
- Linux: `yarn dist:linux`

During development, BrowserRouter loads `http://localhost:3001`. For production builds, HashRouter loads `dist/renderer/index.html`.

### Direct Release to GitHub (for Auto-Update)

These commands upload build artifacts and `latest*.yml` (auto-update metadata) directly to the GitHub repository configured under `publish:` in `electron-builder.yml`. Because `releaseType: draft` is set, each command **aggregates artifacts into a single draft release for the same version** on GitHub. Once all platforms are present, click "Publish release" in the GitHub UI to deliver the update to users.

- Windows: `yarn release:win`
- macOS: `yarn release:mac`
- Linux: `yarn release:linux`

Before running, set a GitHub Personal Access Token (with the `public_repo` scope) in the `GH_TOKEN` environment variable.

```bash
export GH_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"
```

When building each platform on different machines, ensure the `version` in `package.json` is identical across all machines, then run the corresponding `release:*` command on each machine in turn.

### macOS Setup: Environment Variables for Signing & Notarization

To build with signing and notarization for macOS, set the following environment variables before running `yarn dist:mac`:

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"
```

### Windows Setup: Developer Mode

To run and test unsigned local builds on Windows, enable Developer Mode:

1. Settings > Privacy & Security > For developers
2. Turn on "Developer Mode"
3. Restart the OS

### Project Structure (Excerpt)

```text
src/
├── main/                  # Electron main: IPC / service managers
│   ├── index.ts           # Startup, window creation, service init
│   ├── ipc/               # IPC handlers
│   ├── services/          # Services
│   └── utils/             # Utilities
├── preload/               # Secure API bridge to renderer
├── renderer/              # React + MUI UI
├── shared/                # Type definitions, constants, model definitions
└── public/                # Icons, etc.
```

### Technologies Used

- **Electron**
- **React 19 (MUI v9)**
- **TypeScript**
- **Zustand**
- **i18next**
- **Vite**

### Creating Windows Icons

```exec
magick public/icon.png -define icon:auto-resize=256,128,96,64,48,32,24,16 public/icon.ico
```

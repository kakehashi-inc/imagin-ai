# ImaginAI

**[日本語版はこちら](README-ja.md)**

## 1. Overview

ImaginAI is a desktop application for controlling AI image/video generation APIs through a dedicated GUI. It supports the Google Gemini API (Image Generation) and Veo 3.1 (Video Generation), with an extensible architecture designed to accommodate additional AI generation APIs in the future.

Key features:

- **Image Generation**: Configure parameters such as model, aspect ratio, resolution, image count, output format, and safety filter via the GUI, and generate images from text prompts
- **Video Generation**: Generate videos from text prompts or images using Veo 3.1 models, with configurable duration, resolution, and aspect ratio
- **Reference Image Attachment**: Image-to-image/video generation via file picker, drag & drop, or from history entries
- **Generation History**: Thumbnail grid view, search, parameter restore, save as, and bulk ZIP archive export (supports both images and videos)
- **Image/Video Viewer**: View images and play videos in modeless windows
- **Settings**: Language (Japanese/English), theme (light/dark/system), API key management (encrypted storage & connection test), history save location
- **Security**: API keys encrypted with Electron safeStorage; IPC-based architecture prevents direct access from the Renderer process

## 2. Supported OS

- Windows 10/11
- macOS 10.15+
- Linux (Debian-based / RHEL-based)

Note: This project does not perform code signing on Windows. If SmartScreen displays a warning, select "More info" then "Run anyway".

## 3. Developer Reference

### Development Rules

- Developer-facing documents, except `README.md` and `README-ja.md`, must be placed in the `Documents` directory.
- After every change, run the linter and fix all issues. If a linter error is intentionally suppressed, add a comment explaining the reason. **A full build is only required for releases; running the linter alone is sufficient during development.**
- Temporary or investigative scripts (e.g., research/debug scripts) must be placed in the `scripts` directory.
- When implementing data models, create one file per table.
- When creating or modifying a data model, update `Documents/テーブル定義.md`. Table definitions must be expressed as one table per database table, with column names, types, and relations documented within the table.
- When system behavior changes, update `Documents/システム仕様.md`.
- When adding features or fixing bugs, update the `releaseNotes` field in `electron-builder.yml`. Entries must be placed under the appropriate section: `## New Features` for new or enhanced functionality, and `## Bug Fixes` for bug fixes. All entries must be written in English.

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

DevTools during development:

- DevTools opens automatically in detached mode
- Toggle with F12 or Ctrl+Shift+I (Cmd+Option+I on macOS)

### Build / Distribution

- All platforms: `yarn dist`
- Windows: `yarn dist:win`
- macOS: `yarn dist:mac`
- Linux: `yarn dist:linux`

During development, BrowserRouter loads `http://localhost:3001`. For production builds, HashRouter loads `dist/renderer/index.html`.

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
- **React (MUI v7)**
- **TypeScript**
- **Zustand**
- **i18next**
- **Vite**

### Creating Windows Icons

```exec
magick public/icon.png -define icon:auto-resize=256,128,96,64,48,32,24,16 public/icon.ico
```

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Auto-update via `electron-updater`: a Snackbar in the lower-right prompts when a new version is available, then displays a determinate progress bar while downloading and an indeterminate bar while installing; "Later" suppresses the prompt for the session. The startup check waits for the main window's first `did-finish-load` and then runs after a 3 s delay, so it never fires before the window is shown. Disabled entirely in development (`NODE_ENV=development` or `--dev`).
- New IPC channels (`updater:check` / `updater:download` / `updater:quitAndInstall` / `updater:getState` / `updater:stateChanged`) and a `window.imaginai.updater` preload bridge.

### Changed

- Bumped `@mui/material` and `@mui/icons-material` to `^9.0.0`.
  - Root `tsconfig.json` `moduleResolution` switched to `"bundler"` so MUI v9's `.d.mts`-only types resolve.
  - `tsconfig.main.json` overrides `moduleResolution` back to `"node"` because `bundler` is incompatible with `module: "CommonJS"` for the Electron main / preload bundles.
  - Migrated remaining MUI v9 deprecations: `Typography` `fontWeight` / `display` system props moved into `sx`; `TextField` `inputProps` replaced by `slotProps.htmlInput`; legacy `PlayCircleOutline` icon import switched to `PlayCircleOutlined`.
- `electron-builder.yml` `publish.repo` is now the bare repository name (not the full URL) and `releaseType` is `draft` so multi-platform release artifacts are aggregated into one draft release per version on GitHub.

## [v0.5.1] - 2026-04-19

### Fixed

- Voice (TTS) generation failures no longer surface as a "music was not generated" error. Music (Lyria) and voice (TTS) now have separate `MediaType` values (`music`, `voice`) and distinct error codes (`NO_MUSIC_GENERATED`, `NO_VOICE_GENERATED`).
- TTS post-processing no longer discards a successful API result when the bundled ffmpeg binary is unavailable or fails. The MP3 encode is attempted in memory, and on failure the raw PCM is wrapped with a WAV header in pure JS and saved as `.wav` so the billed API output is always preserved and immediately playable.
- Saved audio file extension is now derived from the actual mimeType (`.mp3` / `.wav` / etc.) instead of being hard-coded to `.mp3`.

### Changed

- Generation error messages no longer instruct users to "try a different prompt" for content-soft failures (safety blocks, refusals, etc.). The headline now states the fact, and the diagnostics returned by the API (`finishReason`, `promptFeedback.blockReason`, `safetyRatings`, refusal text, Veo's `raiMediaFilteredReasons`) are surfaced verbatim in the error details panel.
- `MediaType` no longer includes `'audio'`; it is split into `'music'` (Lyria) and `'voice'` (Gemini TTS).
- The `apiEndpoint` field on `ModelDefinition` has been removed. Generator dispatch is driven by `mediaType`, and Imagen vs Gemini image is disambiguated by the `imagen-` model id prefix.
- Renderer UI gating that previously hinged on `apiEndpoint === 'generateContentTTS'` now uses `mediaType === 'voice'`.
- Reference images are now preprocessed uniformly across image, video, and music generation paths: each image is decoded via Electron `nativeImage`, downscaled (preserving aspect ratio) so the long edge is at most 1920 px, and re-encoded as JPEG (quality 85). PNG/WebP inputs are converted to JPEG. Per-model attachment caps replace the previous boolean `supportsImageInput` field — `ModelDefinition.maxReferenceImages?: number` declares the maximum (omitted = 0 = no image input). Defaults: Nano Banana 10, Veo 1, Lyria 5. Imagen and TTS models declare no image input.
- Video (Veo) reference image is now strictly limited to 1 in the UI: adding a new attachment overwrites the previous one (the image is used as the starting frame). The reference image area shows an "開始フレーム" / "Starting frame" label for video models.

## [v0.5.0] - 2026-04-17

### Added

- Free-tier availability is surfaced in the model selector: when a free-tier API key is active, models that are not usable on the free tier are shown as disabled with a warning chip. Reference pricing is always displayed regardless of the active key type.
- Shutdown notice for Nano Banana (gemini-2.5-flash-image, 2026/10/2).
- Multi API key management: default key, free-tier key, and up to five custom titled keys.
- API key switcher in the title bar; the active key is used for generation, and whether pricing or free-tier info is shown for each model follows the active key's type.
- Free-tier toggle for the default API key (off by default; existing data migrates as unchecked).
- Usage notes button in the title bar that opens a dialog with Google AI Studio usage precautions and recommendations.
- Text-to-speech (TTS) support via three Gemini TTS models: Gemini 3.1 Flash TTS Preview, Gemini 2.5 Pro Preview TTS, and Gemini 2.5 Flash Preview TTS.
- Style preset selector (9 presets + Custom) with an auto-filled style instruction textarea; manual edits switch the selector to Custom.
- Voice preset selector (30 built-in voices) for TTS generation.
- Audio Tags reference dialog (? button in the Text-to-speak label, Gemini 3.1 Flash TTS only).

### Changed

- Updated reference pricing for all models to the latest values (2026/4/17).
- Updated Veo 3.1 Fast pricing: 720p $0.10/sec, 1080p $0.12/sec, 4K $0.30/sec.

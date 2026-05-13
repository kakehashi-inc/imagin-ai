# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [v0.6.0] - 2026-05-13

### Added

- OpenAI image generation as a second provider alongside Google AI Studio. GPT Image 2, GPT Image 1.5, and GPT Image 1 are available, with controls for size (GPT Image 2 also offers 2K and 4K), quality (Low / Medium / High), output format (PNG / JPEG / WebP), background (Opaque / Transparent where supported), negative prompt, and image count. OpenAI API keys are managed in Settings the same way as Gemini keys (default + up to five named custom keys), and the title-bar key picker groups all keys by provider so switching between Google AI Studio and OpenAI takes one click. Usage Notes now cover OpenAI policies side-by-side with Google AI Studio. The history panel mixes both providers, with a brand badge on each thumbnail and filters for provider, media type, and model; the model dropdown shows provider and media-type icons.
- Image edit mode. When a reference image is attached and the active model supports editing, an "Image Edit Mode" checkbox appears next to "Attach images". With it on, the prompt is treated as an editing instruction applied to the attached image. Works for both Google AI Studio (Nano Banana family) and OpenAI (GPT Image family). Entries created in edit mode are tagged with an "Edit" badge in history.
- In-app auto-update for installer builds. A notification appears in the lower-right when a new version is available, with a progress indicator while downloading and installing. "Later" silences the prompt for the current session. Auto-update is intentionally disabled in development and portable ZIP builds.

### Changed

- On first launch after upgrading, existing API keys and history entries are silently migrated to the new provider-aware format. The encrypted API keys file is preserved as `api-keys.enc.bak.v1` next to the active file in case manual rollback is needed.
- Reviewed and updated reference pricing for all Google AI Studio models (Nano Banana, Imagen 4, Veo 3.1, Lyria 3, Gemini TTS) against the current official price tables. Reference pricing date in the panel is now 2026-05-13.
- Windows portable distribution is now shipped as a `.zip` archive instead of a bare `.exe`, reducing browser and antivirus warnings on download.

### Fixed

- "Restore parameters" from a history entry now also restores the reference images and the edit-mode toggle. Previously both were cleared even when the source entry had them.

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

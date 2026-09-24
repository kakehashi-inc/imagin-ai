# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [v0.7.0] - 2026-09-24

### Added

- **Lyria 3.5** (music) is now selectable. It generates full-length songs of a couple of minutes with vocals and lyrics for $0.08 per song, and you can steer the length and structure from the prompt.
- **Gemini 3.8 Flash TTS** and **Gemini 3.8 Flash-Lite TTS** (speech) are now selectable, at $0.0135 and $0.009 per minute of audio - both cheaper than the previous generation. Flash TTS covers 130 languages and Flash-Lite 101, and both work on a free-tier key. These are introductory prices that double on 1 January 2027, which the note under the model selector states.
- **GPT Image 2.5 Flare** and **GPT Image 2.5 Sunburst** (image) are now the OpenAI models on offer - Flare for fast everyday work, Sunburst for editing precision. They cost the same as each other, from $0.005 per image. Both add two quality steps above High (XHigh and Max) and support transparent backgrounds; the quality choices in the panel follow the selected model, so you are never offered a step the model cannot do.
- **Veo 3.1** and **Veo 3.1 Fast** accept up to three subject reference images. A toggle next to "Attach images" switches between "Starting frame" (one image the video animates out of, as before) and "Subject reference" (up to three images whose subject is carried into the video; this needs an 8-second clip).
- **Gemini Omni Flash** can now output 360p, 720p, 1080p or 4K, so the video resolution selector appears for it as it does for Veo. 1080p and 4K are produced by upscaling the 720p generation.

### Changed

- Model capabilities now match what the providers currently support: Nano Banana 2 Lite offers image edit mode, the Nano Banana 2 / 2 Lite / Pro models accept up to 14 reference images, Lyria accepts up to 10, and Nano Banana Pro no longer lists the ultra-wide and ultra-tall ratios (4:1, 8:1, 1:4, 1:8) it cannot produce.
- Speech generation now reads your text exactly as written, with the style you pick applied as separate direction instead of being mixed into the spoken text. The audio tag help has been rewritten in plain language and split into the tags you write inside the text and the pace and tone you set in the Style field.
- Gemini Omni Flash now uses its stable version, as the preview version shuts down on 2026/9/30.
- Corrected the reference prices for OpenAI images at 2K and 4K, which were far too high (4K at High quality showed about $1.69 where it actually costs $0.400). Cost does not grow in proportion to pixels, so a wide 4K frame is cheaper than a 2K square. Prices for every other model were re-checked against the official tables and are unchanged; the reference date shown under the price list is now 2026.9.24.

### Removed

- Nano Banana, ahead of its shutdown on 2026/10/2. Successor: Nano Banana 2.
- Lyria 3 Pro, superseded by Lyria 3.5 at the same price.
- Gemini 3.1 Flash TTS and Gemini 2.5 Flash / Pro TTS, all superseded by the cheaper Gemini 3.8 TTS models. Google also limits access to the Gemini 2.5 models to projects that already used them, so a new API key could not reach the 2.5 speech models at all.
- GPT Image 2, GPT Image 1.5 and GPT Image 1 (the latter two shut down on 2026/12/1). Successor: GPT Image 2.5 Flare.
- In every case above, existing history entries stay fully usable: you can browse them, filter the history by those models, and restore their parameters. Restoring an entry carries the prompt and settings over to the successor named above.

## [v0.6.4] - 2026-07-19

### Added

- Gemini Omni Flash, a new Google AI Studio video model, is now selectable. It generates 3-10 second videos at 720p / 24fps with automatically generated audio, at roughly $0.10 per second of video. Clip length and background music / sound effects are controlled through the prompt, and you can attach up to two reference images for image-to-video generation. The aspect ratio can be set to landscape (16:9) or portrait (9:16).

## [v0.6.3] - 2026-07-14

### Added

- Nano Banana 2 Lite, a new Google AI Studio image model, is now selectable. It is the fastest and lowest-cost tier of the Nano Banana family, generating images in about four seconds at roughly $0.034 per image. It outputs at 1K resolution across the standard aspect ratios and can take reference images, but it does not offer image edit mode or 2K/4K output.
- Models with a provider-announced end-of-support date are now marked with an "Ending" label in the model dropdown, so you can tell at a glance which models are being retired while choosing one. The exact end date is shown as a note beneath the model selector once such a model is selected.

### Changed

- Reviewed reference pricing and availability for all Google AI Studio and OpenAI models against the current official price and deprecation tables. Prices and shutdown dates are unchanged; the reference pricing date in the panel is now 2026-07-14.

## [v0.6.2] - 2026-06-16

### Changed

- Nano Banana 2 and Nano Banana Pro now use their stable (GA) versions. Their preview versions are scheduled for shutdown on 2026/6/25, so new generations automatically use the stable models. Names, quality options, and pricing are unchanged. Older history entries created on the preview versions remain fully available for browsing, filtering, and parameter restore; restoring one switches the model to the matching stable version.

### Removed

- The Imagen 4 image models (Imagen 4 Fast / Imagen 4 / Imagen 4 Ultra) are no longer available for new generations ahead of their shutdown on 2026/6/24. They have been removed from the model picker. Existing history entries created with Imagen 4 remain fully available: you can still browse them, filter the history by these models, and restore their parameters. When you restore parameters from an Imagen 4 entry, the prompt and settings are carried over to Nano Banana 2, the recommended replacement.

## [v0.6.1] - 2026-06-05

### Fixed

- In-app auto-update on macOS now works end to end. Previously pressing "Update" appeared to do nothing: the update either could not be downloaded, or downloaded successfully but was never applied after the app restarted. Both problems are fixed, so a new version now downloads and installs automatically. (Note: this fix takes effect only from a release that ships the new macOS build, so existing macOS users need to install the next version manually once; updates are automatic afterward.)
- When a download fails, the update notification now shows an error message with "Retry" and "Close" buttons instead of silently disappearing. Failures of the automatic background update check (for example when offline) stay quiet and no longer interrupt you.

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

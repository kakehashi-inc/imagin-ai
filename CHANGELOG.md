# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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

# Changelog

Notable changes to M4L Remote Mapper are documented here. The project follows [Semantic Versioning](https://semver.org/) for public releases.

## [Unreleased]

- No changes yet.

## [0.4.1] - 2026-07-02

### Added

- Complete English and French public documentation.
- Reproducible Playwright captures for the full browser workflow.
- Dedicated installation, Max target, troubleshooting, development, and screenshot guides.
- MIT license and contributor guidance.

## 0.3.x - 2026-07-02

### Added

- Browser-based Web MIDI CC capture and mapping workflow.
- Max for Live target template with eight continuous parameters and eight buttons.
- MIDI button bank with momentary, input-toggle, script-toggle, and trigger modes.
- Safe Long Name, Short Name, and Scripting Name parameter aliases.
- Optional, type-checked index fallback disabled by default.
- Guided setup wizard, macOS installation checker, and generated troubleshooting guide.
- Known-good nanoKONTROL2 test pack covering CC16–19, CC32–35, and CC45 Capture MIDI.
- Browser-side ZIP export with action-oriented installation folders.

### Changed

- Generated Remote Scripts use `EncoderElement` with `add_value_listener`.
- MIDI values are scaled to each target's reported `parameter.min` and `parameter.max`.
- Generated logging uses a safe `_log` helper and deterministic `BUILD_ID`.

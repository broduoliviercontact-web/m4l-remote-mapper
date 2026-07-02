# Architecture

## Scope

M4L Remote Mapper is a static React/Vite website. It has no required server and keeps the capture, configuration, code generation, and ZIP assembly in the browser.

```text
MIDI controller
  → Web MIDI API
  → detected CONTROLCHANGE controls
  → mapping profile
  → Remote Script generator
  → JSZip
  → local download
```

## Browser application

`client/src/App.jsx` owns the four-step workflow and its session state:

- MIDI access, available inputs, selected input, and last CC message
- deduplicated detected controls keyed by endpoint, channel, and CC number
- target device contract and generated Long Names
- parameter and global-action mappings
- ZIP assembly and download

Incoming status bytes are accepted only when `(status & 0xF0) === 0xB0`. The lower nibble becomes `frameworkChannel` (0–15), while `userChannel` is the corresponding display value (1–16).

## Generator

`client/src/generators/remoteScriptGenerator.js` is independent of React. Given a target and mapping list, it produces:

- `__init__.py`
- `<scriptSlug>.py`
- `profile.json`
- root `README.md`
- root `INSTALLATION.md`
- the Max for Live parameter specification

The generated Remote Script extends `_Framework.ControlSurface.ControlSurface` and receives raw MIDI CC messages through `receive_midi`. It intentionally does not use `DeviceComponent`, `set_device_component`, or `mappings.py`. Logging goes through a generated `_log` helper that first asks `canonical_parent` to write to Live's log, then safely falls back to `show_message`.

Parameter lookup walks tracks, return tracks, and nested rack chains. It tries the exact device/parameter names, then normalized alphanumeric names, then an optional zero-based parameter index. CC values are normalized across the parameter's Live-reported minimum and maximum before assignment.

The only v0.1 global action is Capture MIDI. Its trigger guard is generated from the mapping profile; `value_eq_127` cannot call `self.song().capture_midi()` for any other value.

## ZIP boundary

JSZip constructs the complete pack in memory. The browser creates a temporary object URL, starts the download, and immediately revokes that URL. No profile is persisted or uploaded.

## Compatibility notes

- Web MIDI availability depends on the browser; current Chromium-family browsers are the intended v0.1 target.
- Ableton's Python Remote Script API is not a stable public API. Generated scripts should be verified against the target Live version.
- A Max for Live `.amxd` is not generated. The exported Markdown specification is the contract used to build it manually.

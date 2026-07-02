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

The generated Remote Script extends `_Framework.ControlSurface.ControlSurface`. Each configured source becomes an `_Framework.EncoderElement` in absolute CC mode with its own value listener; references stay alive in `self._controls`. The script therefore uses Live's control-element forwarding rather than depending on `receive_midi`. It intentionally does not use `DeviceComponent`, `set_device_component`, or `mappings.py`. Logging goes through a generated `_log` helper that first asks `canonical_parent` to write to Live's log, then safely falls back to `show_message`.

Parameter lookup walks tracks, return tracks, and nested rack chains. It tries the exact device/parameter names, then normalized alphanumeric names, then an optional zero-based parameter index over a filtered list that excludes Live's `Device On` parameter. CC values are clamped to `0.0`–`1.0`, scaled across the parameter's Live-reported minimum and maximum, and logged before assignment. The bundled showroom template itself exposes eight normalized float parameters with a `0.0`–`1.0` range.

Mappings carry both a `controlType` (`continuous` or `button`) and a destination type. Continuous mappings use `parameter_min_max` scaling. Button destinations expose eight `M4L Button N` toggles and support `momentary`, `toggle_from_input`, `toggle_in_script`, and `trigger`; internal toggle states are keyed by MIDI channel and CC.

`client/src/utils/m4lNaming.js` is the sole slot-name authority. At export time the pack generator parses the canonical `.maxpat`, trims it to the configured parameter/button counts, and rewrites every Long Name and Max parameter-table entry from that authority. This preserves the fallback order after excluding `Device On`: continuous slots start at 0 and buttons start at `parameterCount`.

Index fallback is an explicit per-mapping opt-in (`allowIndexFallback`, serialized to Python as `allow_index_fallback`). Name matching runs first. When enabled, the Python script filters out `Device On`, resolves the candidate index, then checks `expected_kind` and `expected_prefix`; cross-kind Param/Button candidates are rejected and logged.

Each parameter mapping serializes `parameter_aliases`: complete Long Name, compact Short Name, and Max Scripting Name. Exact and normalized alias matching both call the Param/Button compatibility guard. A deterministic profile hash becomes the Python `BUILD_ID`; `_log` prefers `c_instance().log_message`, so Log.txt identifies the loaded build before falling back to the canonical parent or status bar.

The currently supported global action is Capture MIDI. Its trigger guard is generated from the mapping profile; `value_eq_127` cannot call `self.song().capture_midi()` for any other value.

## ZIP boundary

JSZip constructs the complete pack in memory. Alongside the generated Remote Script, the pack includes the canonical transparent Max Audio Effect from `maxforlive/templates/M4L-Remote-Target/`. The browser creates a temporary object URL, starts the download, and revokes that URL. No profile is persisted or uploaded.

The pack uses numbered, action-oriented folders: `1_COPY_THIS_FOLDER_TO_REMOTE_SCRIPTS/`, `2_OPEN_THIS_MAX_FOR_LIVE_DEVICE/`, then `3_READ_ME_FIRST.md`. `INSTALL_CHECK.command` validates the installed macOS Remote Script while `TROUBLESHOOTING.md` maps common log messages to fixes. The in-app Setup Wizard mirrors the same sequence and generates cleanup/log commands from the current script slug.

## Compatibility notes

- Web MIDI availability depends on the browser; current Chromium-family browsers are the intended target.
- Ableton's Python Remote Script API is not a stable public API. Generated scripts should be verified against the target Live version.
- A compiled `.amxd` is not generated, but the exported `.maxpat` opens directly from a Max Audio Effect and already exposes the eight required Long Names.

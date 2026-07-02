# Ableton installation

## 1. Export the pack

Complete at least one mapping in M4L Remote Mapper and click **Download ZIP pack**. Unzip `M4L_Remote_Mapper_Pack`.

## 2. Install the Remote Script

Quit Ableton Live before copying the script folder.

Copy the script folder inside `1_COPY_THIS_FOLDER_TO_REMOTE_SCRIPTS/` to your User Library:

- macOS: `~/Music/Ableton/User Library/Remote Scripts/`
- Windows: `%USERPROFILE%\Documents\Ableton\User Library\Remote Scripts\`

For the demo, copy only `1_COPY_THIS_FOLDER_TO_REMOTE_SCRIPTS/M4L_Remote_Target_Remote/`. That folder must directly contain `__init__.py`, `M4L_Remote_Target_Remote.py`, and `profile.json`. Do not add another nesting level or copy the numbered parent folder.

Remove an older folder with the same name and any `__pycache__` before restarting Live. On macOS, double-click `INSTALL_CHECK.command` to verify the installed files and detect obsolete generator code.

## 3. Open the Max for Live target

Open `2_OPEN_THIS_MAX_FOR_LIVE_DEVICE/M4L-Remote-Target/M4L-Remote-Target.maxpat` in Max from a Max Audio Effect.

1. Save the device in your Ableton User Library if Max asks you to do so.
2. Load the resulting Max Audio Effect in Ableton.
3. Verify that the loaded device is named exactly **M4L-Remote-Target**.
4. Confirm that Live exposes `M4L Param 1` through `M4L Param 8` and `M4L Button 1` through `M4L Button 8`.

The patch passes stereo audio through unchanged. Its parameter Long Names are already configured; do not rename them.

## 4. Activate in Live

1. Restart Ableton Live.
2. Open **Settings → Link, Tempo & MIDI**.
3. Choose **M4L_Remote_Target_Remote** as Control Surface.
4. Choose **nanoKONTROL2 SLIDER/KNOB** as Input.
5. Choose **None** as Output.
6. Add **M4L-Remote-Target** to a track.
7. Move knobs 1–4 and verify that M4L Params 1–4 respond.
8. Press CC32/33 to test script-side toggles and CC34/35 to test momentary buttons.

## Button modes and ranges

- `momentary`: press writes parameter maximum; release writes minimum.
- `toggle_from_input`: follows the controller's ON/OFF values.
- `toggle_in_script`: every value-127 press flips internal state; release is ignored.
- `trigger`: reacts only to value 127 and is used for Capture MIDI or one-shot pulses.

MIDI sends `0–127`, but Ableton parameters may use any range. Continuous mappings normalize MIDI and scale it to `parameter.min` / `parameter.max`; button mappings write only those endpoints.

## Troubleshooting

- Open Live's log and look for `M4L Remote Mapper: loaded`.
- Compare the controller channel/CC with `profile.json`.
- Confirm the loaded device name and every parameter Long Name.
- If an exact parameter match fails, the script tries a normalized-name match and then the configured zero-based parameter index.
- For Capture MIDI, confirm the mapping trigger. `value_eq_127` fires only for a full-value CC message and logs the request, success, or error.
- Read the pack's `TROUBLESHOOTING.md` for exact fixes and a ready-to-copy Log.txt command.

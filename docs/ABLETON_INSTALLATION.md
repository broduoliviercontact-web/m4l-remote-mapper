# Ableton installation

## 1. Export the pack

Complete at least one mapping in M4L Remote Mapper and click **Download ZIP pack**. Unzip `M4L_Remote_Mapper_Pack`.

## 2. Install the Remote Script

Quit Ableton Live before copying the script folder.

Copy the folder inside `Remote Scripts/` to your User Library:

- macOS: `~/Music/Ableton/User Library/Remote Scripts/`
- Windows: `%USERPROFILE%\Documents\Ableton\User Library\Remote Scripts\`

The folder must directly contain `__init__.py`, the generated `.py` script, and `profile.json`. Do not add another nesting level.

## 3. Build the Max for Live target

Open the exported `Max for Live/M4L_Remote_Target_*_Params_SPEC.md`.

1. Create a Max MIDI Effect or Max Audio Effect.
2. Add the required `live.dial` and/or `live.toggle` objects.
3. Set each object's **Long Name** to the exact name in the specification.
4. Ensure each control is exposed to Live's parameter system.
5. Save the device as an `.amxd` and name the loaded Live device exactly as specified.

## 4. Activate in Live

1. Restart Ableton Live.
2. Open **Settings → Link, Tempo & MIDI**.
3. Choose the generated script in a Control Surface slot.
4. Choose the physical controller as that slot's Input.
5. Add your Max for Live target to a track.
6. Move a mapped controller and verify the response.

## Troubleshooting

- Open Live's log and look for `M4L Remote Mapper: loaded`.
- Compare the controller channel/CC with `profile.json`.
- Confirm the loaded device name and every parameter Long Name.
- If an exact parameter match fails, the script tries a normalized-name match and then the configured zero-based parameter index.
- For Capture MIDI, confirm the mapping trigger. `value_eq_127` fires only for a full-value CC message and logs the request, success, or error.

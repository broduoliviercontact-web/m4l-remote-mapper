# Troubleshooting

Start with the known-good nanoKONTROL2 pack when possible. If that works, the Ableton installation is sound and the issue is likely in the custom profile or Max parameter names.

## Nothing moves

Check these in order:

1. Live was restarted after the Remote Script folder was copied or replaced.
2. **Settings → Link, Tempo & MIDI** selects the generated Control Surface.
3. Input is the controller's actual MIDI port; Output is `None`.
4. The script folder directly contains `__init__.py`, the generated `.py`, and `profile.json`.
5. There is only one installed folder for this script slug.
6. No stale `__pycache__` remains.
7. The loaded Max for Live device name and parameter names match the profile.

On macOS, run `INSTALL_CHECK.command` from the generated pack before opening Live.

## A slider controls a button

This usually means an old generated script is still loaded, unsafe index fallback was enabled, or the exposed Max names do not match.

- Reinstall a freshly exported pack.
- Leave **Allow index fallback if name is missing** disabled.
- Check Long Name and Short Name in Max.
- Remove duplicate script folders and Python caches, then restart Live.

## `target device missing`

The script could not find the configured device name. The demo requires exactly `M4L-Remote-Target`. Check the name shown by Live, not only the patch filename. If you intentionally renamed the device, update the target name in the web app and export again.

## `parameter missing by aliases`

The device was found, but no exposed Live parameter matched the generated aliases.

- Check names such as `M4L Param 1` and `M4L Button 1` in Max's Inspector.
- Compare `profile.json` with the `available parameters` log line.
- Ensure Long Names are unique and not truncated.
- Keep index fallback disabled while correcting names.

## Old `self.log_message` error

Current scripts do not call `self.log_message` directly. This exception means Live found an older generated folder or cached bytecode.

1. Quit Live.
2. Delete every old folder with the same script slug.
3. Remove `__pycache__`.
4. Copy one newly generated folder.
5. Restart Live and confirm the startup `BUILD_ID` in Log.txt.

## Capture MIDI does not work

- The demo expects CC45 on user MIDI channel 1 (framework channel 0).
- The trigger fires only when the received value is exactly 127.
- Live must have uncaptured MIDI material available; play notes into a MIDI track first.
- Look for `capture_midi requested`, `capture_midi success`, or `capture_midi error` in Log.txt.

## Read focused Live logs on macOS

Adjust the Live version directory if yours differs:

```bash
grep -R "BUILD_ID\|M4L Remote Mapper\|script loaded\|CC received\|parameter found\|parameter missing\|available parameters\|fallback disabled\|unsafe fallback\|parameter updated\|button updated\|capture_midi" \
"$HOME/Library/Preferences/Ableton/Live 12.4.5b6/Log.txt" \
| tail -n 220
```

The deterministic `BUILD_ID` identifies the generated profile that Live actually loaded.

## Clean reinstall on macOS

Quit Live first. The following command removes folders matching the demo slug, so inspect the path before running it:

```bash
rm -rf "$HOME/Music/Ableton/User Library/Remote Scripts"/M4L_Remote_Target_Remote*

find "$HOME/Music/Ableton/User Library/Remote Scripts" \
-name "__pycache__" -type d -prune -exec rm -rf {} +
```

Then copy only `1_COPY_THIS_FOLDER_TO_REMOTE_SCRIPTS/M4L_Remote_Target_Remote/` from a fresh pack and restart Live.

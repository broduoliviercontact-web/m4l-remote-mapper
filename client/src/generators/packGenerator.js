import JSZip from 'jszip'
import { generateRemoteScriptFiles } from './remoteScriptGenerator.js'

export function createTerminalCommands(scriptSlug) {
  const scriptDirectory = `$HOME/Music/Ableton/User Library/Remote Scripts/${scriptSlug}`
  return [
    {
      id: 'remove-old',
      label: 'Remove old script',
      command: `rm -rf "${scriptDirectory}"`,
    },
    {
      id: 'clear-cache',
      label: 'Clear Python cache',
      command: `find "${scriptDirectory}" \\\n-name "__pycache__" -type d -prune -exec rm -rf {} +`,
    },
    {
      id: 'read-log',
      label: 'Read useful Live logs',
      command: `grep -R "M4L Remote Mapper\\|listening CC\\|CC received\\|target device\\|parameter updated\\|button updated\\|button toggled\\|button triggered\\|capture_midi" \\\n"$HOME/Library/Preferences/Ableton/Live 12.4.5b6/Log.txt" \\\n| tail -n 160`,
    },
  ]
}

export function generateTroubleshooting({ scriptSlug, targetDeviceName }) {
  return `# Troubleshooting

## Nothing moves

- In Ableton Settings → Link, Tempo & MIDI, select **${scriptSlug}** as the Control Surface.
- Select **nanoKONTROL2 SLIDER/KNOB** or your chosen controller port as Input. Keep Output set to **None**.
- Confirm that the newly generated script folder replaced the old installed folder completely.
- Remove any \`__pycache__\` folder inside the installed Remote Script, then restart Ableton.
- Run \`INSTALL_CHECK.command\` from this pack and inspect Live's Log.txt.

## The log says \`target device missing\`

The loaded Max for Live device must be named exactly **${targetDeviceName}**. Rename or reload it, then move CC16 again.

## The log says \`parameter missing\`

Open the device in Max and verify the exact Long Names: \`M4L Param 1\` through \`M4L Param 8\`. Scripting Names are not a substitute for Long Names.

## Capture MIDI does not work

- Confirm that CC45 sends a value of exactly **127**.
- Make sure a MIDI track has already received notes before requesting Capture MIDI.
- Look for \`capture_midi requested\`, \`capture_midi success\`, or \`capture_midi error\` in Live's log.

## Buttons do not latch or release correctly

- Confirm that the profile marks the source as \`controlType: button\` and targets \`M4L Button 1\` through \`M4L Button 8\`.
- Use \`momentary\` when press and release should follow the hardware.
- Use \`toggle_from_input\` when the hardware already alternates ON/OFF.
- Use \`toggle_in_script\` when every value-127 press should invert state and value 0 should be ignored.
- Use \`trigger\` for Capture MIDI or a one-shot pulse; trigger mode ignores release value 0.

MIDI sends values from 0 to 127. Continuous controls are normalized and scaled to the Ableton parameter's own minimum and maximum. Button targets receive only their minimum or maximum.

## The old \`self.log_message\` error appears

An old ZIP or cached script is still installed. Generate a fresh pack, remove the entire installed **${scriptSlug}** folder, copy the new folder, clear \`__pycache__\`, and restart Ableton.
`
}

export function generateInstallCheck(scriptSlug) {
  return `#!/bin/bash

SCRIPT_SLUG="${scriptSlug}"
REMOTE_SCRIPTS_ROOT="$HOME/Music/Ableton/User Library/Remote Scripts"
SCRIPT_DIR="$REMOTE_SCRIPTS_ROOT/$SCRIPT_SLUG"
PY_FILE="$SCRIPT_DIR/$SCRIPT_SLUG.py"
FAILURES=0

pass() { printf "✅ %s\\n" "$1"; }
fail() { printf "❌ %s\\n" "$1"; FAILURES=$((FAILURES + 1)); }
warn() { printf "⚠️  %s\\n" "$1"; }

printf "M4L Remote Mapper — installation check\\n"
printf "Checking: %s\\n\\n" "$SCRIPT_DIR"

if [ -d "$SCRIPT_DIR" ]; then
  pass "Remote Script folder exists"
else
  fail "Remote Script folder is missing"
  printf "Expected: %s\\n" "$SCRIPT_DIR"
  printf "\\nPress Return to close..."
  read -r
  exit 1
fi

for required_file in "__init__.py" "$SCRIPT_SLUG.py" "profile.json"; do
  if [ -f "$SCRIPT_DIR/$required_file" ]; then
    pass "$required_file exists"
  else
    fail "$required_file is missing"
  fi
done

if [ -f "$PY_FILE" ] && grep -Fq "EncoderElement" "$PY_FILE"; then
  pass "EncoderElement forwarding is present"
else
  fail "EncoderElement forwarding is missing"
fi

if [ -f "$PY_FILE" ] && grep -Fq "add_value_listener" "$PY_FILE"; then
  pass "add_value_listener is present"
else
  fail "add_value_listener is missing"
fi

if [ -f "$PY_FILE" ] && grep -Fq "def receive_midi(" "$PY_FILE"; then
  fail "Legacy receive_midi handler is still present"
else
  pass "Legacy receive_midi handler is absent"
fi

if [ -f "$PY_FILE" ] && grep -Fq "self.log_message(" "$PY_FILE"; then
  fail "Unsafe self.log_message call found — install a fresh pack"
else
  pass "No unsafe self.log_message call"
fi

if find "$SCRIPT_DIR" -type d -name "__pycache__" -print -quit | grep -q .; then
  warn "__pycache__ found — remove it before restarting Ableton"
else
  pass "No __pycache__ folder"
fi

printf "\\n"
if [ "$FAILURES" -eq 0 ]; then
  printf "✅ Installation looks ready. Restart Ableton now.\\n"
else
  printf "❌ %s check(s) failed. Fix them before opening Ableton.\\n" "$FAILURES"
fi

printf "\\nPress Return to close..."
read -r
exit "$FAILURES"
`
}

export function generateReadMeFirst({ scriptSlug, targetDeviceName }) {
  return `# Read me first

This pack contains one folder to copy and one Max for Live device to open. Do not copy the whole pack into Ableton's Remote Scripts folder.

## 1. Install the Remote Script

1. Quit Ableton Live.
2. Remove an older \`${scriptSlug}\` folder if one is installed.
3. Copy only \`1_COPY_THIS_FOLDER_TO_REMOTE_SCRIPTS/${scriptSlug}/\`.
4. Paste it into \`~/Music/Ableton/User Library/Remote Scripts/\`.
5. Remove any \`__pycache__\` inside that installed folder.

## 2. Open the Max for Live device

Open \`2_OPEN_THIS_MAX_FOR_LIVE_DEVICE/M4L-Remote-Target/M4L-Remote-Target.maxpat\` from a Max Audio Effect. Save/load it under the exact device name **${targetDeviceName}**.

## 3. Configure Ableton

Restart Ableton, then open Settings → Link, Tempo & MIDI:

- Control Surface: **${scriptSlug}**
- Input: **nanoKONTROL2 SLIDER/KNOB** or your chosen MIDI input
- Output: **None**

## 4. Smoke test

- Move CC16 and confirm that \`M4L Param 1\` moves.
- Press CC32 twice and confirm that \`M4L Button 1\` toggles ON, then OFF.
- Send CC45 at value 127 and confirm Capture MIDI.
- Double-click \`INSTALL_CHECK.command\` if the mapping does not respond.

See \`TROUBLESHOOTING.md\` for log commands and known failure modes.

## Control types

- Continuous controls use \`parameter_min_max\` scaling: MIDI 0–127 is normalized and adapted to the target's own range.
- Button controls support \`momentary\`, \`toggle_from_input\`, \`toggle_in_script\`, and \`trigger\` modes. They write only parameter minimum/maximum values; trigger ignores release value 0.
`
}

export function buildRemoteMapperPack({ target, mappings, templates }) {
  const files = generateRemoteScriptFiles({ target, mappings })
  const zip = new JSZip()
  const root = zip.folder('M4L_Remote_Mapper_Pack')
  const scriptFolder = root.folder(`1_COPY_THIS_FOLDER_TO_REMOTE_SCRIPTS/${files.scriptSlug}`)
  const templateFolder = root.folder('2_OPEN_THIS_MAX_FOR_LIVE_DEVICE/M4L-Remote-Target')

  scriptFolder.file('__init__.py', files['__init__.py'])
  scriptFolder.file(`${files.scriptSlug}.py`, files[`${files.scriptSlug}.py`])
  scriptFolder.file('profile.json', files['profile.json'])
  templateFolder.file('M4L-Remote-Target.maxpat', templates.maxpat)
  templateFolder.file('README.md', templates.readme)
  templateFolder.file('PARAMETER_NAMES.md', templates.parameterNames)
  root.file('3_READ_ME_FIRST.md', generateReadMeFirst({
    scriptSlug: files.scriptSlug,
    targetDeviceName: target.targetDeviceName,
  }))
  root.file('INSTALL_CHECK.command', generateInstallCheck(files.scriptSlug), { unixPermissions: 0o755 })
  root.file('TROUBLESHOOTING.md', generateTroubleshooting({
    scriptSlug: files.scriptSlug,
    targetDeviceName: target.targetDeviceName,
  }))

  return { zip, scriptSlug: files.scriptSlug }
}

import JSZip from 'jszip'
import {
  generateButtonNames,
  generateParameterNames,
  generateRemoteScriptFiles,
} from './remoteScriptGenerator.js'

const slotNumber = (id) => Number(String(id).split('-').pop())

export function customizeMaxForLiveTemplate(maxpatSource, target) {
  const maxpat = JSON.parse(maxpatSource)
  const parameterNames = generateParameterNames(target)
  const buttonNames = generateButtonNames(target)
  const keepBox = ({ box }) => {
    if (box.id.startsWith('obj-dial-')) return slotNumber(box.id) <= parameterNames.length
    if (box.id.startsWith('obj-button-') && box.maxclass === 'live.toggle') return slotNumber(box.id) <= buttonNames.length
    if (box.id.startsWith('obj-send-')) return slotNumber(box.id) <= parameterNames.length
    if (box.id.startsWith('obj-monitor-') && box.maxclass === 'flonum') return slotNumber(box.id) <= Math.min(4, parameterNames.length)
    return true
  }
  maxpat.patcher.boxes = maxpat.patcher.boxes.filter(keepBox)
  const liveBoxes = maxpat.patcher.boxes.map(({ box }) => box)
  const dials = liveBoxes.filter((box) => box.maxclass === 'live.dial')
  const buttons = liveBoxes.filter((box) => box.maxclass === 'live.toggle')

  dials.forEach((dial, index) => {
    const name = parameterNames[index]
    dial.saved_attribute_attributes.valueof.parameter_longname = name
    dial.saved_attribute_attributes.valueof.parameter_shortname = name
    maxpat.patcher.parameters[dial.id][0] = name
    maxpat.patcher.parameters[dial.id][1] = name
  })
  buttons.forEach((button, index) => {
    const name = buttonNames[index]
    button.saved_attribute_attributes.valueof.parameter_longname = name
    button.saved_attribute_attributes.valueof.parameter_shortname = name
    maxpat.patcher.parameters[button.id][0] = name
    maxpat.patcher.parameters[button.id][1] = name
  })

  for (const id of Object.keys(maxpat.patcher.parameters)) {
    if (!liveBoxes.some((box) => box.id === id)) delete maxpat.patcher.parameters[id]
  }
  const liveIds = new Set(liveBoxes.map((box) => box.id))
  maxpat.patcher.lines = maxpat.patcher.lines.filter(({ patchline }) => liveIds.has(patchline.source[0]) && liveIds.has(patchline.destination[0]))

  const subtitle = liveBoxes.find((box) => box.id === 'obj-subtitle')
  if (subtitle) subtitle.text = `Expected parameters: ${parameterNames.join(', ')}`
  const buttonNote = liveBoxes.find((box) => box.id === 'obj-button-note')
  if (buttonNote) buttonNote.text = `Buttons: ${buttonNames.join(', ')}`

  return `${JSON.stringify(maxpat, null, 2)}\n`
}

export function generateParameterNamesDocument(target) {
  const parameterNames = generateParameterNames(target)
  const buttonNames = generateButtonNames(target)
  return `# Parameter names

Names are generated from the configured prefix, one space, and the one-based slot number.

Mappings resolve by exact/normalized name first. Index fallback is disabled by default and should remain off unless explicitly needed; enabled fallback is still rejected when the resolved parameter kind is incompatible.
Each mapping carries complete, compact, and Max Scripting Name aliases so Live can report either Long Name or Short Name without breaking resolution.

## Continuous parameters

${parameterNames.map((name, index) => `${index + 1}. \`${name}\` — fallback index ${index}`).join('\n')}

## Button parameters

${buttonNames.map((name, index) => `${index + 1}. \`${name}\` — fallback index ${parameterNames.length + index}`).join('\n')}

## Button modes

- \`momentary\`: press = maximum, release = minimum
- \`toggle_from_input\`: follows incoming ON/OFF
- \`toggle_in_script\`: every value-127 press flips state
- \`trigger\`: value 127 only; release ignored

Continuous MIDI values are normalized from 0–127 and scaled to the target's \`parameter.min\` / \`parameter.max\`. Button mappings write only those endpoints.
`
}

export function generateMaxTemplateReadme(target) {
  const parameterNames = generateParameterNames(target)
  const buttonNames = generateButtonNames(target)
  return `# M4L-Remote-Target

Open \`M4L-Remote-Target.maxpat\` from a Max Audio Effect and save/load the device under the exact name **${target.targetDeviceName}**.

## Exact Long Names

- Continuous: ${parameterNames.map((name) => `\`${name}\``).join(', ')}
- Buttons: ${buttonNames.map((name) => `\`${name}\``).join(', ')}

Names use the configured prefix followed by one space and the slot number. Do not remove the number or substitute a hyphen for that final separator.

The patch passes stereo audio unchanged. Continuous controls use a 0.0–1.0 range; button targets expose OFF/ON automation parameters.
`
}

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

export function generateTroubleshooting({ scriptSlug, targetDeviceName, target }) {
  const namingTarget = target || { parameterCount: 8, parameterPrefix: 'M4L Param', buttonCount: 8, buttonPrefix: 'M4L Button' }
  const parameterNames = generateParameterNames(namingTarget)
  const buttonNames = generateButtonNames(namingTarget)
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

Open the device in Max and verify the exact Long Names: ${parameterNames.map((name) => `\`${name}\``).join(', ')}. Scripting Names are not a substitute for Long Names.

## Capture MIDI does not work

- Confirm that CC45 sends a value of exactly **127**.
- Make sure a MIDI track has already received notes before requesting Capture MIDI.
- Look for \`capture_midi requested\`, \`capture_midi success\`, or \`capture_midi error\` in Live's log.

## Buttons do not latch or release correctly

- Confirm that the profile marks the source as \`controlType: button\` and targets one of: ${buttonNames.map((name) => `\`${name}\``).join(', ')}.
- Use \`momentary\` when press and release should follow the hardware.
- Use \`toggle_from_input\` when the hardware already alternates ON/OFF.
- Use \`toggle_in_script\` when every value-127 press should invert state and value 0 should be ignored.
- Use \`trigger\` for Capture MIDI or a one-shot pulse; trigger mode ignores release value 0.

MIDI sends values from 0 to 127. Continuous controls are normalized and scaled to the Ableton parameter's own minimum and maximum. Button targets receive only their minimum or maximum.

## Slider still controls a button

Possible causes:

- Ableton is running an old cached Remote Script.
- The Max Short Name and Long Name do not match the generated aliases.
- Duplicate \`${scriptSlug}*\` folders are installed.
- An old index fallback resolved against a different exposed-parameter order in Max for Live.

Fix:

- Delete every old \`${scriptSlug}*\` folder and install only one fresh folder.
- Verify the exact Long Name and Short Name in Max and the aliases in \`profile.json\`.
- Keep **Allow index fallback if name is missing** disabled; name matching is safer.
- Delete \`__pycache__\`, regenerate both the Max patch and Remote Script, then restart Ableton.
- Verify the \`build_id\` in Log.txt to confirm which script Live loaded.
- Check the \`available parameters\` and \`unsafe fallback rejected\` messages in Live's log.

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

if [ -f "$PY_FILE" ] && grep -Fq "BUILD_ID" "$PY_FILE"; then
  pass "BUILD_ID is present"
else
  fail "BUILD_ID is missing"
fi

if [ -f "$PY_FILE" ] && grep -Fq "parameter_aliases" "$PY_FILE"; then
  pass "parameter_aliases are present"
else
  fail "parameter_aliases are missing"
fi

if [ -f "$PY_FILE" ] && grep -Fq '"allow_index_fallback": False' "$PY_FILE"; then
  pass "Index fallback is disabled by default"
else
  fail "Default allow_index_fallback=False marker is missing"
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

export function generateReadMeFirst({ scriptSlug, targetDeviceName, target }) {
  const namingTarget = target || { parameterCount: 8, parameterPrefix: 'M4L Param', buttonCount: 8, buttonPrefix: 'M4L Button' }
  const firstParameter = generateParameterNames(namingTarget)[0]
  const firstButton = generateButtonNames(namingTarget)[0]
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

- Move CC16 and confirm that \`${firstParameter}\` moves.
- Press CC32 twice and confirm that \`${firstButton}\` toggles ON, then OFF.
- Send CC45 at value 127 and confirm Capture MIDI.
- Double-click \`INSTALL_CHECK.command\` if the mapping does not respond.

See \`TROUBLESHOOTING.md\` for log commands and known failure modes.

## Control types

- Continuous controls use \`parameter_min_max\` scaling: MIDI 0–127 is normalized and adapted to the target's own range.
- Button controls support \`momentary\`, \`toggle_from_input\`, \`toggle_in_script\`, and \`trigger\` modes. They write only parameter minimum/maximum values; trigger ignores release value 0.
- Parameter resolution uses names only by default. Keep index fallback disabled unless troubleshooting requires an explicit, type-checked fallback.
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
  templateFolder.file('M4L-Remote-Target.maxpat', customizeMaxForLiveTemplate(templates.maxpat, target))
  templateFolder.file('README.md', generateMaxTemplateReadme(target))
  templateFolder.file('PARAMETER_NAMES.md', generateParameterNamesDocument(target))
  root.file('3_READ_ME_FIRST.md', generateReadMeFirst({
    scriptSlug: files.scriptSlug,
    targetDeviceName: target.targetDeviceName,
    target,
  }))
  root.file('INSTALL_CHECK.command', generateInstallCheck(files.scriptSlug), { unixPermissions: 0o755 })
  root.file('TROUBLESHOOTING.md', generateTroubleshooting({
    scriptSlug: files.scriptSlug,
    targetDeviceName: target.targetDeviceName,
    target,
  }))

  return { zip, scriptSlug: files.scriptSlug }
}

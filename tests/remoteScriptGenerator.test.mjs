import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

import { createNanoKontrol2Demo, NANO_KONTROL2_TARGET } from '../client/src/demo/nanoKontrol2Demo.js'
import {
  buildRemoteMapperPack,
  createTerminalCommands,
  generateInstallCheck,
  generateTroubleshooting,
} from '../client/src/generators/packGenerator.js'
import { generateRemoteScriptFiles } from '../client/src/generators/remoteScriptGenerator.js'

const templateDirectory = path.join(process.cwd(), 'maxforlive/templates/M4L-Remote-Target')
const templatePath = path.join(templateDirectory, 'M4L-Remote-Target.maxpat')
const appPath = path.join(process.cwd(), 'client/src/App.jsx')

function generateCaptureScript() {
  const { target, mappings } = createNanoKontrol2Demo()
  const files = generateRemoteScriptFiles({ target, mappings })
  return files[`${files.scriptSlug}.py`]
}

test('Max for Live template exposes eight exact parameters and transparent stereo audio', async () => {
  const source = await readFile(templatePath, 'utf8')
  const maxpat = JSON.parse(source)
  const boxes = maxpat.patcher.boxes.map(({ box }) => box)
  const dials = boxes.filter((box) => box.maxclass === 'live.dial')
  const buttons = boxes.filter((box) => box.maxclass === 'live.toggle')
  const longNames = dials.map((dial) => dial.saved_attribute_attributes.valueof.parameter_longname)
  const buttonLongNames = buttons.map((button) => button.saved_attribute_attributes.valueof.parameter_longname)

  assert.equal(dials.length, 8)
  assert.equal(buttons.length, 8)
  assert.deepEqual(longNames, Array.from({ length: 8 }, (_, index) => `M4L Param ${index + 1}`))
  assert.deepEqual(buttonLongNames, Array.from({ length: 8 }, (_, index) => `M4L Button ${index + 1}`))
  assert.deepEqual(buttons.map((button) => button.varname), Array.from({ length: 8 }, (_, index) => `m4l_button_${index + 1}`))
  assert.ok(buttons.every((button) => button.parameter_enable === 1))
  assert.ok(dials.every((dial) => dial.parameter_enable === 1))
  assert.ok(dials.every((dial) => {
    const attributes = dial.saved_attribute_attributes.valueof
    return attributes.parameter_mmin === 0.0
      && attributes.parameter_mmax === 1.0
      && attributes.parameter_type === 0
      && attributes.parameter_unitstyle === 0
      && attributes.parameter_invisible === 0
      && attributes.parameter_initial[0] === 0.0
      && attributes.parameter_initial_enable === 1
  }))
  assert.ok(dials.every((dial) => dial.saved_attribute_attributes.valueof.parameter_mmax !== 127.0))
  assert.ok(boxes.some((box) => box.text === 'plugin~ 1 2'))
  assert.ok(boxes.some((box) => box.text === 'plugout~ 1 2'))
  assert.ok(boxes.some((box) => box.text === 'M4L Remote Target'))
  assert.ok(boxes.some((box) => box.text === 'Expected parameters: M4L Param 1 ... M4L Param 8'))
  assert.ok(boxes.some((box) => box.text === 'Remote Script target device name: M4L-Remote-Target'))
  assert.equal(boxes.filter((box) => box.maxclass === 'flonum' && box.presentation === 1).length, 4)
  assert.doesNotMatch(source, /S1|s1_param/i)
})

test('Button Bank and all button modes are exposed in the UI', async () => {
  const appSource = await readFile(appPath, 'utf8')

  assert.match(appSource, /BUTTON BANK/)
  assert.match(appSource, /MOMENTARY \/ TOGGLE \/ TRIGGER/)
  assert.match(appSource, /toggle_from_input/)
  assert.match(appSource, /toggle_in_script/)
  assert.match(appSource, /Load nanoKONTROL2 full demo/)
  assert.match(appSource, /MIDI sends 0–127/)
})

test('nanoKONTROL2 demo targets M4L-Remote-Target with the validated mappings', () => {
  const { target, mappings } = createNanoKontrol2Demo()
  const parameterMappings = mappings.filter((mapping) => mapping.targetType === 'm4l_parameter')
  const buttonMappings = mappings.filter((mapping) => mapping.targetType === 'm4l_button')
  const captureMapping = mappings.find((mapping) => mapping.targetType === 'global_action')

  assert.equal(NANO_KONTROL2_TARGET.targetDeviceName, 'M4L-Remote-Target')
  assert.equal(target.targetDeviceName, 'M4L-Remote-Target')
  assert.deepEqual(parameterMappings.map((mapping) => ({
    cc: mapping.source.data1,
    userChannel: mapping.source.userChannel,
    frameworkChannel: mapping.source.frameworkChannel,
    target: mapping.targetParameterName,
  })), [
    { cc: 16, userChannel: 1, frameworkChannel: 0, target: 'M4L Param 1' },
    { cc: 17, userChannel: 1, frameworkChannel: 0, target: 'M4L Param 2' },
    { cc: 18, userChannel: 1, frameworkChannel: 0, target: 'M4L Param 3' },
    { cc: 19, userChannel: 1, frameworkChannel: 0, target: 'M4L Param 4' },
  ])
  assert.ok(parameterMappings.every((mapping) => mapping.controlType === 'continuous' && mapping.scaling === 'parameter_min_max'))
  assert.deepEqual(buttonMappings.map((mapping) => ({
    cc: mapping.source.data1,
    controlType: mapping.controlType,
    target: mapping.targetButtonName,
    buttonMode: mapping.buttonMode,
  })), [
    { cc: 32, controlType: 'button', target: 'M4L Button 1', buttonMode: 'toggle_in_script' },
    { cc: 33, controlType: 'button', target: 'M4L Button 2', buttonMode: 'toggle_in_script' },
    { cc: 34, controlType: 'button', target: 'M4L Button 3', buttonMode: 'momentary' },
    { cc: 35, controlType: 'button', target: 'M4L Button 4', buttonMode: 'momentary' },
  ])
  assert.equal(captureMapping.source.data1, 45)
  assert.equal(captureMapping.source.userChannel, 1)
  assert.equal(captureMapping.source.frameworkChannel, 0)
  assert.equal(captureMapping.actionName, 'Capture MIDI')
  assert.equal(captureMapping.controlType, 'button')
  assert.equal(captureMapping.buttonMode, 'trigger')
  assert.equal(captureMapping.triggerMode, 'value_eq_127')

  const files = generateRemoteScriptFiles({ target, mappings })
  const profile = JSON.parse(files['profile.json'])
  assert.equal(profile.target.targetDeviceName, 'M4L-Remote-Target')
  assert.equal(profile.mappings.length, 9)
  assert.equal(profile.mappings.find((mapping) => mapping.source.data1 === 16).controlType, 'continuous')
  assert.equal(profile.mappings.find((mapping) => mapping.source.data1 === 32).controlType, 'button')
  assert.equal(profile.mappings.find((mapping) => mapping.source.data1 === 32).targetButtonName, 'M4L Button 1')
})

test('generated Live 12 Remote Script uses the safe logging helper', () => {
  const script = generateCaptureScript()

  assert.doesNotMatch(script, /self\.log_message\(/)
  assert.match(script, /def _log\(self, message\):/)
  assert.match(script, /self\._log\(/)
  assert.match(script, /self\.canonical_parent\.log_message\(message\)/)
  assert.match(script, /from _Framework\.ControlSurface import ControlSurface/)
  assert.match(script, /def _setup_mappings\(self\):/)
})

test('generated Remote Script forwards every mapping through EncoderElement listeners', () => {
  const script = generateCaptureScript()

  assert.match(script, /^import Live$/m)
  assert.match(script, /from _Framework\.InputControlElement import MIDI_CC_TYPE/)
  assert.match(script, /from _Framework\.EncoderElement import EncoderElement/)
  assert.match(script, /control = EncoderElement\(/)
  assert.match(script, /Live\.MidiMap\.MapMode\.absolute/)
  assert.match(script, /control\.add_value_listener\(self\._make_value_listener\(mapping\)\)/)
  assert.match(script, /self\._controls = \[\]/)
  assert.match(script, /self\._controls\.append\(control\)/)
  assert.match(script, /def _make_value_listener\(self, mapping\):/)
  assert.doesNotMatch(script, /def receive_midi\(/)

  for (const cc of [16, 17, 18, 19, 32, 33, 34, 35, 45]) {
    assert.match(script, new RegExp(`"channel": 0, "cc": ${cc},`))
  }
})

test('generated Remote Script implements button modes with min/max writes', () => {
  const script = generateCaptureScript()

  assert.match(script, /self\._button_states = \{\}/)
  assert.match(script, /def _apply_button_mapping\(self, mapping, value, parameter\):/)
  assert.match(script, /button_mode in \("momentary", "toggle_from_input"\)/)
  assert.match(script, /parameter\.value = parameter\.max if value > 0 else parameter\.min/)
  assert.match(script, /button_mode == "toggle_in_script"/)
  assert.match(script, /if value != 127:\n\s+return/)
  assert.match(script, /state = not self\._button_states\.get\(button_id, False\)/)
  assert.match(script, /self\._button_states\[button_id\] = state/)
  assert.match(script, /parameter\.value = parameter\.max if state else parameter\.min/)
  assert.match(script, /button_mode == "trigger"/)
  assert.match(script, /parameter\.value = parameter\.max\n\s+parameter\.value = parameter\.min/)
})

test('generated Remote Script scales MIDI through parameter min and max', () => {
  const script = generateCaptureScript()

  assert.match(script, /def _scale_midi_to_parameter\(self, midi_value, parameter\):/)
  assert.match(script, /minimum = float\(parameter\.min\)/)
  assert.match(script, /maximum = float\(parameter\.max\)/)
  assert.match(script, /normalized = max\(0\.0, min\(1\.0, float\(midi_value\) \/ 127\.0\)\)/)
  assert.match(script, /scaled_value = self\._scale_midi_to_parameter\(value, parameter\)/)
  assert.match(script, /parameter\.value = scaled_value/)
  assert.match(script, /parameter updated: \{\} value=\{\} scaled=\{\}/)
})

test('generated Remote Script logs CC, device and parameter resolution', () => {
  const script = generateCaptureScript()

  assert.match(script, /M4L Remote Mapper: script loaded/)
  assert.match(script, /CC received channel=\{\} cc=\{\} value=\{\}/)
  assert.match(script, /target device found: \{\}/)
  assert.match(script, /target device missing: \{\}/)
  assert.match(script, /parameter found: \{\}/)
  assert.match(script, /parameter missing: \{\}/)
  assert.match(script, /listening CC channel=\{\} cc=\{\}/)
})

test('parameter index fallback excludes Live Device On', () => {
  const script = generateCaptureScript()

  assert.match(script, /automatable_parameters = \[parameter for parameter in target_device\.parameters if parameter\.name != "Device On"\]/)
  assert.match(script, /0 <= index < len\(automatable_parameters\)/)
  assert.match(script, /return automatable_parameters\[index\]/)
  assert.doesNotMatch(script, /return target_device\.parameters\[index\]/)
})

test('generated Capture MIDI mapping preserves the validated CC45 guard', () => {
  const script = generateCaptureScript()
  const actionBlock = script.slice(script.indexOf('    def _run_global_action'), script.indexOf('    def _find_parameter'))

  assert.match(script, /"channel": 0, "cc": 45/)
  assert.match(script, /self\.song\(\)\.capture_midi\(\)/)
  assert.match(script, /value == 127/)
  assert.doesNotMatch(actionBlock, /value > 0/)
  assert.match(script, /global action requested: Capture MIDI/)
  assert.match(script, /capture_midi requested/)
  assert.match(script, /capture_midi success/)
  assert.match(script, /capture_midi error/)
  assert.match(script, /M4L-Remote-Target/)
  assert.match(script, /M4L Param 1/)
  assert.doesNotMatch(script, /DeviceComponent/)
  assert.doesNotMatch(script, /set_device_component/)
  assert.doesNotMatch(script, /mappings\.py/)
})

test('generated Remote Script compiles with Python', async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'm4l-remote-mapper-'))
  context.after(() => rm(directory, { recursive: true, force: true }))
  const scriptPath = path.join(directory, 'M4L_Remote_Target_Remote.py')
  await writeFile(scriptPath, generateCaptureScript(), 'utf8')

  const result = spawnSync('python3', ['-m', 'py_compile', scriptPath], {
    encoding: 'utf8',
  })

  assert.equal(result.status, 0, result.stderr || result.stdout)
})

test('installation helpers diagnose stale scripts and produce slug-aware commands', () => {
  const scriptSlug = 'M4L_Remote_Target_Remote'
  const installCheck = generateInstallCheck(scriptSlug)
  const troubleshooting = generateTroubleshooting({
    scriptSlug,
    targetDeviceName: 'M4L-Remote-Target',
  })
  const commands = createTerminalCommands(scriptSlug)

  assert.match(installCheck, /EncoderElement/)
  assert.match(installCheck, /add_value_listener/)
  assert.match(installCheck, /self\.log_message\(/)
  assert.match(installCheck, /def receive_midi\(/)
  assert.match(installCheck, /__pycache__/)
  assert.match(troubleshooting, /target device missing/)
  assert.match(troubleshooting, /parameter missing/)
  assert.match(troubleshooting, /Capture MIDI/)
  assert.match(troubleshooting, /self\.log_message/)
  assert.equal(commands.length, 3)
  assert.ok(commands.every(({ command }) => command.includes(scriptSlug) || command.includes('Log.txt')))
  assert.match(commands[0].command, /rm -rf/)
  assert.match(commands[1].command, /__pycache__/)
  assert.match(commands[2].command, /tail -n 160/)

  const shellCheck = spawnSync('bash', ['-n'], { input: installCheck, encoding: 'utf8' })
  assert.equal(shellCheck.status, 0, shellCheck.stderr || shellCheck.stdout)
})

test('INSTALL_CHECK.command accepts a current script and rejects self.log_message', async (context) => {
  const scriptSlug = 'M4L_Remote_Target_Remote'
  const home = await mkdtemp(path.join(tmpdir(), 'm4l-install-check-'))
  context.after(() => rm(home, { recursive: true, force: true }))
  const scriptDirectory = path.join(home, 'Music/Ableton/User Library/Remote Scripts', scriptSlug)
  await mkdir(scriptDirectory, { recursive: true })
  await writeFile(path.join(scriptDirectory, '__init__.py'), '', 'utf8')
  await writeFile(path.join(scriptDirectory, 'profile.json'), '{}', 'utf8')
  const pythonPath = path.join(scriptDirectory, `${scriptSlug}.py`)
  const installCheck = generateInstallCheck(scriptSlug)
  const checkerPath = path.join(home, 'INSTALL_CHECK.command')
  await writeFile(checkerPath, installCheck, 'utf8')
  const runCheck = () => spawnSync('bash', [checkerPath], {
    input: '\n',
    encoding: 'utf8',
    env: { ...process.env, HOME: home },
  })

  await writeFile(pythonPath, 'from _Framework.EncoderElement import EncoderElement\ncontrol.add_value_listener(listener)\n', 'utf8')
  const currentResult = runCheck()
  assert.equal(currentResult.status, 0, currentResult.stdout || currentResult.stderr)

  await writeFile(pythonPath, 'EncoderElement\nadd_value_listener\nself.log_message("old")\n', 'utf8')
  const staleResult = runCheck()
  assert.notEqual(staleResult.status, 0)
  assert.match(staleResult.stdout, /Unsafe self\.log_message call found/)
})

test('export pack uses the guided structure and includes support files', async () => {
  const { target, mappings } = createNanoKontrol2Demo()
  const templates = {
    maxpat: await readFile(templatePath, 'utf8'),
    readme: await readFile(path.join(templateDirectory, 'README.md'), 'utf8'),
    parameterNames: await readFile(path.join(templateDirectory, 'PARAMETER_NAMES.md'), 'utf8'),
  }
  const { zip, scriptSlug } = buildRemoteMapperPack({ target, mappings, templates })
  const paths = Object.keys(zip.files)
  const root = 'M4L_Remote_Mapper_Pack/'

  for (const expectedPath of [
    `${root}1_COPY_THIS_FOLDER_TO_REMOTE_SCRIPTS/${scriptSlug}/__init__.py`,
    `${root}1_COPY_THIS_FOLDER_TO_REMOTE_SCRIPTS/${scriptSlug}/${scriptSlug}.py`,
    `${root}1_COPY_THIS_FOLDER_TO_REMOTE_SCRIPTS/${scriptSlug}/profile.json`,
    `${root}2_OPEN_THIS_MAX_FOR_LIVE_DEVICE/M4L-Remote-Target/M4L-Remote-Target.maxpat`,
    `${root}2_OPEN_THIS_MAX_FOR_LIVE_DEVICE/M4L-Remote-Target/README.md`,
    `${root}2_OPEN_THIS_MAX_FOR_LIVE_DEVICE/M4L-Remote-Target/PARAMETER_NAMES.md`,
    `${root}3_READ_ME_FIRST.md`,
    `${root}INSTALL_CHECK.command`,
    `${root}TROUBLESHOOTING.md`,
  ]) {
    assert.ok(paths.includes(expectedPath), `Missing ZIP entry: ${expectedPath}`)
  }

  const exportedPatch = await zip.file(`${root}2_OPEN_THIS_MAX_FOR_LIVE_DEVICE/M4L-Remote-Target/M4L-Remote-Target.maxpat`).async('string')
  assert.equal(exportedPatch, templates.maxpat)

  const installCheck = await zip.file(`${root}INSTALL_CHECK.command`).async('string')
  const troubleshooting = await zip.file(`${root}TROUBLESHOOTING.md`).async('string')
  const readMeFirst = await zip.file(`${root}3_READ_ME_FIRST.md`).async('string')
  const parameterNames = await zip.file(`${root}2_OPEN_THIS_MAX_FOR_LIVE_DEVICE/M4L-Remote-Target/PARAMETER_NAMES.md`).async('string')
  const profile = JSON.parse(await zip.file(`${root}1_COPY_THIS_FOLDER_TO_REMOTE_SCRIPTS/${scriptSlug}/profile.json`).async('string'))
  assert.match(installCheck, /EncoderElement/)
  assert.match(installCheck, /self\.log_message\(/)
  assert.match(troubleshooting, /target device missing/)
  assert.match(troubleshooting, /parameter missing/)
  assert.match(troubleshooting, /Capture MIDI/)
  assert.match(troubleshooting, /toggle_in_script/)
  assert.match(readMeFirst, /Continuous controls/)
  assert.match(readMeFirst, /Button controls/)
  assert.match(parameterNames, /M4L Button 8/)
  assert.match(parameterNames, /toggle_from_input/)
  assert.equal(profile.mappings.length, 9)
  assert.ok(profile.mappings.some((mapping) => mapping.controlType === 'continuous'))
  assert.ok(profile.mappings.some((mapping) => mapping.controlType === 'button'))
})

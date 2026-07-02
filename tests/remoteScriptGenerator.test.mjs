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
  customizeMaxForLiveTemplate,
  generateInstallCheck,
  generateTroubleshooting,
} from '../client/src/generators/packGenerator.js'
import { generateRemoteScriptFiles } from '../client/src/generators/remoteScriptGenerator.js'
import {
  buildM4LButtonName,
  buildM4LParamName,
  buildM4LSlotName,
  normalizePrefix,
} from '../client/src/utils/m4lNaming.js'

const templateDirectory = path.join(process.cwd(), 'maxforlive/templates/M4L-Remote-Target')
const templatePath = path.join(templateDirectory, 'M4L-Remote-Target.maxpat')
const appPath = path.join(process.cwd(), 'client/src/App.jsx')

function generateCaptureScript() {
  const { target, mappings } = createNanoKontrol2Demo()
  const files = generateRemoteScriptFiles({ target, mappings })
  return files[`${files.scriptSlug}.py`]
}

test('central naming always separates prefix and slot number with one space', () => {
  assert.equal(normalizePrefix('  M4L Param  ', 'Fallback'), 'M4L Param')
  assert.equal(normalizePrefix('', 'M4L Param'), 'M4L Param')
  assert.equal(buildM4LSlotName('M4L-Param', 1), 'M4L-Param 1')
  assert.equal(buildM4LParamName('M4L Param', 0), 'M4L Param 1')
  assert.equal(buildM4LParamName('M4L-Param', 0), 'M4L-Param 1')
  assert.equal(buildM4LButtonName('M4L Button', 0), 'M4L Button 1')
  assert.equal(buildM4LButtonName('M4L-Button', 0), 'M4L-Button 1')
  assert.notEqual(buildM4LParamName('M4L-Param', 0), 'M4L-Param-1')
  assert.notEqual(buildM4LButtonName('M4L-Button', 0), 'M4L-Button')
})

test('Max for Live template exposes eight exact parameters and transparent stereo audio', async () => {
  const source = await readFile(templatePath, 'utf8')
  const maxpat = JSON.parse(source)
  const boxes = maxpat.patcher.boxes.map(({ box }) => box)
  const dials = boxes.filter((box) => box.maxclass === 'live.dial')
  const buttons = boxes.filter((box) => box.maxclass === 'live.toggle')
  const longNames = dials.map((dial) => dial.saved_attribute_attributes.valueof.parameter_longname)
  const shortNames = dials.map((dial) => dial.saved_attribute_attributes.valueof.parameter_shortname)
  const buttonLongNames = buttons.map((button) => button.saved_attribute_attributes.valueof.parameter_longname)
  const buttonShortNames = buttons.map((button) => button.saved_attribute_attributes.valueof.parameter_shortname)

  assert.equal(dials.length, 8)
  assert.equal(buttons.length, 8)
  assert.deepEqual(longNames, Array.from({ length: 8 }, (_, index) => `M4L Param ${index + 1}`))
  assert.deepEqual(shortNames, longNames)
  assert.deepEqual(buttonLongNames, Array.from({ length: 8 }, (_, index) => `M4L Button ${index + 1}`))
  assert.deepEqual(buttonShortNames, buttonLongNames)
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
  assert.doesNotMatch(source, /"parameter_longname": "M4L-Button"/)
  assert.doesNotMatch(source, /M4L-Param-1/)
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
  assert.match(appSource, />Momentary</)
  assert.match(appSource, />Input toggle</)
  assert.match(appSource, />Script toggle</)
  assert.match(appSource, />Trigger</)
  assert.match(appSource, /Name match only/)
  assert.match(appSource, /Index fallback enabled/)
  assert.match(appSource, /Allow index fallback if name is missing/)
  assert.match(appSource, /Recommended: keep disabled\. Name matching is safer for Max for Live devices\./)
  assert.match(appSource, /Resolved by name first\. Fallback index is only used if the exact parameter name is not found\./)
  assert.match(appSource, /<details className="advanced-index">/)
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
  assert.equal(profile.mappings.find((mapping) => mapping.source.data1 === 32).parameterIndex, 8)
  assert.deepEqual(profile.mappings.find((mapping) => mapping.source.data1 === 16).parameter_aliases, ['M4L Param 1', 'Param 1', 'm4l_param_1'])
  assert.deepEqual(profile.mappings.find((mapping) => mapping.source.data1 === 32).parameter_aliases, ['M4L Button 1', 'Button 1', 'm4l_button_1'])
  assert.ok(profile.mappings.every((mapping) => mapping.allowIndexFallback === false))
})

test('custom prefixes and compact fallback indices stay aligned across profile, script and maxpat', async () => {
  const target = {
    targetDeviceName: 'M4L-Remote-Target',
    parameterCount: 2,
    parameterPrefix: 'M4L-Param',
    buttonCount: 1,
    buttonPrefix: 'M4L-Button',
  }
  const source = (cc, label, controlKind) => ({
    id: `test-0-${cc}`, endpointName: 'Test', messageType: 'CONTROLCHANGE',
    userChannel: 1, frameworkChannel: 0, data1: cc, lastValue: 0, label, controlKind,
  })
  const mappings = [
    { id: 'p1', source: source(0, 'Param 1', 'knob'), controlType: 'continuous', targetType: 'm4l_parameter', targetDeviceName: target.targetDeviceName, targetParameterName: buildM4LParamName(target.parameterPrefix, 0), parameterIndex: '', scaling: 'parameter_min_max' },
    { id: 'p2', source: source(16, 'Param 2', 'knob'), controlType: 'continuous', targetType: 'm4l_parameter', targetDeviceName: target.targetDeviceName, targetParameterName: buildM4LParamName(target.parameterPrefix, 1), parameterIndex: '', scaling: 'parameter_min_max' },
    { id: 'b1', source: source(45, 'Button 1', 'button'), controlType: 'button', targetType: 'm4l_button', targetDeviceName: target.targetDeviceName, targetButtonName: buildM4LButtonName(target.buttonPrefix, 0), parameterIndex: '', buttonMode: 'momentary' },
  ]
  const files = generateRemoteScriptFiles({ target, mappings })
  const profile = JSON.parse(files['profile.json'])
  const script = files[`${files.scriptSlug}.py`]
  const customizedPatch = customizeMaxForLiveTemplate(await readFile(templatePath, 'utf8'), target)
  const patch = JSON.parse(customizedPatch)
  const boxes = patch.patcher.boxes.map(({ box }) => box)

  assert.deepEqual(profile.mappings.map((mapping) => mapping.parameterIndex), [0, 1, 2])
  assert.ok(profile.mappings.every((mapping) => mapping.allowIndexFallback === false))
  assert.match(script, /"parameter": "M4L-Param 1".*"parameter_index": 0/)
  assert.match(script, /"expected_kind": "parameter".*"expected_prefix": "M4L-Param".*"allow_index_fallback": False/)
  assert.match(script, /"parameter_aliases": \["M4L-Param 1","Param 1","m4l_param_1"\]/)
  assert.match(script, /"parameter": "M4L-Param 2".*"parameter_index": 1/)
  assert.match(script, /"parameter": "M4L-Button 1".*"parameter_index": 2/)
  assert.match(script, /"expected_kind": "button".*"expected_prefix": "M4L-Button".*"allow_index_fallback": False/)
  assert.match(script, /"parameter_aliases": \["M4L-Button 1","Button 1","m4l_button_1"\]/)
  assert.deepEqual(boxes.filter((box) => box.maxclass === 'live.dial').map((box) => box.saved_attribute_attributes.valueof.parameter_longname), ['M4L-Param 1', 'M4L-Param 2'])
  assert.deepEqual(boxes.filter((box) => box.maxclass === 'live.dial').map((box) => box.saved_attribute_attributes.valueof.parameter_shortname), ['M4L-Param 1', 'M4L-Param 2'])
  assert.deepEqual(boxes.filter((box) => box.maxclass === 'live.toggle').map((box) => box.saved_attribute_attributes.valueof.parameter_longname), ['M4L-Button 1'])
  assert.deepEqual(boxes.filter((box) => box.maxclass === 'live.toggle').map((box) => box.saved_attribute_attributes.valueof.parameter_shortname), ['M4L-Button 1'])
  assert.doesNotMatch(customizedPatch, /M4L-Param-1/)
  assert.doesNotMatch(customizedPatch, /"parameter_longname": "M4L-Button"/)
})

test('generated Live 12 Remote Script uses the safe logging helper', () => {
  const script = generateCaptureScript()

  assert.doesNotMatch(script, /self\.log_message\(/)
  assert.match(script, /def _log\(self, message\):/)
  assert.match(script, /self\._log\(/)
  assert.match(script, /self\.c_instance\(\)\.log_message\(text\)/)
  assert.match(script, /self\.canonical_parent\.log_message\(text\)/)
  assert.match(script, /BUILD_ID = "v01-[0-9a-f]{8}"/)
  assert.match(script, /script loaded build_id=\{\}/)
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

  assert.match(script, /script loaded build_id=\{\}/)
  assert.match(script, /CC received channel=\{\} cc=\{\} value=\{\}/)
  assert.match(script, /target device found: \{\}/)
  assert.match(script, /target device missing: \{\}/)
  assert.match(script, /parameter found: \{\}/)
  assert.match(script, /parameter missing by aliases: \{\}/)
  assert.match(script, /available parameters: \{\}/)
  assert.match(script, /", "\.join\(\[parameter\.name for parameter in target_device\.parameters\]\)/)
  assert.match(script, /listening CC channel=\{\} cc=\{\}/)
})

test('parameter index fallback excludes Live Device On', () => {
  const script = generateCaptureScript()

  assert.match(script, /mapping\.get\("allow_index_fallback"\) is not True/)
  assert.match(script, /index fallback disabled for \{\}/)
  assert.match(script, /automatable_parameters = \[parameter for parameter in target_device\.parameters if parameter\.name != "Device On"\]/)
  assert.match(script, /fallback_parameter = automatable_parameters\[index\]/)
  assert.match(script, /unsafe fallback rejected:/)
  assert.match(script, /safe fallback accepted:/)
  assert.match(script, /def _is_safe_fallback\(self, mapping, parameter\):/)
  assert.match(script, /def _is_parameter_compatible_with_mapping\(self, mapping, parameter\):/)
  assert.match(script, /if expected_kind == "parameter":\n\s+return "button" not in parameter_name/)
  assert.match(script, /if expected_kind == "button":\n\s+return "button" in parameter_name/)
  assert.match(script, /aliases = mapping\.get\("parameter_aliases", \[exact_name\]\)/)
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

test('generated Python fallback is opt-in and rejects cross-kind parameter order', async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'm4l-safe-fallback-'))
  context.after(() => rm(directory, { recursive: true, force: true }))
  const scriptPath = path.join(directory, 'M4L_Remote_Target_Remote.py')
  const harnessPath = path.join(directory, 'fallback_harness.py')
  await writeFile(scriptPath, generateCaptureScript(), 'utf8')
  const harness = `import importlib.util
import sys
import types

live_module = types.ModuleType("Live")
live_module.MidiMap = types.SimpleNamespace(MapMode=types.SimpleNamespace(absolute=0))
sys.modules["Live"] = live_module

framework = types.ModuleType("_Framework")
control_surface_module = types.ModuleType("_Framework.ControlSurface")
input_module = types.ModuleType("_Framework.InputControlElement")
encoder_module = types.ModuleType("_Framework.EncoderElement")
control_surface_module.ControlSurface = type("ControlSurface", (), {})
input_module.MIDI_CC_TYPE = 0
encoder_module.EncoderElement = type("EncoderElement", (), {})
sys.modules["_Framework"] = framework
sys.modules["_Framework.ControlSurface"] = control_surface_module
sys.modules["_Framework.InputControlElement"] = input_module
sys.modules["_Framework.EncoderElement"] = encoder_module

spec = importlib.util.spec_from_file_location("generated", ${JSON.stringify(scriptPath)})
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
surface = object.__new__(module.M4L_Remote_Target_Remote)
logs = []
surface._log = logs.append

class Parameter:
    def __init__(self, name):
        self.name = name

device_on = Parameter("Device On")
button = Parameter("Button 1")
continuous = Parameter("Param 1")
device = types.SimpleNamespace(parameters=[device_on, button, continuous])
surface.song = lambda: types.SimpleNamespace(tracks=[types.SimpleNamespace(devices=[])], return_tracks=[])
surface._find_device_in_chain = lambda devices, target: device

def mapping(kind, index, allow):
    return {
        "device": "M4L-Remote-Target",
        "parameter": "Missing Target",
        "expected_kind": kind,
        "expected_prefix": "M4L Param" if kind == "parameter" else "M4L Button",
        "allow_index_fallback": allow,
        "parameter_index": index,
    }

continuous_alias_mapping = mapping("parameter", 0, False)
continuous_alias_mapping["parameter_aliases"] = ["M4L Param 1", "Param 1", "m4l_param_1"]
assert surface._find_parameter(continuous_alias_mapping) is continuous
button_alias_mapping = mapping("button", 0, False)
button_alias_mapping["parameter_aliases"] = ["M4L Button 1", "Button 1", "m4l_button_1"]
assert surface._find_parameter(button_alias_mapping) is button
wrong_continuous_alias = mapping("parameter", 0, False)
wrong_continuous_alias["parameter_aliases"] = ["Button 1"]
assert surface._find_parameter(wrong_continuous_alias) is None
wrong_button_alias = mapping("button", 1, False)
wrong_button_alias["parameter_aliases"] = ["Param 1"]
assert surface._find_parameter(wrong_button_alias) is None

assert surface._find_parameter(mapping("parameter", 1, False)) is None
assert any("index fallback disabled" in message for message in logs)
logs[:] = []
assert surface._find_parameter(mapping("parameter", 0, True)) is None
assert any("unsafe fallback rejected" in message and "Button 1" in message for message in logs)
logs[:] = []
assert surface._find_parameter(mapping("button", 1, True)) is None
assert any("unsafe fallback rejected" in message and "Param 1" in message for message in logs)
logs[:] = []
assert surface._find_parameter(mapping("parameter", 1, True)) is continuous
assert any("safe fallback accepted" in message for message in logs)
logs[:] = []
assert surface._find_parameter(mapping("button", 0, True)) is button
assert any("safe fallback accepted" in message for message in logs)
print("safe fallback behavior: OK")
`
  await writeFile(harnessPath, harness, 'utf8')

  const result = spawnSync('python3', [harnessPath], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr || result.stdout)
  assert.match(result.stdout, /safe fallback behavior: OK/)
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
  assert.match(installCheck, /BUILD_ID/)
  assert.match(installCheck, /parameter_aliases/)
  assert.match(installCheck, /allow_index_fallback.*False/)
  assert.match(installCheck, /self\.log_message\(/)
  assert.match(installCheck, /def receive_midi\(/)
  assert.match(installCheck, /__pycache__/)
  assert.match(troubleshooting, /target device missing/)
  assert.match(troubleshooting, /parameter missing/)
  assert.match(troubleshooting, /Capture MIDI/)
  assert.match(troubleshooting, /Slider still controls a button/)
  assert.match(troubleshooting, /build_id/)
  assert.match(troubleshooting, /index fallback/)
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

  await writeFile(pythonPath, 'from _Framework.EncoderElement import EncoderElement\ncontrol.add_value_listener(listener)\nBUILD_ID = "test"\nparameter_aliases = []\nmapping = {"allow_index_fallback": False}\n', 'utf8')
  const currentResult = runCheck()
  assert.equal(currentResult.status, 0, currentResult.stdout || currentResult.stderr)

  await writeFile(pythonPath, 'EncoderElement\nadd_value_listener\nBUILD_ID\nparameter_aliases\n"allow_index_fallback": False\nself.log_message("old")\n', 'utf8')
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
  const exportedBoxes = JSON.parse(exportedPatch).patcher.boxes.map(({ box }) => box)
  assert.deepEqual(exportedBoxes.filter((box) => box.maxclass === 'live.dial').map((box) => box.saved_attribute_attributes.valueof.parameter_longname), Array.from({ length: 8 }, (_, index) => `M4L Param ${index + 1}`))
  assert.deepEqual(exportedBoxes.filter((box) => box.maxclass === 'live.toggle').map((box) => box.saved_attribute_attributes.valueof.parameter_longname), Array.from({ length: 8 }, (_, index) => `M4L Button ${index + 1}`))

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
  assert.match(troubleshooting, /Slider still controls a button/)
  assert.match(readMeFirst, /Continuous controls/)
  assert.match(readMeFirst, /Button controls/)
  assert.match(parameterNames, /M4L Button 8/)
  assert.match(parameterNames, /toggle_from_input/)
  assert.equal(profile.mappings.length, 9)
  assert.ok(profile.mappings.some((mapping) => mapping.controlType === 'continuous'))
  assert.ok(profile.mappings.some((mapping) => mapping.controlType === 'button'))
})

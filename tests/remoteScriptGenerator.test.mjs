import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

import { generateRemoteScriptFiles } from '../client/src/generators/remoteScriptGenerator.js'

const target = {
  targetDeviceName: 'M4L Remote Target',
  parameterCount: 8,
  parameterPrefix: 'M4L Param',
}

const captureControl = {
  id: 'nanoKONTROL2-0-45',
  endpointName: 'nanoKONTROL2',
  messageType: 'CONTROLCHANGE',
  userChannel: 1,
  frameworkChannel: 0,
  data1: 45,
  lastValue: 127,
  label: 'Cycle / Capture',
  controlKind: 'button',
}

const captureMapping = {
  id: 'mapping-demo-capture',
  source: captureControl,
  targetType: 'global_action',
  actionName: 'Capture MIDI',
  triggerMode: 'value_eq_127',
}

function generateCaptureScript() {
  const files = generateRemoteScriptFiles({ target, mappings: [captureMapping] })
  return files[`${files.scriptSlug}.py`]
}

test('generated Live 12 Remote Script uses the safe logging helper', () => {
  const script = generateCaptureScript()

  assert.doesNotMatch(script, /self\.log_message\(/)
  assert.match(script, /def _log\(self, message\):/)
  assert.match(script, /self\._log\(/)
  assert.match(script, /self\.canonical_parent\.log_message\(message\)/)
  assert.match(script, /from _Framework\.ControlSurface import ControlSurface/)
  assert.match(script, /def _setup_mappings\(self\):/)
})

test('generated Capture MIDI mapping preserves the validated CC45 guard', () => {
  const script = generateCaptureScript()

  assert.match(script, /"channel": 0, "cc": 45/)
  assert.match(script, /self\.song\(\)\.capture_midi\(\)/)
  assert.match(script, /value == 127/)
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

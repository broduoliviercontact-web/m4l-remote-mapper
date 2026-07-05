import assert from 'node:assert/strict'
import test from 'node:test'

import { createM4LCustomLayoutMappings } from '../client/src/utils/m4lCustomLayout.js'
import { generateRemoteScriptFiles } from '../client/src/generators/remoteScriptGenerator.js'

const target = {
  targetDeviceName: 'M4L-Remote-Target',
  parameterCount: 8,
  buttonCount: 8,
}
const parameterNames = Array.from({ length: 8 }, (_, index) => `M4L Param ${index + 1}`)
const buttonNames = Array.from({ length: 8 }, (_, index) => `M4L Button ${index + 1}`)

test('M4L Custom Layout creates exportable knob, fader, and latched button mappings', () => {
  let id = 0
  const created = createM4LCustomLayoutMappings({
    name: 'My M4L Surface',
    knobs: 3,
    faders: 2,
    buttons: 1,
    target,
    parameterNames,
    buttonNames,
    idFactory: (prefix) => `${prefix}-${++id}`,
  })
  assert.equal(created.mappings.length, 6)
  assert.deepEqual(created.mappings.map((mapping) => mapping.visualControlKind), ['knob', 'knob', 'knob', 'fader', 'fader', 'button'])
  assert.deepEqual(created.mappings.slice(0, 5).map((mapping) => mapping.targetParameterName), parameterNames.slice(0, 5))
  const button = created.mappings[5]
  assert.equal(button.targetButtonName, 'M4L Button 1')
  assert.equal(button.buttonMode, 'toggle_in_script')
  assert.equal(button.parameterIndex, 8)
  assert.ok(created.mappings.every((mapping) => mapping.source.frameworkChannel === 0 && mapping.source.data1 >= 16))

  const files = generateRemoteScriptFiles({ target, mappings: created.mappings })
  const profile = JSON.parse(files['profile.json'])
  const script = files[`${files.scriptSlug}.py`]
  assert.equal(profile.mappings.length, 6)
  assert.equal(profile.mappings[5].buttonMode, 'toggle_in_script')
  assert.match(script, /"cc": 21/)
  assert.match(script, /"button_mode": "toggle_in_script"/)
})

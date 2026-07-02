import { generateParameterNames } from '../generators/remoteScriptGenerator.js'

export const NANO_KONTROL2_TARGET = Object.freeze({
  targetDeviceName: 'M4L-Remote-Target',
  parameterCount: 8,
  parameterPrefix: 'M4L Param',
})

const createDemoControl = (cc) => ({
  id: `nanoKONTROL2-0-${cc}`,
  endpointName: 'nanoKONTROL2',
  messageType: 'CONTROLCHANGE',
  userChannel: 1,
  frameworkChannel: 0,
  data1: cc,
  lastValue: cc === 45 ? 127 : 64,
  label: cc === 45 ? 'Cycle / Capture' : `Knob ${cc - 15}`,
  controlKind: cc === 45 ? 'button' : 'knob',
})

export function createNanoKontrol2Demo() {
  const target = { ...NANO_KONTROL2_TARGET }
  const parameterNames = generateParameterNames(target)
  const controls = [16, 17, 18, 19, 45].map(createDemoControl)
  const mappings = controls.slice(0, 4).map((control, index) => ({
    id: `mapping-demo-cc-${control.data1}`,
    source: { ...control },
    targetType: 'm4l_parameter',
    targetDeviceName: target.targetDeviceName,
    targetParameterName: parameterNames[index],
    parameterIndex: index,
    actionName: 'Capture MIDI',
    triggerMode: 'value_gt_0',
  }))

  mappings.push({
    id: 'mapping-demo-capture',
    source: { ...controls[4] },
    targetType: 'global_action',
    targetDeviceName: target.targetDeviceName,
    targetParameterName: parameterNames[0],
    parameterIndex: '',
    actionName: 'Capture MIDI',
    triggerMode: 'value_eq_127',
  })

  return { target, controls, mappings }
}

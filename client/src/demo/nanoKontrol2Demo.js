import { generateButtonNames, generateParameterNames } from '../generators/remoteScriptGenerator.js'

export const NANO_KONTROL2_TARGET = Object.freeze({
  targetDeviceName: 'M4L-Remote-Target',
  parameterCount: 8,
  parameterPrefix: 'M4L Param',
  buttonCount: 8,
  buttonPrefix: 'M4L Button',
})

const createDemoControl = (cc) => ({
  id: `nanoKONTROL2-0-${cc}`,
  endpointName: 'nanoKONTROL2',
  messageType: 'CONTROLCHANGE',
  userChannel: 1,
  frameworkChannel: 0,
  data1: cc,
  lastValue: cc === 45 ? 127 : cc >= 32 ? 0 : 64,
  label: cc === 45 ? 'Cycle / Capture' : cc >= 32 ? `Button ${cc - 31}` : `Knob ${cc - 15}`,
  controlKind: cc >= 32 ? 'button' : 'knob',
})

export function createNanoKontrol2Demo() {
  const target = { ...NANO_KONTROL2_TARGET }
  const parameterNames = generateParameterNames(target)
  const buttonNames = generateButtonNames(target)
  const controls = [16, 17, 18, 19, 32, 33, 34, 35, 45].map(createDemoControl)
  const mappings = controls.slice(0, 4).map((control, index) => ({
    id: `mapping-demo-cc-${control.data1}`,
    source: { ...control },
    controlType: 'continuous',
    targetType: 'm4l_parameter',
    targetDeviceName: target.targetDeviceName,
    targetParameterName: parameterNames[index],
    parameterIndex: index,
    parameterIndexMode: 'auto',
    allowIndexFallback: false,
    scaling: 'parameter_min_max',
    actionName: 'Capture MIDI',
    triggerMode: 'value_gt_0',
  }))

  const buttonModes = ['toggle_in_script', 'toggle_in_script', 'momentary', 'momentary']
  mappings.push(...controls.slice(4, 8).map((control, index) => ({
    id: `mapping-demo-button-cc-${control.data1}`,
    source: { ...control },
    controlType: 'button',
    targetType: 'm4l_button',
    targetDeviceName: target.targetDeviceName,
    targetButtonName: buttonNames[index],
    buttonMode: buttonModes[index],
    parameterIndex: target.parameterCount + index,
    parameterIndexMode: 'auto',
    allowIndexFallback: false,
  })))

  mappings.push({
    id: 'mapping-demo-capture',
    source: { ...controls[8] },
    controlType: 'button',
    targetType: 'global_action',
    targetDeviceName: target.targetDeviceName,
    targetParameterName: parameterNames[0],
    parameterIndex: '',
    allowIndexFallback: false,
    actionName: 'Capture MIDI',
    buttonMode: 'trigger',
    triggerMode: 'value_eq_127',
  })

  return { target, controls, mappings }
}

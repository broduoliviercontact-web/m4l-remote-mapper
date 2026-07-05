const makeId = (prefix) => {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}-${random}`
}

const normalizedCount = (value) => Math.max(0, Math.min(32, Number.parseInt(value, 10) || 0))

const kindTitle = (kind) => `${kind.charAt(0).toUpperCase()}${kind.slice(1)}`

export const ABLETON_GLOBAL_ACTIONS = [
  'Capture MIDI',
  'Start Playback',
  'Stop Playback',
  'Continue Playback',
  'Tap Tempo',
  'Undo',
  'Redo',
]

function createMapping({ kind, index, layoutInstanceId, layoutName, device, idFactory }) {
  const visualControlId = idFactory(`visual-${kind}`)
  const mappingId = idFactory(`custom-mapping-${kind}`)
  const visualControlLabel = `${kindTitle(kind)} ${index}`
  const isAction = kind === 'action'
  const isButton = kind === 'button' || isAction
  return {
    control: { id: visualControlId, kind, label: visualControlLabel, mappingId },
    mapping: {
      id: mappingId,
      layoutId: 'custom-layout',
      layoutInstanceId,
      layoutName,
      createdBy: 'custom_layout',
      userLabel: visualControlLabel,
      visualControlId,
      visualControlKind: kind,
      visualControlLabel,
      source: null,
      controlType: isButton ? 'button' : 'continuous',
      preferredControlKind: isButton ? 'button' : kind,
      ...(isButton ? { buttonMode: isAction ? 'trigger' : 'toggle_in_script', buttonId: '' } : {}),
      targetType: isAction ? 'global_action' : 'ableton_device_parameter',
      ...(isAction ? { actionName: ABLETON_GLOBAL_ACTIONS[0], triggerMode: 'value_eq_127' } : {}),
      targetDeviceName: device.deviceName,
      targetDeviceAliases: [device.deviceName, device.deviceClassName],
      targetParameterName: '',
      parameterAliases: [],
      parameterIndex: null,
      liveIndex: null,
      parameterSection: 'Unassigned',
      parameterRisk: 'unknown',
      parameterSearch: '',
      allowIndexFallback: false,
      scaling: 'parameter_min_max',
      invert: false,
      curve: 'linear',
    },
  }
}

export function createCustomLayout({ name = 'My Custom Layout', faders = 0, knobs = 0, buttons = 0, actions = 0, device, instanceId, idFactory = makeId }) {
  const layoutInstanceId = instanceId || idFactory('custom-layout')
  const layoutName = String(name || 'My Custom Layout').trim() || 'My Custom Layout'
  const generated = []
  for (const [kind, count] of [['fader', faders], ['knob', knobs], ['button', buttons], ['action', actions]]) {
    for (let index = 1; index <= normalizedCount(count); index += 1) generated.push(createMapping({ kind, index, layoutInstanceId, layoutName, device, idFactory }))
  }
  const customLayout = {
    layoutInstanceId,
    layoutName,
    controllerLayoutType: 'custom_grid',
    controls: generated.map((item) => item.control),
  }
  return {
    layoutEntry: { layoutInstanceId, layoutId: 'custom-layout', layoutName, controlCount: generated.length, createdBy: 'custom_layout', controllerLayoutType: 'custom_grid' },
    customLayout,
    mappings: generated.map((item) => item.mapping),
  }
}

export function addCustomControl(state, { layoutInstanceId, kind, device, idFactory = makeId }) {
  const layout = state.customLayouts.find((item) => item.layoutInstanceId === layoutInstanceId)
  if (!layout || !['knob', 'fader', 'button', 'action'].includes(kind)) return state
  const sameKind = layout.controls.filter((control) => control.kind === kind)
  const nextIndex = Math.max(sameKind.length, ...sameKind.map((control) => Number.parseInt(control.label.match(/(\d+)$/)?.[1], 10) || 0)) + 1
  const generated = createMapping({ kind, index: nextIndex, layoutInstanceId, layoutName: layout.layoutName, device, idFactory })
  return {
    ...state,
    customLayouts: state.customLayouts.map((item) => item.layoutInstanceId === layoutInstanceId ? { ...item, controls: [...item.controls, generated.control] } : item),
    layoutStack: state.layoutStack.map((item) => item.layoutInstanceId === layoutInstanceId ? { ...item, controlCount: item.controlCount + 1 } : item),
    mappings: [...state.mappings, generated.mapping],
  }
}

export function removeCustomControl(state, visualControlId) {
  const layout = state.customLayouts.find((item) => item.controls.some((control) => control.id === visualControlId))
  if (!layout) return state
  const control = layout.controls.find((item) => item.id === visualControlId)
  return {
    ...state,
    customLayouts: state.customLayouts.map((item) => item.layoutInstanceId === layout.layoutInstanceId ? { ...item, controls: item.controls.filter((candidate) => candidate.id !== visualControlId) } : item),
    layoutStack: state.layoutStack.map((item) => item.layoutInstanceId === layout.layoutInstanceId ? { ...item, controlCount: Math.max(0, item.controlCount - 1) } : item),
    mappings: state.mappings.filter((mapping) => mapping.id !== control.mappingId),
  }
}

export function renameCustomLayout(state, layoutInstanceId, layoutName) {
  const name = String(layoutName ?? '')
  return {
    ...state,
    customLayouts: state.customLayouts.map((item) => item.layoutInstanceId === layoutInstanceId ? { ...item, layoutName: name } : item),
    layoutStack: state.layoutStack.map((item) => item.layoutInstanceId === layoutInstanceId ? { ...item, layoutName: name } : item),
    mappings: state.mappings.map((mapping) => mapping.layoutInstanceId === layoutInstanceId ? { ...mapping, layoutName: name } : mapping),
  }
}

export function updateCustomControl(state, visualControlId, patch) {
  const layout = state.customLayouts.find((item) => item.controls.some((control) => control.id === visualControlId))
  const control = layout?.controls.find((item) => item.id === visualControlId)
  if (!control) return state
  const nextKind = patch.kind || control.kind
  const isAction = nextKind === 'action'
  const isButton = nextKind === 'button' || isAction
  const nextLabel = patch.label ?? control.label
  return {
    ...state,
    customLayouts: state.customLayouts.map((item) => item.layoutInstanceId === layout.layoutInstanceId ? {
      ...item,
      controls: item.controls.map((candidate) => candidate.id === visualControlId ? { ...candidate, ...patch, kind: nextKind, label: nextLabel } : candidate),
    } : item),
    mappings: state.mappings.map((mapping) => mapping.id === control.mappingId ? {
      ...mapping,
      visualControlKind: nextKind,
      visualControlLabel: nextLabel,
      userLabel: nextLabel,
      controlType: isButton ? 'button' : 'continuous',
      preferredControlKind: isButton ? 'button' : nextKind,
      source: mapping.source ? { ...mapping.source, controlKind: isButton ? 'button' : nextKind } : null,
      targetType: isAction ? 'global_action' : 'ableton_device_parameter',
      actionName: isAction ? (mapping.actionName || ABLETON_GLOBAL_ACTIONS[0]) : null,
      triggerMode: isAction ? 'value_eq_127' : null,
      buttonMode: isButton ? (isAction ? 'trigger' : (mapping.buttonMode === 'trigger' ? 'toggle_in_script' : mapping.buttonMode || 'toggle_in_script')) : null,
      buttonId: isButton && mapping.source ? `${mapping.source.frameworkChannel}:${mapping.source.data1}` : null,
    } : mapping),
  }
}

export function assignMidiSourceToMapping(mappings, mappingId, source) {
  return mappings.map((mapping) => mapping.id === mappingId ? {
    ...mapping,
    source: source ? { ...source } : null,
    ...(mapping.controlType === 'button' ? { buttonId: source ? `${source.frameworkChannel}:${source.data1}` : '' } : {}),
  } : mapping)
}

export function updateAssignedMidiValues(mappings, source, lastValue) {
  const value = Math.max(0, Math.min(127, Number(lastValue) || 0))
  return mappings.map((mapping) => {
    if (!mapping.source) return mapping
    const sameSource = mapping.source.id === source.id || (
      mapping.source.endpointName === source.endpointName
      && mapping.source.frameworkChannel === source.frameworkChannel
      && mapping.source.data1 === source.data1
    )
    if (!sameSource) return mapping
    const previousValue = Math.max(0, Math.min(127, Number(mapping.source.lastValue) || 0))
    const previousDisplayValue = mapping.source.displayValue ?? (previousValue > 0 ? 127 : 0)
    const pressed = value >= 64
    const wasPressed = previousValue >= 64
    const displayValue = mapping.controlType === 'button' && mapping.buttonMode === 'toggle_in_script'
      ? (pressed && !wasPressed ? (previousDisplayValue > 0 ? 0 : 127) : previousDisplayValue)
      : value
    return { ...mapping, source: { ...mapping.source, lastValue: value, displayValue } }
  })
}

export function removeCustomLayout(state, layoutInstanceId) {
  return {
    ...state,
    customLayouts: state.customLayouts.filter((layout) => layout.layoutInstanceId !== layoutInstanceId),
    layoutStack: state.layoutStack.filter((layout) => layout.layoutInstanceId !== layoutInstanceId),
    mappings: state.mappings.filter((mapping) => mapping.layoutInstanceId !== layoutInstanceId),
  }
}

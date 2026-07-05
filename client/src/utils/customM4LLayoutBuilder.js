const makeId = (prefix) => {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}-${random}`
}

const clampCount = (value) => Math.max(0, Math.min(32, Number.parseInt(value, 10) || 0))
const title = (kind) => `${kind.charAt(0).toUpperCase()}${kind.slice(1)}`
const sourceKey = (source) => source ? `${source.endpointName || ''}:${source.frameworkChannel}:${source.data1}` : ''

function createControlAndMapping({ kind, index, layoutInstanceId, layoutName, target, parameterNames, buttonNames, idFactory }) {
  const visualControlId = idFactory(`visual-${kind}`)
  const mappingId = idFactory(`custom-m4l-${kind}`)
  const visualControlLabel = `${title(kind)} ${index}`
  const isButton = kind === 'button'
  const isAction = kind === 'action'
  const continuousOffset = kind === 'fader' ? Number(index) - 1 : Number(index) - 1
  const parameterIndex = Math.max(0, continuousOffset)
  const buttonIndex = Math.max(0, Number(index) - 1)
  const common = {
    id: mappingId,
    layoutId: 'custom-m4l-layout',
    layoutInstanceId,
    layoutName,
    createdBy: 'custom_layout',
    userLabel: visualControlLabel,
    visualControlId,
    visualControlKind: kind,
    visualControlLabel,
    source: null,
    preferredControlKind: isButton || isAction ? 'button' : kind,
    targetDeviceName: target.targetDeviceName,
    allowIndexFallback: false,
    invert: false,
    curve: 'linear',
  }
  const mapping = isAction ? {
    ...common,
    controlType: 'button',
    targetType: 'global_action',
    actionName: 'Capture MIDI',
    buttonMode: 'trigger',
    triggerMode: 'value_eq_127',
  } : isButton ? {
    ...common,
    controlType: 'button',
    targetType: 'm4l_button',
    targetButtonName: buttonNames[buttonIndex % buttonNames.length],
    parameterIndex: Number(target.parameterCount) + (buttonIndex % buttonNames.length),
    parameterIndexMode: 'auto',
    scaling: 'parameter_min_max',
    buttonMode: 'toggle_in_script',
    buttonId: '',
  } : {
    ...common,
    controlType: 'continuous',
    targetType: 'm4l_parameter',
    targetParameterName: parameterNames[parameterIndex % parameterNames.length],
    parameterIndex: parameterIndex % parameterNames.length,
    parameterIndexMode: 'auto',
    scaling: 'parameter_min_max',
  }
  return { control: { id: visualControlId, kind, label: visualControlLabel, mappingId }, mapping }
}

export function createCustomM4LLayout({
  name = 'My M4L Performance Layout',
  knobs = 0,
  faders = 0,
  buttons = 0,
  actions = 0,
  target,
  parameterNames,
  buttonNames,
  instanceId,
  idFactory = makeId,
}) {
  const layoutInstanceId = instanceId || idFactory('custom-m4l-layout')
  const layoutName = String(name || 'My M4L Performance Layout').trim() || 'My M4L Performance Layout'
  const generated = []
  let continuousSlot = 0
  for (const [kind, count] of [['knob', knobs], ['fader', faders], ['button', buttons], ['action', actions]]) {
    for (let index = 1; index <= clampCount(count); index += 1) {
      const item = createControlAndMapping({ kind, index, layoutInstanceId, layoutName, target, parameterNames, buttonNames, idFactory })
      if (kind === 'knob' || kind === 'fader') {
        item.mapping.targetParameterName = parameterNames[continuousSlot % parameterNames.length]
        item.mapping.parameterIndex = continuousSlot % parameterNames.length
        continuousSlot += 1
      }
      generated.push(item)
    }
  }
  const customLayout = {
    layoutInstanceId,
    layoutName,
    controllerLayoutType: 'custom_grid',
    mapperType: 'm4l_remote',
    controls: generated.map((item) => item.control),
  }
  return {
    layoutEntry: {
      layoutInstanceId,
      layoutId: 'custom-m4l-layout',
      layoutName,
      controlCount: generated.length,
      createdBy: 'custom_layout',
      controllerLayoutType: 'custom_grid',
      mapperType: 'm4l_remote',
    },
    customLayout,
    mappings: generated.map((item) => item.mapping),
  }
}

export function addCustomM4LControl(state, { layoutInstanceId, kind, target, parameterNames, buttonNames, idFactory = makeId }) {
  const layout = state.customLayouts.find((item) => item.layoutInstanceId === layoutInstanceId)
  if (!layout || !['knob', 'fader', 'button', 'action'].includes(kind)) return state
  const sameKind = layout.controls.filter((control) => control.kind === kind)
  const nextIndex = Math.max(sameKind.length, ...sameKind.map((control) => Number.parseInt(control.label.match(/(\d+)$/)?.[1], 10) || 0)) + 1
  const generated = createControlAndMapping({ kind, index: nextIndex, layoutInstanceId, layoutName: layout.layoutName, target, parameterNames, buttonNames, idFactory })
  if (kind === 'knob' || kind === 'fader') {
    const continuousCount = state.mappings.filter((mapping) => mapping.layoutInstanceId === layoutInstanceId && mapping.targetType === 'm4l_parameter').length
    generated.mapping.targetParameterName = parameterNames[continuousCount % parameterNames.length]
    generated.mapping.parameterIndex = continuousCount % parameterNames.length
  }
  return {
    ...state,
    customLayouts: state.customLayouts.map((item) => item.layoutInstanceId === layoutInstanceId ? { ...item, controls: [...item.controls, generated.control] } : item),
    layoutStack: state.layoutStack.map((item) => item.layoutInstanceId === layoutInstanceId ? { ...item, controlCount: item.controlCount + 1 } : item),
    mappings: [...state.mappings, generated.mapping],
  }
}

export function removeCustomM4LControl(state, visualControlId) {
  const layout = state.customLayouts.find((item) => item.controls.some((control) => control.id === visualControlId))
  const control = layout?.controls.find((item) => item.id === visualControlId)
  if (!layout || !control) return state
  return {
    ...state,
    customLayouts: state.customLayouts.map((item) => item.layoutInstanceId === layout.layoutInstanceId ? { ...item, controls: item.controls.filter((candidate) => candidate.id !== visualControlId) } : item),
    layoutStack: state.layoutStack.map((item) => item.layoutInstanceId === layout.layoutInstanceId ? { ...item, controlCount: Math.max(0, item.controlCount - 1) } : item),
    mappings: state.mappings.filter((mapping) => mapping.id !== control.mappingId),
  }
}

export function renameCustomM4LLayout(state, layoutInstanceId, layoutName) {
  const name = String(layoutName ?? '')
  return {
    ...state,
    customLayouts: state.customLayouts.map((item) => item.layoutInstanceId === layoutInstanceId ? { ...item, layoutName: name } : item),
    layoutStack: state.layoutStack.map((item) => item.layoutInstanceId === layoutInstanceId ? { ...item, layoutName: name } : item),
    mappings: state.mappings.map((mapping) => mapping.layoutInstanceId === layoutInstanceId ? { ...mapping, layoutName: name } : mapping),
  }
}

export function updateCustomM4LControl(state, visualControlId, patch, context) {
  const layout = state.customLayouts.find((item) => item.controls.some((control) => control.id === visualControlId))
  const control = layout?.controls.find((item) => item.id === visualControlId)
  if (!control) return state
  const nextKind = patch.kind || control.kind
  const nextLabel = patch.label ?? control.label
  const mapping = state.mappings.find((item) => item.id === control.mappingId)
  let mappingPatch = { visualControlKind: nextKind, visualControlLabel: nextLabel, userLabel: nextLabel, preferredControlKind: ['button', 'action'].includes(nextKind) ? 'button' : nextKind }
  if (nextKind === 'action') mappingPatch = { ...mappingPatch, controlType: 'button', targetType: 'global_action', actionName: 'Capture MIDI', buttonMode: 'trigger', triggerMode: 'value_eq_127' }
  else if (nextKind === 'button') mappingPatch = { ...mappingPatch, controlType: 'button', targetType: 'm4l_button', targetButtonName: mapping?.targetButtonName || context.buttonNames[0], parameterIndex: Number(context.target.parameterCount), buttonMode: mapping?.buttonMode === 'trigger' ? 'toggle_in_script' : (mapping?.buttonMode || 'toggle_in_script') }
  else mappingPatch = { ...mappingPatch, controlType: 'continuous', targetType: 'm4l_parameter', targetParameterName: mapping?.targetParameterName || context.parameterNames[0], parameterIndex: Math.max(0, context.parameterNames.indexOf(mapping?.targetParameterName)), scaling: 'parameter_min_max', buttonMode: undefined }
  return {
    ...state,
    customLayouts: state.customLayouts.map((item) => item.layoutInstanceId === layout.layoutInstanceId ? { ...item, controls: item.controls.map((candidate) => candidate.id === visualControlId ? { ...candidate, ...patch, kind: nextKind, label: nextLabel } : candidate) } : item),
    mappings: state.mappings.map((candidate) => candidate.id === control.mappingId ? { ...candidate, ...mappingPatch, source: candidate.source ? { ...candidate.source, controlKind: mappingPatch.preferredControlKind } : null } : candidate),
  }
}

export function assignM4LMidiSource(mappings, mappingId, source) {
  return mappings.map((mapping) => mapping.id === mappingId ? {
    ...mapping,
    source: source ? { ...source, controlKind: mapping.preferredControlKind, displayValue: source.lastValue || 0 } : null,
    ...(mapping.controlType === 'button' ? { buttonId: source ? `${source.frameworkChannel}:${source.data1}` : '' } : {}),
  } : mapping)
}

export function updateM4LAssignedMidiValues(mappings, source, lastValue) {
  const value = Math.max(0, Math.min(127, Number(lastValue) || 0))
  return mappings.map((mapping) => {
    if (!mapping.source || sourceKey(mapping.source) !== sourceKey(source)) return mapping
    const previousValue = Math.max(0, Math.min(127, Number(mapping.source.lastValue) || 0))
    const previousDisplayValue = mapping.source.displayValue ?? (previousValue > 0 ? 127 : 0)
    const displayValue = mapping.controlType === 'button' && mapping.buttonMode === 'toggle_in_script'
      ? (value >= 64 && previousValue < 64 ? (previousDisplayValue > 0 ? 0 : 127) : previousDisplayValue)
      : value
    return { ...mapping, source: { ...mapping.source, lastValue: value, displayValue } }
  })
}

export function detectM4LMappingWarnings(mappings) {
  const warnings = []
  const groups = new Map()
  for (const mapping of mappings) {
    const key = sourceKey(mapping.source)
    if (!key) warnings.push({ type: 'unassigned_midi_source', mappingIds: [mapping.id], message: `No MIDI source: ${mapping.visualControlLabel || mapping.id}` })
    else {
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(mapping.id)
    }
  }
  for (const [key, mappingIds] of groups) if (mappingIds.length > 1) warnings.push({ type: 'duplicate_midi_source', mappingIds, message: `Duplicate MIDI source: ${key}` })
  return warnings
}

export function createM4LControlPool(controls, mappings) {
  const assignments = new Map()
  for (const mapping of mappings) {
    const key = sourceKey(mapping.source)
    if (!key) continue
    if (!assignments.has(key)) assignments.set(key, [])
    assignments.get(key).push(mapping.id)
  }
  return controls.map((control) => ({ ...control, assignedMappingIds: assignments.get(sourceKey(control)) || [] }))
}

export function createPortableM4LProfile({ scriptName, target, mappings, controlPool, customLayouts, layoutStack }) {
  return { schemaVersion: '0.1', mapperType: 'm4l_remote', scriptName, target, mappings, controlPool, customLayouts, layoutStack }
}

export function parsePortableM4LProfile(text) {
  const profile = typeof text === 'string' ? JSON.parse(text) : text
  if (!profile || profile.mapperType !== 'm4l_remote' || !Array.isArray(profile.mappings) || !Array.isArray(profile.customLayouts)) throw new Error('Invalid M4L Remote Mapper profile.')
  return { ...profile, controlPool: Array.isArray(profile.controlPool) ? profile.controlPool : [], layoutStack: Array.isArray(profile.layoutStack) ? profile.layoutStack : [] }
}

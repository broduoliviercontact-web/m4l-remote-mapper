const clampCount = (value) => Math.max(0, Math.min(32, Number.parseInt(value, 10) || 0))

const defaultId = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`}`

export function createM4LCustomLayoutMappings({
  name = 'My M4L Custom Layout',
  faders = 0,
  knobs = 0,
  buttons = 0,
  target,
  parameterNames,
  buttonNames,
  idFactory = defaultId,
}) {
  const layoutId = idFactory('m4l-custom-layout')
  const layoutName = String(name || 'My M4L Custom Layout').trim() || 'My M4L Custom Layout'
  const mappings = []
  let continuousIndex = 0
  let buttonIndex = 0

  for (const [kind, count] of [['knob', knobs], ['fader', faders], ['button', buttons]]) {
    for (let index = 0; index < clampCount(count); index += 1) {
      const isButton = kind === 'button'
      const slotIndex = isButton ? buttonIndex++ : continuousIndex++
      const cc = 16 + mappings.length
      const label = `${kind.charAt(0).toUpperCase()}${kind.slice(1)} ${index + 1}`
      mappings.push({
        id: idFactory(`m4l-custom-${kind}`),
        layoutId,
        layoutName,
        createdBy: 'm4l_custom_layout',
        visualControlKind: kind,
        visualControlLabel: label,
        source: {
          id: `m4l-custom-default-0-${cc}`,
          endpointName: 'Custom Layout Default',
          messageType: 'CONTROLCHANGE',
          userChannel: 1,
          frameworkChannel: 0,
          data1: cc,
          lastValue: 0,
          displayValue: 0,
          controlKind: kind,
          label: `CC ${cc}`,
        },
        controlType: isButton ? 'button' : 'continuous',
        targetType: isButton ? 'm4l_button' : 'm4l_parameter',
        targetDeviceName: target.targetDeviceName,
        targetParameterName: parameterNames[slotIndex % parameterNames.length],
        targetButtonName: buttonNames[slotIndex % buttonNames.length],
        parameterIndex: isButton ? Number(target.parameterCount) + (slotIndex % buttonNames.length) : slotIndex % parameterNames.length,
        parameterIndexMode: 'auto',
        allowIndexFallback: false,
        scaling: 'parameter_min_max',
        buttonMode: isButton ? 'toggle_in_script' : undefined,
      })
    }
  }
  return { layoutId, layoutName, mappings }
}

export function assignM4LCustomSource(mappings, mappingId, source) {
  return mappings.map((mapping) => mapping.id === mappingId ? {
    ...mapping,
    source: source ? { ...source, controlKind: mapping.visualControlKind } : mapping.source,
  } : mapping)
}

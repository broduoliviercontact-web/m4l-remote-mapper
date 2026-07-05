import { useEffect, useMemo, useState } from 'react'

const KIND_ORDER = ['knob', 'fader', 'button', 'action']
const KIND_LABELS = { knob: 'Knobs', fader: 'Faders', button: 'Buttons', action: 'Actions' }

function displayValue(mapping) {
  const raw = mapping?.buttonMode === 'toggle_in_script' ? mapping?.source?.displayValue : mapping?.source?.lastValue
  return Math.max(0, Math.min(127, Number(raw) || 0))
}

function AsciiControlGlyph({ kind, mapping }) {
  const value = displayValue(mapping)
  const valueLabel = String(value).padStart(3, '0')
  const percent = (value / 127) * 100
  if (kind === 'knob') {
    return <div className="ascii-control-glyph ascii-knob" role="img" aria-label={`Knob value ${value}`}>
      <pre aria-hidden="true">{`   .---------.
  /           \
 |      O      |
  \___________/`}</pre>
      <span className="ascii-knob__needle" style={{ transform: `translateX(-50%) rotate(${-132 + percent * 2.64}deg)` }} aria-hidden="true">|</span>
      <strong>VALUE:{valueLabel}</strong>
    </div>
  }
  if (kind === 'fader') return <div className="ascii-control-glyph ascii-fader" role="img" aria-label={`Fader value ${value}`}>
    <span className="ascii-fader__max">127 +</span><span className="ascii-fader__track" aria-hidden="true"><i className="ascii-fader__thumb" style={{ bottom: `${percent}%` }}>[###]</i></span><span className="ascii-fader__min">000 +</span><strong>VALUE:{valueLabel}</strong>
  </div>
  const active = value > 0
  const mode = kind === 'action' ? 'TRIGGER' : mapping?.buttonMode === 'momentary' ? 'MOMENT' : mapping?.buttonMode === 'toggle_from_input' ? 'INPUT' : 'TOGGLE'
  return <div className={`ascii-control-glyph ascii-pad ${active ? 'ascii-pad--active' : ''}`} role="img" aria-label={`${kind} ${active ? 'on' : 'off'}`}>
    <pre aria-hidden="true">{`+------------+
| ${active ? '[*  ON  *]' : '[   OFF  ]'} |
+------------+`}</pre><strong>MODE:{mode}</strong><strong>VALUE:{valueLabel}</strong>
  </div>
}

function targetLabel(mapping) {
  if (!mapping) return 'NONE'
  if (mapping.targetType === 'global_action') return mapping.actionName || 'CAPTURE MIDI'
  if (mapping.targetType === 'm4l_button') return mapping.targetButtonName || 'NONE'
  return mapping.targetParameterName || 'NONE'
}

function VisualControl({ control, mapping, warnings, selected, learning, onSelect, onLearn, onUnassign }) {
  const hasWarnings = warnings.length > 0
  const status = learning ? 'LEARN' : selected ? 'EDIT' : hasWarnings ? 'WARN !' : mapping?.source ? 'OK' : 'WAIT'
  return <div role="button" tabIndex="0" data-control-kind={control.kind} className={`visual-control visual-control--${control.kind} ${selected ? 'visual-control--selected' : ''} ${learning ? 'visual-control--learning' : ''} ${hasWarnings ? 'visual-control--warning' : ''}`} onClick={onSelect} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect() }}>
    <span className="ascii-control-border" aria-hidden="true">+--------------------------+</span>
    <div className="ascii-control-body">
      <strong>|{selected ? '>' : ' '} {mapping?.visualControlLabel || control.label}</strong>
      <AsciiControlGlyph kind={control.kind} mapping={mapping}/>
      <span className={mapping?.source ? 'visual-route visual-route--assigned' : 'visual-route'}>| MIDI: {learning ? 'WAIT..._' : mapping?.source ? `CC${mapping.source.data1} / CH${mapping.source.userChannel}` : 'LEARN'}</span>
      <span className="visual-target">| TARGET: {targetLabel(mapping)}</span>
      {control.kind === 'button' && <span className="visual-target">| MODE: {(mapping?.buttonMode || 'toggle_in_script').toUpperCase()}</span>}
      {control.kind === 'action' && <span className="visual-target">| TRIGGER: VALUE == 127</span>}
      <span className={`ascii-status ascii-status--${status.replace(/\W/g, '').toLowerCase()}`}>| STATUS: {status}</span>
    </div>
    <span className="visual-control__actions"><button type="button" className={learning ? 'ascii-button learn-button--active' : 'ascii-button'} onClick={(event) => { event.stopPropagation(); onLearn() }}>[ {learning ? 'WAITING' : 'LEARN'} ]</button>{mapping?.source && <button type="button" className="ascii-button" onClick={(event) => { event.stopPropagation(); onUnassign() }}>[ CLEAR ]</button>}</span>
    <span className="ascii-control-border" aria-hidden="true">+--------------------------+</span>
  </div>
}

export default function M4LControllerLayoutPreview({
  customLayouts, mappings, warnings, selectedMappingId, learningMappingId, parameterNames, buttonNames,
  onSelect, onLearn, onUnassign, onAddControl, onRemoveControl, onRenameLayout, onUpdateControl, onUpdateMapping,
}) {
  const [activeLayoutId, setActiveLayoutId] = useState(customLayouts[0]?.layoutInstanceId || '')
  useEffect(() => { if (!customLayouts.some((layout) => layout.layoutInstanceId === activeLayoutId)) setActiveLayoutId(customLayouts[0]?.layoutInstanceId || '') }, [customLayouts, activeLayoutId])
  const layout = customLayouts.find((item) => item.layoutInstanceId === activeLayoutId) || customLayouts[0]
  const layoutMappings = useMemo(() => mappings.filter((mapping) => mapping.layoutInstanceId === layout?.layoutInstanceId), [mappings, layout?.layoutInstanceId])
  const selectedMapping = layoutMappings.find((mapping) => mapping.id === selectedMappingId) || layoutMappings[0]
  const selectedControl = layout?.controls.find((control) => control.mappingId === selectedMapping?.id)
  const controlWarnings = (mappingId) => warnings.filter((warning) => warning.mappingIds.includes(mappingId))

  if (!layout) return <div className="controller-designer-empty ascii-window"><pre className="ascii-pre">{`+----------------------------------------------------------+
| CUSTOM M4L MIDI SURFACE                                 |
+----------------------------------------------------------+
| STATUS: EMPTY                                           |
| > DEFINE KNOBS / FADERS / BUTTONS / ACTIONS             |
| > [ CREATE CUSTOM LAYOUT ]                              |
+----------------------------------------------------------+`}</pre></div>

  return <div className="controller-designer m4l-controller-designer">
    <div className="controller-surface">
      <div className="controller-surface__header"><div><span>+------------- CUSTOM M4L MIDI SURFACE -------------+</span><input aria-label="Custom M4L layout name" value={layout.layoutName} onChange={(event) => onRenameLayout(layout.layoutInstanceId, event.target.value)}/></div><div className="diagram-metrics"><span><b>{layout.controls.length}</b> modules</span><span><b>{layoutMappings.filter((mapping) => mapping.source).length}</b> learned</span><span><b>{warnings.filter((warning) => warning.mappingIds.some((id) => layoutMappings.some((mapping) => mapping.id === id))).length}</b> alerts</span></div>{customLayouts.length > 1 && <select aria-label="Custom M4L layout" value={layout.layoutInstanceId} onChange={(event) => setActiveLayoutId(event.target.value)}>{customLayouts.map((item) => <option value={item.layoutInstanceId} key={item.layoutInstanceId}>{item.layoutName}</option>)}</select>}</div>
      <div className="controller-faceplate"><div className="surface-ruler"><span>+------</span><span>M4L CONTROL BUS / CHANNEL ROUTING</span><span>------+</span></div>{KIND_ORDER.map((kind) => {
        const controls = layout.controls.filter((control) => control.kind === kind)
        if (!controls.length) return null
        return <section className={`controller-row controller-row--${kind}`} key={kind}><span className="controller-row__label">| {KIND_LABELS[kind].toUpperCase()}</span><div>{controls.map((control) => {
          const mapping = mappings.find((item) => item.id === control.mappingId)
          return <VisualControl key={control.id} control={control} mapping={mapping} warnings={controlWarnings(control.mappingId)} selected={selectedMapping?.id === mapping?.id} learning={learningMappingId === mapping?.id} onSelect={() => onSelect(mapping.id)} onLearn={() => onLearn(mapping.id)} onUnassign={() => onUnassign(mapping.id)}/>
        })}</div></section>
      })}</div>
      <div className="controller-add-strip"><span>&gt; ADD_MODULE:</span><button type="button" onClick={() => onAddControl(layout.layoutInstanceId, 'knob')}>[ ADD KNOB ]</button><button type="button" onClick={() => onAddControl(layout.layoutInstanceId, 'fader')}>[ ADD FADER ]</button><button type="button" onClick={() => onAddControl(layout.layoutInstanceId, 'button')}>[ ADD BUTTON ]</button><button type="button" onClick={() => onAddControl(layout.layoutInstanceId, 'action')}>[ ADD ACTION ]</button><button type="button" className="danger-command" disabled={!selectedControl} onClick={() => selectedControl && onRemoveControl(selectedControl.id)}>[ REMOVE SELECTED ]</button></div>
    </div>
    <aside className="visual-control-editor">{selectedMapping && selectedControl ? <>
      <div className="visual-editor__heading"><div><span>+----------- EDIT CONTROL -----------+</span><strong>| CONTROL: {selectedMapping.visualControlLabel}</strong></div><span className={`editor-kind editor-kind--${selectedControl.kind}`}>[{selectedControl.kind}]</span></div>
      <label><span>CONTROL LABEL</span><input aria-label="Visual control label" value={selectedMapping.visualControlLabel || ''} onChange={(event) => onUpdateControl(selectedControl.id, { label: event.target.value })}/></label>
      <label><span>TYPE</span><select aria-label="Visual control kind" value={selectedControl.kind} onChange={(event) => onUpdateControl(selectedControl.id, { kind: event.target.value })}>{KIND_ORDER.map((kind) => <option value={kind} key={kind}>{title(kind)}</option>)}</select></label>
      <div className="visual-midi-actions"><button type="button" className={learningMappingId === selectedMapping.id ? 'primary-button learn-button--active' : 'primary-button'} onClick={() => onLearn(selectedMapping.id)}>{learningMappingId === selectedMapping.id ? 'WAIT MIDI...' : 'LEARN MIDI'}</button><button type="button" className="secondary-button" onClick={() => onUnassign(selectedMapping.id)}>UNASSIGN</button></div>
      <div className="visual-assignment-readout"><small>MIDI</small><strong>{selectedMapping.source ? `CC ${selectedMapping.source.data1} · Channel ${selectedMapping.source.userChannel}` : 'Not assigned'}</strong></div>
      {selectedMapping.targetType === 'm4l_parameter' && <><label><span>TARGET</span><select aria-label="M4L parameter target" value={selectedMapping.targetParameterName} onChange={(event) => onUpdateMapping(selectedMapping.id, { targetParameterName: event.target.value, parameterIndex: parameterNames.indexOf(event.target.value) })}>{parameterNames.map((name) => <option key={name}>{name}</option>)}</select></label><label><span>SCALE</span><select value={selectedMapping.scaling || 'parameter_min_max'} onChange={(event) => onUpdateMapping(selectedMapping.id, { scaling: event.target.value, invert: event.target.value === 'inverted_parameter_min_max' })}><option value="parameter_min_max">parameter_min_max</option><option value="inverted_parameter_min_max">inverted_parameter_min_max</option></select></label><label className="invert-check"><input type="checkbox" checked={selectedMapping.invert === true} onChange={(event) => onUpdateMapping(selectedMapping.id, { invert: event.target.checked, scaling: event.target.checked ? 'inverted_parameter_min_max' : 'parameter_min_max' })}/> Invert MIDI</label></>}
      {selectedMapping.targetType === 'm4l_button' && <><label><span>TARGET</span><select aria-label="M4L button target" value={selectedMapping.targetButtonName} onChange={(event) => onUpdateMapping(selectedMapping.id, { targetButtonName: event.target.value, parameterIndex: parameterNames.length + buttonNames.indexOf(event.target.value) })}>{buttonNames.map((name) => <option key={name}>{name}</option>)}</select></label><label><span>MODE</span><select aria-label="M4L button mode" value={selectedMapping.buttonMode || 'toggle_in_script'} onChange={(event) => onUpdateMapping(selectedMapping.id, { buttonMode: event.target.value })}><option value="toggle_in_script">Script toggle</option><option value="momentary">Momentary</option><option value="toggle_from_input">Input toggle</option><option value="trigger">Trigger</option></select></label></>}
      {selectedMapping.targetType === 'global_action' && <><label><span>ACTION</span><select aria-label="Global action" value="Capture MIDI" disabled><option>Capture MIDI</option></select></label><label><span>TRIGGER</span><select value="value_eq_127" disabled><option value="value_eq_127">value == 127</option></select></label></>}
      <div className="visual-warning-stack">{controlWarnings(selectedMapping.id).map((warning) => <small key={`${warning.type}-${warning.message}`}>! {warning.message}</small>)}</div>
      <button type="button" className="remove-visual-control" onClick={() => onRemoveControl(selectedControl.id)}>&gt; [ REMOVE CONTROL ]</button>
    </> : <div className="visual-editor-empty"><strong>Select a control</strong><p>Click a module to edit MIDI, target, label, and behavior.</p></div>}</aside>
  </div>
}

const title = (value) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`

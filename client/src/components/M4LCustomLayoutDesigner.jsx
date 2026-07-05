import { useEffect, useMemo, useState } from 'react'

const KINDS = ['knob', 'fader', 'button']
const LABELS = { knob: 'Knobs', fader: 'Faders', button: 'Buttons' }

function ControlGlyph({ mapping }) {
  const rawValue = mapping.buttonMode === 'toggle_in_script' ? (mapping.source?.displayValue ?? mapping.source?.lastValue) : mapping.source?.lastValue
  const value = Math.max(0, Math.min(127, Number(rawValue) || 0))
  const percent = value / 127
  if (mapping.visualControlKind === 'knob') return <span className="controller-glyph" role="img" aria-label={`Knob value ${value}`}><span className="controller-knob"><i style={{ transform: `rotate(${-132 + percent * 264}deg)` }} /></span><small>{String(value).padStart(3, '0')}</small></span>
  if (mapping.visualControlKind === 'fader') return <span className="controller-glyph" role="img" aria-label={`Fader value ${value}`}><span className="controller-fader"><i style={{ top: `${4 + (1 - percent) * 36}px` }} /></span><small>{String(value).padStart(3, '0')}</small></span>
  const active = value > 0
  return <span className="controller-glyph" role="img" aria-label={`Button ${active ? 'on' : 'off'}`}><span className={`controller-button ${active ? 'controller-button--active' : ''}`}><i /></span><small>{active ? 'ON' : 'OFF'}</small></span>
}

export default function M4LCustomLayoutDesigner({ mappings, controls, parameterNames, buttonNames, learningMappingId, onLearn, onUpdate, onAssignSource, onRemove }) {
  const [selectedId, setSelectedId] = useState(mappings[0]?.id || '')
  useEffect(() => {
    if (!mappings.some((mapping) => mapping.id === selectedId)) setSelectedId(mappings[0]?.id || '')
  }, [mappings, selectedId])
  const selected = mappings.find((mapping) => mapping.id === selectedId) || mappings[0]
  const layoutName = mappings[0]?.layoutName || 'M4L Custom Layout'
  const assignedCount = mappings.filter((mapping) => !mapping.source?.id?.startsWith('m4l-custom-default')).length
  const groups = useMemo(() => KINDS.map((kind) => [kind, mappings.filter((mapping) => mapping.visualControlKind === kind)]).filter(([, items]) => items.length), [mappings])

  if (!mappings.length) return <div className="controller-designer-empty"><div className="designer-blueprint"><i/><i/><i/><i/><i/><i/></div><strong>Build your M4L surface</strong><p>Choose the number of knobs, faders, and buttons, then create the Custom Layout.</p></div>

  return <div className="controller-designer m4l-custom-designer">
    <div className="controller-surface">
      <div className="controller-surface__header"><div><span>CUSTOM M4L GRID / MIDI SURFACE</span><strong>{layoutName}</strong></div><div className="diagram-metrics"><span><b>{mappings.length}</b> modules</span><span><b>{assignedCount}</b> learned</span></div></div>
      <div className="controller-faceplate">{groups.map(([kind, items]) => <section className={`controller-row controller-row--${kind}`} key={kind}><span className="controller-row__label">{LABELS[kind]}</span><div>{items.map((mapping) => <div role="button" tabIndex="0" data-control-kind={kind} className={`visual-control visual-control--${kind} ${selected?.id === mapping.id ? 'visual-control--selected' : ''}`} key={mapping.id} onClick={() => setSelectedId(mapping.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedId(mapping.id) }}><span className="visual-control__top"><small>{kind}</small>{learningMappingId === mapping.id && <b>●</b>}</span><ControlGlyph mapping={mapping}/><strong>{mapping.visualControlLabel}</strong><span className="visual-route visual-route--assigned">CC{mapping.source.data1} · CH{mapping.source.userChannel}</span><span className="visual-target">{mapping.targetType === 'm4l_button' ? mapping.targetButtonName : mapping.targetParameterName}</span></div>)}</div></section>)}</div>
    </div>
    <aside className="visual-control-editor">{selected ? <>
      <div className="visual-editor__heading"><div><span>SELECTED CONTROL</span><strong>{selected.visualControlLabel}</strong></div><span className={`editor-kind editor-kind--${selected.visualControlKind}`}>{selected.visualControlKind}</span></div>
      <label><span>CONTROL LABEL</span><input value={selected.visualControlLabel} onChange={(event) => onUpdate(selected.id, { visualControlLabel: event.target.value })}/></label>
      <div className="visual-midi-actions"><button type="button" className={learningMappingId === selected.id ? 'primary-button learn-button--active' : 'primary-button'} onClick={() => onLearn(learningMappingId === selected.id ? '' : selected.id)}>{learningMappingId === selected.id ? 'Move a MIDI control…' : 'Learn MIDI'}</button></div>
      <label><span>MIDI SOURCE</span><select aria-label="Custom layout MIDI source" value={controls.some((control) => control.id === selected.source?.id) ? selected.source.id : ''} onChange={(event) => onAssignSource(selected.id, event.target.value)}><option value="">Default CC {selected.source.data1}</option>{controls.map((control) => <option value={control.id} key={control.id}>{control.label} · CC {control.data1} · CH {control.userChannel}</option>)}</select></label>
      {selected.controlType === 'button' ? <><label><span>M4L BUTTON TARGET</span><select value={selected.targetButtonName} onChange={(event) => onUpdate(selected.id, { targetButtonName: event.target.value, parameterIndex: Number(parameterNames.length) + buttonNames.indexOf(event.target.value) })}>{buttonNames.map((name) => <option key={name}>{name}</option>)}</select></label><label><span>BUTTON MODE</span><select aria-label="Custom layout button mode" value={selected.buttonMode || 'toggle_in_script'} onChange={(event) => onUpdate(selected.id, { buttonMode: event.target.value })}><option value="toggle_in_script">Toggle / latch in script (recommended)</option><option value="momentary">Momentary / active while held</option><option value="toggle_from_input">Follow hardware ON / OFF</option><option value="trigger">Trigger / one shot</option></select><small>Toggle / latch ignores release value 0.</small></label></> : <label><span>M4L PARAMETER TARGET</span><select value={selected.targetParameterName} onChange={(event) => onUpdate(selected.id, { targetParameterName: event.target.value, parameterIndex: parameterNames.indexOf(event.target.value) })}>{parameterNames.map((name) => <option key={name}>{name}</option>)}</select></label>}
      <button type="button" className="remove-visual-control" onClick={() => onRemove(selected.id)}>Remove control</button>
    </> : null}</aside>
  </div>
}

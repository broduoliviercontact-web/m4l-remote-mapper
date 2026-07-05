import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createScriptSlug,
  generateButtonNames,
  generateParameterNames,
  resolveMappingParameterIndex,
} from './generators/remoteScriptGenerator.js'
import { buildRemoteMapperPack, createTerminalCommands } from './generators/packGenerator.js'
import { createNanoKontrol2Demo, NANO_KONTROL2_TARGET } from './demo/nanoKontrol2Demo.js'
import M4LControllerLayoutPreview from './components/M4LControllerLayoutPreview.jsx'
import {
  addCustomM4LControl,
  assignM4LMidiSource,
  createCustomM4LLayout,
  createM4LControlPool,
  createPortableM4LProfile,
  detectM4LMappingWarnings,
  parsePortableM4LProfile,
  removeCustomM4LControl,
  renameCustomM4LLayout,
  updateCustomM4LControl,
  updateM4LAssignedMidiValues,
} from './utils/customM4LLayoutBuilder.js'
import maxForLivePatch from '../../maxforlive/templates/M4L-Remote-Target/M4L-Remote-Target.maxpat?raw'
import maxForLiveReadme from '../../maxforlive/templates/M4L-Remote-Target/README.md?raw'
import maxForLiveParameterNames from '../../maxforlive/templates/M4L-Remote-Target/PARAMETER_NAMES.md?raw'

const DEFAULT_TARGET = { ...NANO_KONTROL2_TARGET }

const STEP_LABELS = ['Script Name', 'Connect Controller', 'Max for Live Target', 'Custom Layout', 'Mapping', 'Export ZIP']

const Icon = ({ name }) => {
  const paths = {
    midi: <><path d="M4 7h16v10H4z"/><path d="M8 10v4m4-4v4m4-4v4"/></>,
    target: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></>,
    layout: <><rect x="3" y="4" width="7" height="7"/><rect x="14" y="4" width="7" height="7"/><rect x="3" y="15" width="7" height="5"/><rect x="14" y="15" width="7" height="5"/></>,
    route: <><path d="M5 5v5c0 1.1.9 2 2 2h10c1.1 0 2 .9 2 2v5"/><circle cx="5" cy="4" r="2"/><circle cx="19" cy="20" r="2"/><path d="m15 8 4 4-4 4"/></>,
    export: <><path d="M12 3v12m-4-4 4 4 4-4"/><path d="M5 17v3h14v-3"/></>,
    signal: <><path d="M3 12h3l2-6 4 12 3-9 2 3h4"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7"/><path d="M10 11v5m4-5v5"/></>,
  }
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

const Badge = ({ status, children }) => <span className={`badge badge--${status}`}>{children}</span>

const createControl = (endpointName, channel, cc, value = 0) => ({
  id: `${endpointName}-${channel}-${cc}`,
  endpointName,
  messageType: 'CONTROLCHANGE',
  userChannel: channel + 1,
  frameworkChannel: channel,
  data1: cc,
  lastValue: value,
  label: `CC ${cc}`,
  controlKind: 'unknown',
})

const createMapping = (control, target, parameterNames, buttonNames, index) => {
  const isButton = control.controlKind === 'button'
  return {
    id: `mapping-${control.id}-${Date.now()}-${index}`,
    source: { ...control },
    controlType: isButton ? 'button' : 'continuous',
    targetType: isButton ? 'm4l_button' : 'm4l_parameter',
    targetDeviceName: target.targetDeviceName,
    targetParameterName: parameterNames[index] || parameterNames[0],
    targetButtonName: buttonNames[index] || buttonNames[0],
    parameterIndex: isButton ? Number(target.parameterCount) + index : index,
    parameterIndexMode: 'auto',
    allowIndexFallback: false,
    scaling: 'parameter_min_max',
    buttonMode: isButton ? 'toggle_in_script' : undefined,
    actionName: 'Capture MIDI',
    triggerMode: 'value_eq_127',
  }
}

function App() {
  const midiSupported = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator
  const midiAccessRef = useRef(null)
  const importInputRef = useRef(null)
  const [activeStep, setActiveStep] = useState(0)
  const [midiStatus, setMidiStatus] = useState('idle')
  const [midiError, setMidiError] = useState('')
  const [inputs, setInputs] = useState([])
  const [selectedInputId, setSelectedInputId] = useState('')
  const [lastMessage, setLastMessage] = useState(null)
  const [controls, setControls] = useState([])
  const [target, setTarget] = useState(DEFAULT_TARGET)
  const [mappings, setMappings] = useState([])
  const [customLayouts, setCustomLayouts] = useState([])
  const [layoutStack, setLayoutStack] = useState([])
  const [isExporting, setIsExporting] = useState(false)
  const [lastExportedSlug, setLastExportedSlug] = useState('')
  const [learningMappingId, setLearningMappingId] = useState('')
  const [customLayoutName, setCustomLayoutName] = useState('My M4L Performance Layout')
  const [customCounts, setCustomCounts] = useState({ knobs: 4, faders: 2, buttons: 4, actions: 1 })
  const [selectedVisualMappingId, setSelectedVisualMappingId] = useState('')
  const [scriptName, setScriptName] = useState('M4L Remote Target')
  const [profileMessage, setProfileMessage] = useState('')
  const [uiTheme, setUiTheme] = useState(() => {
    if (typeof window === 'undefined') return 'terminal'
    const stored = window.localStorage.getItem('m4l-remote-mapper-theme')
    return stored === 'classic' ? 'classic' : 'terminal'
  })

  const parameterNames = useMemo(() => generateParameterNames(target), [target])
  const buttonNames = useMemo(() => generateButtonNames(target), [target])
  const scriptSlug = useMemo(() => createScriptSlug(scriptName || target.targetDeviceName), [scriptName, target.targetDeviceName])
  const customMappings = mappings.filter((mapping) => mapping.createdBy === 'custom_layout')
  const controlPool = useMemo(() => createM4LControlPool(controls, mappings), [controls, mappings])
  const mappingWarnings = useMemo(() => detectM4LMappingWarnings(mappings), [mappings])

  useEffect(() => {
    document.title = `M4L Remote Mapper — ${uiTheme === 'terminal' ? 'Terminal' : 'Classic'}`
    document.documentElement.dataset.uiTheme = uiTheme
    document.documentElement.classList.remove('theme-terminal', 'theme-classic')
    document.documentElement.classList.add(`theme-${uiTheme}`)
    window.localStorage.setItem('m4l-remote-mapper-theme', uiTheme)
    let stylesheet = document.getElementById('terminal-theme-stylesheet')
    if (!stylesheet) {
      stylesheet = document.createElement('link')
      stylesheet.id = 'terminal-theme-stylesheet'
      stylesheet.rel = 'stylesheet'
      stylesheet.href = `${import.meta.env.BASE_URL}terminal-edition.css`
      document.head.appendChild(stylesheet)
    }
    stylesheet.disabled = false
    stylesheet.media = 'all'
  }, [uiTheme])

  const refreshInputs = (access) => {
    const nextInputs = Array.from(access.inputs.values()).map((input) => ({
      id: input.id,
      name: input.name || 'Unnamed MIDI input',
      manufacturer: input.manufacturer || '',
      state: input.state,
    }))
    setInputs(nextInputs)
    setSelectedInputId((current) => current || nextInputs[0]?.id || '')
  }

  const enableMidi = async () => {
    if (!midiSupported) return
    setMidiStatus('requesting')
    setMidiError('')
    try {
      const access = await navigator.requestMIDIAccess({ sysex: false })
      midiAccessRef.current = access
      access.onstatechange = () => refreshInputs(access)
      refreshInputs(access)
      setMidiStatus('ready')
    } catch (error) {
      setMidiStatus('error')
      setMidiError(error?.message || 'MIDI permission was not granted.')
    }
  }

  useEffect(() => {
    const access = midiAccessRef.current
    if (!access) return undefined
    const input = access.inputs.get(selectedInputId)
    if (!input) return undefined

    const onMidiMessage = (event) => {
      const [status, data1, data2] = event.data
      if ((status & 0xf0) !== 0xb0) return
      const frameworkChannel = status & 0x0f
      const message = {
        endpointName: input.name || 'Unnamed MIDI input',
        type: 'CONTROLCHANGE',
        userChannel: frameworkChannel + 1,
        frameworkChannel,
        data1,
        data2,
        timestamp: event.timeStamp,
      }
      setLastMessage(message)
      const incomingControl = createControl(message.endpointName, frameworkChannel, data1, data2)
      setControls((current) => {
        const id = `${message.endpointName}-${frameworkChannel}-${data1}`
        const found = current.find((control) => control.id === id)
        if (found) return current.map((control) => control.id === id ? { ...control, lastValue: data2 } : control)
        return [...current, incomingControl]
      })
      setMappings((current) => {
        const liveMappings = updateM4LAssignedMidiValues(current, incomingControl, data2)
        return learningMappingId ? assignM4LMidiSource(liveMappings, learningMappingId, incomingControl) : liveMappings
      })
      if (learningMappingId) setLearningMappingId('')
    }

    input.onmidimessage = onMidiMessage
    return () => { input.onmidimessage = null }
  }, [selectedInputId, midiStatus, learningMappingId])

  const updateControl = (id, patch) => {
    setControls((current) => current.map((control) => control.id === id ? { ...control, ...patch } : control))
  }

  const updateMapping = (id, patch) => {
    setMappings((current) => current.map((mapping) => mapping.id === id ? { ...mapping, ...patch } : mapping))
  }

  const updateTargetContract = (patch) => {
    const nextTarget = { ...target, ...patch }
    const nextParameterNames = generateParameterNames(nextTarget)
    const nextButtonNames = generateButtonNames(nextTarget)
    setMappings((current) => current.map((mapping) => {
      if (mapping.targetType === 'm4l_parameter') {
        const currentIndex = Math.max(0, parameterNames.indexOf(mapping.targetParameterName))
        return {
          ...mapping,
          targetDeviceName: nextTarget.targetDeviceName,
          targetParameterName: nextParameterNames[currentIndex] || nextParameterNames[0],
          parameterIndex: Math.min(currentIndex, nextParameterNames.length - 1),
          parameterIndexMode: 'auto',
        }
      }
      if (mapping.targetType === 'm4l_button') {
        const currentIndex = Math.max(0, buttonNames.indexOf(mapping.targetButtonName))
        return {
          ...mapping,
          targetDeviceName: nextTarget.targetDeviceName,
          targetButtonName: nextButtonNames[currentIndex] || nextButtonNames[0],
          parameterIndex: Number(nextTarget.parameterCount) + Math.min(currentIndex, nextButtonNames.length - 1),
          parameterIndexMode: 'auto',
        }
      }
      return mapping
    }))
    setTarget(nextTarget)
  }

  const addMapping = (control) => {
    const isButton = control.controlKind === 'button'
    const names = isButton ? buttonNames : parameterNames
    const targetKey = isButton ? 'targetButtonName' : 'targetParameterName'
    const targetType = isButton ? 'm4l_button' : 'm4l_parameter'
    const usedTargets = new Set(mappings.filter((item) => item.targetType === targetType).map((item) => item[targetKey]))
    const targetIndex = Math.max(0, names.findIndex((name) => !usedTargets.has(name)))
    setMappings((current) => [...current, createMapping(control, target, parameterNames, buttonNames, targetIndex)])
    setActiveStep(4)
  }

  const buildCustomLayout = () => {
    const created = createCustomM4LLayout({ name: customLayoutName, ...customCounts, target, parameterNames, buttonNames })
    setMappings((current) => [...current, ...created.mappings])
    setCustomLayouts((current) => [...current, created.customLayout])
    setLayoutStack((current) => [...current, created.layoutEntry])
    setSelectedVisualMappingId(created.mappings[0]?.id || '')
  }

  const assignCustomSource = (mappingId, controlId) => {
    const source = controls.find((control) => control.id === controlId)
    setMappings((current) => assignM4LMidiSource(current, mappingId, source || null))
  }

  const customState = () => ({ customLayouts, layoutStack, mappings })
  const commitCustomState = (next) => { setCustomLayouts(next.customLayouts); setLayoutStack(next.layoutStack); setMappings(next.mappings) }
  const addVisualControl = (layoutInstanceId, kind) => {
    const next = addCustomM4LControl(customState(), { layoutInstanceId, kind, target, parameterNames, buttonNames })
    commitCustomState(next)
    setSelectedVisualMappingId(next.mappings.at(-1)?.id || '')
  }
  const removeVisualControl = (visualControlId) => {
    const next = removeCustomM4LControl(customState(), visualControlId)
    commitCustomState(next)
    setSelectedVisualMappingId(next.mappings.find((mapping) => mapping.createdBy === 'custom_layout')?.id || '')
  }
  const renameVisualLayout = (layoutInstanceId, name) => commitCustomState(renameCustomM4LLayout(customState(), layoutInstanceId, name))
  const updateVisualControl = (visualControlId, patch) => commitCustomState(updateCustomM4LControl(customState(), visualControlId, patch, { target, parameterNames, buttonNames }))

  const addPresetLayout = (preset) => {
    const created = createCustomM4LLayout({ name: preset.name, ...preset.counts, target, parameterNames, buttonNames })
    setMappings((current) => [...current, ...created.mappings])
    setCustomLayouts((current) => [...current, created.customLayout])
    setLayoutStack((current) => [...current, created.layoutEntry])
    setSelectedVisualMappingId(created.mappings[0]?.id || '')
  }

  const loadDemo = () => {
    const demo = createNanoKontrol2Demo()
    setTarget(demo.target)
    setControls(demo.controls)
    setMappings(demo.mappings)
    setCustomLayouts([])
    setLayoutStack([])
    setLastMessage({
      endpointName: 'nanoKONTROL2', type: 'CONTROLCHANGE', userChannel: 1,
      frameworkChannel: 0, data1: 45, data2: 127, timestamp: performance.now(),
    })
    setActiveStep(4)
  }

  const downloadPack = async (packTarget, packMappings, options = {}) => {
    setIsExporting(true)
    try {
      const { zip, scriptSlug: exportedSlug } = buildRemoteMapperPack({
        target: packTarget,
        mappings: packMappings,
        scriptSlug: options.scriptSlug || scriptSlug,
        customLayouts: options.customLayouts || customLayouts,
        controlPool: options.controlPool || controlPool,
        layoutStack: options.layoutStack || layoutStack,
        templates: {
          maxpat: maxForLivePatch,
          readme: maxForLiveReadme,
          parameterNames: maxForLiveParameterNames,
        },
      })
      const blob = await zip.generateAsync({ type: 'blob', platform: 'UNIX' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${exportedSlug}_Pack.zip`
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setLastExportedSlug(exportedSlug)
    } finally {
      setIsExporting(false)
    }
  }

  const exportPack = () => downloadPack(target, mappings)

  const exportKnownGoodTestPack = async () => {
    const demo = createNanoKontrol2Demo()
    setTarget(demo.target)
    setControls(demo.controls)
    setMappings(demo.mappings)
    setCustomLayouts([])
    setLayoutStack([])
    setActiveStep(5)
    await downloadPack(demo.target, demo.mappings, { scriptSlug: createScriptSlug(demo.target.targetDeviceName), customLayouts: [], controlPool: demo.controls, layoutStack: [] })
  }

  const exportProfile = () => {
    const profile = createPortableM4LProfile({ scriptName, target, mappings, controlPool, customLayouts, layoutStack })
    const blob = new Blob([`${JSON.stringify(profile, null, 2)}\n`], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = `${scriptSlug}_Profile.json`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const importProfile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const profile = parsePortableM4LProfile(await file.text())
      setScriptName(profile.scriptName || 'M4L Remote Target')
      setTarget(profile.target || DEFAULT_TARGET)
      setMappings(profile.mappings)
      setCustomLayouts(profile.customLayouts)
      setLayoutStack(profile.layoutStack)
      setControls(profile.controlPool.map(({ assignedMappingIds, ...control }) => control))
      setSelectedVisualMappingId(profile.mappings.find((mapping) => mapping.createdBy === 'custom_layout')?.id || '')
      setProfileMessage(`Imported ${file.name}`)
      setActiveStep(3)
    } catch (error) { setProfileMessage(error.message) }
    event.target.value = ''
  }

  const readiness = [
    Boolean(scriptSlug),
    controls.length > 0,
    Boolean(target.targetDeviceName && target.parameterCount > 0),
    customMappings.length > 0,
    mappings.length > 0,
    mappings.length > 0,
  ]

  return (
    <div className={`app-shell m4l-terminal-edition ascii-shell theme-${uiTheme}`} data-theme={uiTheme}>
      <div className="ambient-grid" />
      <header className="topbar ascii-boot-header ascii-terminal">
        <div className="terminal-title-line"><a className="brand" href="#top" aria-label="M4L Remote Mapper home">| M4L REMOTE MAPPER TERMINAL</a><span>v0.1 |</span></div>
        <div className="terminal-boot-command">C:\&gt; RUN M4L_REMOTE_MAPPER.EXE <span className="ascii-cursor">_</span></div>
        <div className="terminal-status-grid"><span>&gt; STATUS: READY</span><span>&gt; MODE: MAX_FOR_LIVE_REMOTE_SCRIPT</span><span>&gt; TARGET: {target.targetDeviceName}</span><span>&gt; MIDI_API: WEB_MIDI</span><span>&gt; EXPORT: ZIP_PACK</span><span>&gt; BUILD: LOCAL_ONLY</span></div>
        <div className="terminal-header-commands"><nav className="mapper-switcher" aria-label="Mapper type"><a href="/" className="active">[ M4L MAPPER ]</a><a href="/ableton-device-mapper">[ ABLETON MAPPER ]</a></nav><ThemeSwitcher theme={uiTheme} setTheme={setUiTheme}/><button className="demo-button ascii-button" aria-label="Load nanoKONTROL2 full demo" onClick={loadDemo}>LOAD NANOKONTROL2 DEMO</button></div>
      </header>

      <main id="top">
        <section className="terminal-intro ascii-window" aria-label="M4L Remote Mapper terminal introduction">
          <span className="terminal-intro__rule">+---------------- M4L REMOTE MAPPER / ASCII CONTROL TERMINAL ----------------+</span>
          <div><strong>WIRE MIDI.</strong><strong>CONTROL MAX FOR LIVE.</strong><strong>COMPILE REMOTE SCRIPT.</strong></div>
          <span className="terminal-intro__meta">[ TARGET:{target.targetDeviceName} ] [ ROUTES:{String(mappings.length).padStart(2, '0')} ] [ BUILD:LOCAL_ONLY ]</span>
          <span className="terminal-intro__rule">+----------------------------------------------------------------------------+</span>
        </section>
        <nav className="stepper stepper--m4l-five" aria-label="Build steps">
          {STEP_LABELS.map((label, index) => (
            <button key={label} className={`step ${activeStep === index ? 'step--active' : ''}`} onClick={() => setActiveStep(index)}>
              <span className="step__number">0{index + 1}</span>
              <span className="step__icon"><Icon name={['layout', 'midi', 'target', 'layout', 'route', 'export'][index]} /></span>
              <span className="step__label">{label}</span>
              <Badge status={readiness[index] ? 'ready' : 'missing'}>{readiness[index] ? 'READY' : 'MISSING'}</Badge>
            </button>
          ))}
        </nav>

        <section className="workspace">
          {activeStep === 0 && <article className="panel script-name-panel">
            <PanelHeader index="01" title="Script Name" subtitle="Name the Control Surface shown in Ableton Live."/>
            <div className="script-name-console"><label className="field"><span>SCRIPT_NAME</span><input aria-label="M4L script name" value={scriptName} onChange={(event) => setScriptName(event.target.value)} placeholder="M4L NanoKontrol Remote"/></label><div><span>ABLETON_SAFE_NAME:</span><strong>[ {scriptSlug} ]</strong></div><div><span>PYTHON_TARGET:</span><strong>[ {target.targetDeviceName} ]</strong></div></div>
            <div className="panel-actions"><button className="primary-button" onClick={() => setActiveStep(1)}>CONNECT CONTROLLER</button></div>
          </article>}

          {activeStep === 1 && (
            <div className="panel-layout">
              <article className="panel panel--primary">
                <PanelHeader index="02" title="Connect Controller" subtitle="Listen to CONTROL CHANGE messages through Web MIDI." />
                <div className="status-strip">
                  <div><span>WEB MIDI</span><Badge status={midiSupported ? 'ready' : 'missing'}>{midiSupported ? 'AVAILABLE' : 'UNAVAILABLE'}</Badge></div>
                  <div><span>ACCESS</span><Badge status={midiStatus === 'ready' ? 'ready' : 'missing'}>{midiStatus === 'ready' ? 'ENABLED' : 'LOCKED'}</Badge></div>
                  <div><span>CONTROLS</span><strong>{String(controls.length).padStart(2, '0')}</strong></div>
                </div>
                <div className="connect-row">
                  <button className="primary-button" onClick={enableMidi} disabled={!midiSupported || midiStatus === 'requesting'}>
                    {midiStatus === 'requesting' ? 'REQUESTING MIDI ACCESS' : 'ENABLE MIDI'}
                  </button>
                  <label className="field field--grow">
                    <span>MIDI INPUT</span>
                    <select value={selectedInputId} onChange={(event) => setSelectedInputId(event.target.value)} disabled={!inputs.length}>
                      {!inputs.length && <option>No input detected</option>}
                      {inputs.map((input) => <option value={input.id} key={input.id}>{input.name}</option>)}
                    </select>
                  </label>
                </div>
                {midiError && <p className="error-note">{midiError}</p>}
                <MessageMonitor message={lastMessage} />
              </article>

              <aside className="panel">
                <PanelHeader title="Detected controls" subtitle="Move a knob, fader, or button." compact />
                <ControlList controls={controls} updateControl={updateControl} addMapping={addMapping} />
              </aside>
            </div>
          )}

          {activeStep === 2 && (
            <article className="panel target-panel">
              <PanelHeader index="03" title="Max for Live Target" subtitle="Define the public parameter contract for your device." />
              <div className="target-grid">
                <div className="target-form">
                  <label className="field"><span>TARGET DEVICE NAME</span><input value={target.targetDeviceName} onChange={(event) => updateTargetContract({ targetDeviceName: event.target.value })} /></label>
                  <div className="field-pair">
                    <label className="field"><span>PARAMETER COUNT</span><input type="number" min="1" max="8" value={target.parameterCount} onChange={(event) => updateTargetContract({ parameterCount: Number(event.target.value) })} /></label>
                    <label className="field"><span>PARAMETER PREFIX</span><input value={target.parameterPrefix} onChange={(event) => updateTargetContract({ parameterPrefix: event.target.value })} /></label>
                  </div>
                  <div className="field-pair">
                    <label className="field"><span>BUTTON COUNT</span><input type="number" min="1" max="8" value={target.buttonCount || 8} onChange={(event) => updateTargetContract({ buttonCount: Number(event.target.value) })} /></label>
                    <label className="field"><span>BUTTON PREFIX</span><input value={target.buttonPrefix || 'M4L Button'} onChange={(event) => updateTargetContract({ buttonPrefix: event.target.value })} /></label>
                  </div>
                  <div className="hardware-note"><span>!</span><p>The Max for Live device must contain <code>live.dial</code> / <code>live.toggle</code> controls with these exact names in <strong>Long Name</strong>.</p></div>
                </div>
                <div className="target-contract-terminal ascii-window"><strong>+---------------- MAX FOR LIVE TARGET ----------------+</strong><span>| DEVICE: {target.targetDeviceName}</span><span>| PARAMS: {parameterNames[0]} ... {parameterNames.at(-1)}</span><span>| BUTTONS: {buttonNames[0]} ... {buttonNames.at(-1)}</span><span>| ACTIONS: Capture MIDI</span><span>| RESOLVE: NAME + ALIASES / INDEX_FALLBACK: OFF</span><strong>+-------------------------------------------------------+</strong><div className="target-name-list"><span>PARAMETERS:</span>{parameterNames.map((name, index) => <code key={name}>| P{String(index + 1).padStart(2, '0')} {name}</code>)}<span>BUTTONS:</span>{buttonNames.map((name, index) => <code key={name}>| B{String(index + 1).padStart(2, '0')} {name}</code>)}</div></div>
              </div>
              <div className="scaling-note"><Icon name="signal" /><p>MIDI sends 0–127, but Ableton parameters can use any range. M4L Remote Mapper scales MIDI values to the target parameter range automatically.</p></div>
              <div className="panel-actions"><button className="primary-button" onClick={() => setActiveStep(3)}>CREATE CUSTOM LAYOUT</button></div>
            </article>
          )}

          {activeStep === 3 && (
            <article className="panel m4l-custom-layout-panel">
              <PanelHeader index="04" title="Custom M4L MIDI Layout" subtitle="Create modules, learn MIDI, then edit each M4L route." />
              <div className="custom-layout-creator"><label className="field custom-name-field"><span>LAYOUT</span><input aria-label="M4L custom layout name" value={customLayoutName} onChange={(event) => setCustomLayoutName(event.target.value)}/></label>{[['knobs','KNOBS'],['faders','FADERS'],['buttons','BUTTONS'],['actions','ACTIONS']].map(([key,label]) => <label className="field" key={key}><span>{label}</span><input aria-label={`M4L number of ${key}`} type="number" min="0" max="32" value={customCounts[key]} onChange={(event) => setCustomCounts((current) => ({ ...current, [key]: event.target.value }))}/></label>)}<button className="primary-button" onClick={buildCustomLayout}>CREATE CUSTOM LAYOUT</button></div>
              <M4LControllerLayoutPreview customLayouts={customLayouts} mappings={mappings} warnings={mappingWarnings} selectedMappingId={selectedVisualMappingId} learningMappingId={learningMappingId} parameterNames={parameterNames} buttonNames={buttonNames} onSelect={setSelectedVisualMappingId} onLearn={(id) => { setSelectedVisualMappingId(id); setLearningMappingId((current) => current === id ? '' : id) }} onUnassign={(id) => assignCustomSource(id, '')} onAddControl={addVisualControl} onRemoveControl={removeVisualControl} onRenameLayout={renameVisualLayout} onUpdateControl={updateVisualControl} onUpdateMapping={updateMapping}/>
              <details className="m4l-preset-panel"><summary>+---------------- PRESET M4L LAYOUTS ----------------+ <span>HIDDEN</span></summary><div className="preset-command-list">{[
                { name: '4 Params Basic', counts: { knobs: 4, faders: 0, buttons: 0, actions: 0 } },
                { name: '8 Params Full', counts: { knobs: 8, faders: 0, buttons: 0, actions: 0 } },
                { name: '4 Buttons', counts: { knobs: 0, faders: 0, buttons: 4, actions: 0 } },
                { name: 'Params + Buttons Demo', counts: { knobs: 4, faders: 0, buttons: 4, actions: 1 } },
              ].map((preset) => <div key={preset.name}><span>&gt; {preset.name.toUpperCase()}</span><button onClick={() => addPresetLayout(preset)}>[ ADD ]</button><button onClick={() => setCustomCounts(preset.counts)}>[ VIEW ]</button></div>)}</div></details>
              <div className="panel-actions"><button className="primary-button" disabled={!mappings.length} onClick={() => setActiveStep(4)}>OPEN MAPPING MATRIX</button></div>
            </article>
          )}

          {activeStep === 4 && (
            <article className="panel mapping-panel">
              <PanelHeader index="05" title="Mapping Matrix" subtitle="Inspect every source, M4L target, mode, and route status." />
              <div className="mapping-toolbar">
                <span>{mappings.length} ACTIVE ROUTE{mappings.length === 1 ? '' : 'S'}</span>
                <select onChange={(event) => { const control = controls.find((item) => item.id === event.target.value); if (control) addMapping(control); event.target.value = '' }} defaultValue="">
                  <option value="" disabled>+ Add detected control</option>
                  {controls.map((control) => <option key={control.id} value={control.id}>{control.endpointName} · CH {control.userChannel} · CC {control.data1}</option>)}
                </select>
              </div>
              <div className="profile-toolbar"><button className="secondary-button" onClick={exportProfile}>EXPORT PROFILE JSON</button><button className="secondary-button" onClick={() => importInputRef.current?.click()}>IMPORT PROFILE JSON</button><input ref={importInputRef} type="file" accept="application/json,.json" hidden onChange={importProfile}/></div>
              {profileMessage && <p className="profile-message">&gt; {profileMessage}</p>}
              <MappingTable mappings={mappings} updateMapping={updateMapping} removeMapping={(id) => setMappings((current) => current.filter((mapping) => mapping.id !== id))} parameterNames={parameterNames} buttonNames={buttonNames} target={target} warnings={mappingWarnings} />
              {!mappings.length && <EmptyState title="No routes patched" body="Detect a MIDI control in Step 1, or load the nanoKONTROL2 demo." />}
              <div className="panel-actions"><button className="primary-button" disabled={!mappings.some((mapping) => mapping.source)} onClick={() => setActiveStep(5)}>REVIEW EXPORT PACK</button></div>
            </article>
          )}

          {activeStep === 5 && (
            <article className="panel export-panel">
              <PanelHeader index="06" title="Export ZIP Pack" subtitle="Compile locally. No upload, account, or backend." />
              <div className="export-terminal-summary ascii-window"><strong>+----------------------- EXPORT ZIP PACK -----------------------+</strong><span>| SCRIPT: {scriptSlug}</span><span>| DEVICE: {target.targetDeviceName}</span><span>| PARAMS: {String(mappings.filter((item) => item.targetType === 'm4l_parameter').length).padStart(2, '0')}</span><span>| BUTTONS: {String(mappings.filter((item) => item.targetType === 'm4l_button').length).padStart(2, '0')}</span><span>| ACTIONS: {String(mappings.filter((item) => item.targetType === 'global_action').length).padStart(2, '0')}</span><span>| STATUS: {mappings.some((item) => item.source) ? 'READY' : 'WAITING_FOR_MIDI_ROUTES'}</span><strong>+---------------------------------------------------------------+</strong></div>
              <div className="export-command-row"><button className="export-button" onClick={exportPack} disabled={!mappings.length || isExporting}>{isExporting ? 'BUILDING ZIP PACK' : 'EXPORT ZIP PACK'}</button><button className="secondary-button" onClick={exportKnownGoodTestPack} disabled={isExporting}>GENERATE KNOWN-GOOD NANOKONTROL2 TEST PACK</button></div>
              <FileTree scriptSlug={scriptSlug} />
              {lastExportedSlug && <SetupWizard key={lastExportedSlug} scriptSlug={lastExportedSlug} inputName={inputs.find((input) => input.id === selectedInputId)?.name || 'nanoKONTROL2 SLIDER/KNOB'} />}
            </article>
          )}
        </section>
      </main>

      <footer><span>M4L REMOTE MAPPER TERMINAL EDITION / CONTROL STATION</span><span>DESIGN · LEARN · ROUTE · COMPILE</span><a href="https://deerflow.tech" target="_blank" rel="noreferrer">Created By Deerflow ↗</a></footer>
    </div>
  )
}

function ThemeSwitcher({ theme, setTheme }) {
  return <div className="m4l-theme-switcher" role="group" aria-label="M4L interface theme"><span>THEME:</span><button type="button" className={theme === 'terminal' ? 'active' : ''} aria-pressed={theme === 'terminal'} onClick={() => setTheme('terminal')}>[ TERMINAL ]</button><button type="button" className={theme === 'classic' ? 'active' : ''} aria-pressed={theme === 'classic'} onClick={() => setTheme('classic')}>[ CLASSIC ]</button></div>
}

function PanelHeader({ index, title, subtitle, compact = false }) {
  return <div className={`panel-header ascii-frame-header ${compact ? 'panel-header--compact' : ''}`}><span className="ascii-frame-rule" aria-hidden="true">+----------------------------------------------------------------------------+</span><div className="ascii-frame-heading">{index && <span className="panel-index">| {index}</span>}<div><h2>{title}</h2><p>| {subtitle}</p></div><span aria-hidden="true">|</span></div><span className="ascii-frame-rule" aria-hidden="true">+----------------------------------------------------------------------------+</span></div>
}

function MessageMonitor({ message }) {
  const fields = message ? [
    ['ENDPOINT', message.endpointName], ['TYPE', message.type], ['USER CH', message.userChannel],
    ['FRAMEWORK CH', message.frameworkChannel], ['DATA 1 / CC', message.data1], ['DATA 2 / VALUE', message.data2],
    ['TIMESTAMP', `${message.timestamp.toFixed(1)} ms`],
  ] : []
  return <div className={`message-monitor ${message ? 'message-monitor--live' : ''}`}>
    <div className="monitor-heading"><span><i /> LAST MIDI MESSAGE</span>{message && <Badge status="captured">CAPTURED</Badge>}</div>
    {message ? <div className="message-fields">{fields.map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div> : <EmptyState title="Listening for CONTROL CHANGE" body="Move a hardware control after enabling MIDI." />}
  </div>
}

function ControlList({ controls, updateControl, addMapping }) {
  if (!controls.length) return <EmptyState title="No controls yet" body="Incoming CC messages will collect here." />
  return <div className="control-list">{controls.map((control) => <div className="control-card" key={control.id}>
    <div className="control-card__top"><span className="cc-chip">CC {control.data1}</span><span className="value-meter"><i style={{ width: `${control.lastValue / 127 * 100}%` }} /></span><strong>{control.lastValue}</strong></div>
    <input className="inline-input" value={control.label} onChange={(event) => updateControl(control.id, { label: event.target.value })} aria-label={`Label for CC ${control.data1}`} />
    <div className="control-card__meta"><span>CH {control.userChannel}</span><select value={control.controlKind} onChange={(event) => updateControl(control.id, { controlKind: event.target.value })}><option value="unknown">unknown</option><option value="knob">knob</option><option value="fader">fader</option><option value="button">button</option></select><button onClick={() => addMapping(control)}>MAP →</button></div>
  </div>)}</div>
}

function MappingTable({ mappings, updateMapping, removeMapping, parameterNames, buttonNames, target, warnings = [] }) {
  if (!mappings.length) return null
  const changeTargetType = (mapping, targetType) => {
    if (targetType === 'm4l_parameter') {
      updateMapping(mapping.id, { targetType, controlType: 'continuous', targetParameterName: parameterNames[0], parameterIndex: 0, parameterIndexMode: 'auto', allowIndexFallback: false, scaling: 'parameter_min_max' })
    } else if (targetType === 'm4l_button') {
      updateMapping(mapping.id, { targetType, controlType: 'button', targetButtonName: buttonNames[0], parameterIndex: Number(target.parameterCount), parameterIndexMode: 'auto', allowIndexFallback: false, buttonMode: mapping.buttonMode || 'toggle_in_script' })
    } else {
      updateMapping(mapping.id, { targetType, controlType: 'button', actionName: 'Capture MIDI', buttonMode: 'trigger', triggerMode: 'value_eq_127' })
    }
  }
  return <div className="mapping-table terminal-mapping-matrix"><div className="mapping-head"><span>ID</span><span>SOURCE</span><span>TYPE</span><span>TARGET</span><span>MODE</span><span>STATUS</span></div>
    {mappings.map((mapping, index) => { const rowWarnings = warnings.filter((warning) => warning.mappingIds.includes(mapping.id)); return <div className={`mapping-row ${rowWarnings.length ? 'mapping-row--warning' : ''}`} key={mapping.id}>
      <span className="mapping-sequence">{String(index + 1).padStart(3, '0')}</span>
      <div className="source-cell"><span className="cc-chip">{mapping.source ? `CC ${mapping.source.data1}` : 'LEARN'}</span><div><strong>{mapping.visualControlLabel || mapping.source?.label || mapping.userLabel || 'MIDI control'}</strong><small>{mapping.source ? `CH ${mapping.source.userChannel}` : 'UNASSIGNED'}</small></div></div>
      <select value={mapping.targetType} onChange={(event) => changeTargetType(mapping, event.target.value)}><option value="m4l_parameter">M4L parameter</option><option value="m4l_button">M4L button</option><option value="global_action">Global action</option></select>
      {mapping.targetType === 'm4l_parameter' ? <div className="target-cell"><input value={mapping.targetDeviceName} onChange={(event) => updateMapping(mapping.id, { targetDeviceName: event.target.value })} aria-label="Target device name" /><select value={mapping.targetParameterName} onChange={(event) => { const parameterIndex = parameterNames.indexOf(event.target.value); updateMapping(mapping.id, { targetParameterName: event.target.value, parameterIndex, parameterIndexMode: 'auto' }) }}>{parameterNames.map((name) => <option key={name}>{name}</option>)}</select><FallbackIndexControl mapping={mapping} target={target} updateMapping={updateMapping} /></div>
        : mapping.targetType === 'm4l_button' ? <div className="target-cell target-cell--button"><input value={mapping.targetDeviceName} onChange={(event) => updateMapping(mapping.id, { targetDeviceName: event.target.value })} aria-label="Target device name" /><select value={mapping.targetButtonName} onChange={(event) => { const buttonIndex = buttonNames.indexOf(event.target.value); updateMapping(mapping.id, { targetButtonName: event.target.value, parameterIndex: Number(target.parameterCount) + buttonIndex, parameterIndexMode: 'auto' }) }}>{buttonNames.map((name) => <option key={name}>{name}</option>)}</select><FallbackIndexControl mapping={mapping} target={target} updateMapping={updateMapping} /></div>
          : <div className="target-cell target-cell--action"><select value={mapping.actionName} onChange={(event) => updateMapping(mapping.id, { actionName: event.target.value })}><option>Capture MIDI</option></select></div>}
      <div className="matrix-mode">{mapping.targetType === 'm4l_parameter' ? <select aria-label="Mapping scaling" value={mapping.scaling || 'parameter_min_max'} onChange={(event) => updateMapping(mapping.id, { scaling: event.target.value })}><option value="parameter_min_max">SCALE</option><option value="inverted_parameter_min_max">INVERTED</option></select> : mapping.targetType === 'm4l_button' ? <select className="button-mode-select" aria-label="Button behavior" value={mapping.buttonMode || 'toggle_in_script'} onChange={(event) => updateMapping(mapping.id, { buttonMode: event.target.value })}><option value="toggle_in_script">SCRIPT_TOGGLE</option><option value="momentary">MOMENTARY</option><option value="toggle_from_input">INPUT_TOGGLE</option><option value="trigger">TRIGGER</option></select> : <select aria-label="Action trigger" value={mapping.triggerMode || 'value_eq_127'} onChange={(event) => updateMapping(mapping.id, { triggerMode: event.target.value })}><option value="value_eq_127">TRIGGER / 127</option></select>}</div>
      <div className="matrix-status"><strong>{rowWarnings.length ? 'WARN' : 'OK'}</strong><small>{mapping.targetType === 'global_action' ? 'TRIGGER' : mapping.controlType === 'button' ? (mapping.buttonMode || 'toggle_in_script').toUpperCase() : 'SCALE'}</small><button className="icon-button" onClick={() => removeMapping(mapping.id)} aria-label="Remove mapping"><Icon name="trash" /></button></div>
    </div>})}
    <div className="mapping-footer"><span>TARGET CONTRACT</span><strong>{target.targetDeviceName}</strong><span>{parameterNames.length} CONTINUOUS · {buttonNames.length} BUTTONS</span></div>
  </div>
}

function FallbackIndexControl({ mapping, target, updateMapping }) {
  const automaticIndex = resolveMappingParameterIndex({ ...mapping, parameterIndex: '' }, target)
  const manual = mapping.parameterIndexMode === 'manual'
  const fallbackEnabled = mapping.allowIndexFallback === true
  return <details className="advanced-index">
    <summary><strong className={fallbackEnabled ? 'fallback-state fallback-state--enabled' : 'fallback-state'}>{fallbackEnabled ? 'Index fallback enabled' : 'Name match only'}</strong><span>Advanced</span></summary>
    <label className="fallback-opt-in"><input type="checkbox" checked={fallbackEnabled} onChange={(event) => updateMapping(mapping.id, { allowIndexFallback: event.target.checked })} /><span><strong>Allow index fallback if name is missing</strong><small>Recommended: keep disabled. Name matching is safer for Max for Live devices.</small></span></label>
    <div className="fallback-index-editor">
      <label>FALLBACK INDEX: {manual ? 'MANUAL' : 'AUTO'} <input type="number" min="0" value={manual ? mapping.parameterIndex : automaticIndex} onChange={(event) => updateMapping(mapping.id, { parameterIndex: Number(event.target.value), parameterIndexMode: 'manual' })} /></label>
      <button type="button" onClick={() => updateMapping(mapping.id, { parameterIndex: automaticIndex, parameterIndexMode: 'auto' })}>Use auto</button>
    </div>
    <p>Resolved by name first. Fallback index is only used if the exact parameter name is not found.</p>
  </details>
}

function EmptyState({ title, body }) {
  return <div className="empty-state"><span className="pulse-ring"><i /></span><div><strong>{title}</strong><p>{body}</p></div></div>
}

function FileTree({ scriptSlug }) {
  return <div className="file-tree"><div className="file-tree__head"><span>ZIP CONTENTS</span><Badge status="ready">9 FILES</Badge></div><pre>{`M4L_Remote_Mapper_Pack/
├── 1_COPY_THIS_FOLDER_TO_REMOTE_SCRIPTS/
│   └── ${scriptSlug}/
│       ├── __init__.py
│       ├── ${scriptSlug}.py
│       └── profile.json
├── 2_OPEN_THIS_MAX_FOR_LIVE_DEVICE/
│   └── M4L-Remote-Target/
│       ├── M4L-Remote-Target.maxpat
│       ├── README.md
│       └── PARAMETER_NAMES.md
├── 3_READ_ME_FIRST.md
├── INSTALL_CHECK.command
└── TROUBLESHOOTING.md`}</pre></div>
}

const SETUP_STEPS = [
  ['download', 'Download ZIP', 'Keep the newest pack and discard older downloads with the same name.'],
  ['unzip', 'Unzip pack', 'Open the archive before copying anything into Ableton.'],
  ['copy', 'Copy only the Remote Script folder', 'Use the folder inside 1_COPY_THIS_FOLDER_TO_REMOTE_SCRIPTS.'],
  ['paste', 'Paste into the User Library', 'Destination: ~/Music/Ableton/User Library/Remote Scripts/'],
  ['remove', 'Remove the old script if needed', 'Replace the whole folder; do not merge old and new files.'],
  ['restart', 'Restart Ableton', 'Live discovers Remote Scripts only during startup.'],
  ['surface', 'Select the generated Control Surface', 'Choose the exact script name shown below.'],
  ['input', 'Select the MIDI Input', 'Use nanoKONTROL2 SLIDER/KNOB or the port captured in Step 1.'],
  ['output', 'Set Output to None', 'The generated pack does not need a MIDI output port.'],
  ['device', 'Load M4L-Remote-Target', 'The device name must match exactly, including hyphens.'],
  ['cc16', 'Test CC16 / M4L Param 1', 'Knob 1 should move the first visible monitor.'],
  ['cc32', 'Test CC32 / M4L Button 1', 'The first button toggles its internal ON/OFF state on press.'],
  ['cc45', 'Test CC45 / Capture MIDI', 'Capture triggers only when CC45 sends the full value 127.'],
]

function SetupWizard({ scriptSlug, inputName }) {
  const [checked, setChecked] = useState(() => new Set(['download']))
  const [copied, setCopied] = useState('')
  const commands = useMemo(() => createTerminalCommands(scriptSlug), [scriptSlug])
  const progress = Math.round((checked.size / SETUP_STEPS.length) * 100)
  const stepTitles = {
    remove: `Remove old ${scriptSlug} if needed`,
    surface: `Select Control Surface: ${scriptSlug}`,
    input: `Select Input: ${inputName}`,
    output: 'Output: None',
    device: 'Load M4L-Remote-Target device',
  }

  const toggleStep = (id) => {
    setChecked((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const copyCommand = async (command, id) => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(id)
      window.setTimeout(() => setCopied(''), 1600)
    } catch {
      setCopied('error')
    }
  }

  return <section className="setup-wizard" aria-labelledby="setup-wizard-title">
    <div className="wizard-heading">
      <div><span className="panel-index">05</span><div><h2 id="setup-wizard-title">Setup Wizard</h2><p>Commission the pack in order. Tiny details matter here.</p></div></div>
      <div className="wizard-progress"><span>{checked.size}/{SETUP_STEPS.length} COMPLETE</span><div><i style={{ width: `${progress}%` }} /></div></div>
    </div>
    <div className="wizard-config">
      <div><small>CONTROL SURFACE</small><strong>{scriptSlug}</strong></div>
      <div><small>INPUT</small><strong>{inputName}</strong></div>
      <div><small>OUTPUT</small><strong>None</strong></div>
    </div>
    <div className="button-mode-guide">
      <div><strong>Momentary</strong><span>Press = max · release = min</span></div>
      <div><strong>Toggle from input</strong><span>Follow the hardware ON/OFF value</span></div>
      <div><strong>Toggle in script</strong><span>Each value-127 press flips state</span></div>
      <div><strong>Trigger</strong><span>Value 127 only · release ignored</span></div>
    </div>
    <div className="setup-grid">
      {SETUP_STEPS.map(([id, title, help], index) => <button key={id} className={`setup-step ${checked.has(id) ? 'setup-step--done' : ''}`} onClick={() => toggleStep(id)}>
        <span className="setup-check">{checked.has(id) ? '✓' : String(index + 1).padStart(2, '0')}</span>
        <span><strong>{stepTitles[id] || title}</strong><small>{help}</small></span>
      </button>)}
    </div>
    <div className="terminal-tools">
      <div className="terminal-tools__heading"><span>MACOS TERMINAL TOOLS</span><small>Copy only when you need to clean or inspect an installation.</small></div>
      {commands.map((item) => <div className="command-block" key={item.id}>
        <div><span>{item.label}</span><button onClick={() => copyCommand(item.command, item.id)}>{copied === item.id ? 'COPIED ✓' : 'COPY'}</button></div>
        <pre>{item.command}</pre>
      </div>)}
      {copied === 'error' && <p className="copy-error">Clipboard access failed. Select the command manually.</p>}
    </div>
  </section>
}

export default App

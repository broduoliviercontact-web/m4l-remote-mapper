import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

import {
  assignM4LMidiSource,
  createCustomM4LLayout,
  createPortableM4LProfile,
  detectM4LMappingWarnings,
  parsePortableM4LProfile,
} from '../client/src/utils/customM4LLayoutBuilder.js'
import { generateRemoteScriptFiles } from '../client/src/generators/remoteScriptGenerator.js'
import { DEFAULT_SHARED_THEME, readSharedTheme, SHARED_THEME_KEY, writeSharedTheme } from '../client/src/utils/sharedTheme.js'

const target = { targetDeviceName: 'M4L-Remote-Target', parameterCount: 8, parameterPrefix: 'M4L Param', buttonCount: 8, buttonPrefix: 'M4L Button' }
const parameterNames = Array.from({ length: 8 }, (_, index) => `M4L Param ${index + 1}`)
const buttonNames = Array.from({ length: 8 }, (_, index) => `M4L Button ${index + 1}`)

const createLayout = () => {
  let id = 0
  return createCustomM4LLayout({
    name: 'My M4L Performance Layout', knobs: 4, faders: 2, buttons: 4, actions: 1,
    target, parameterNames, buttonNames, idFactory: (prefix) => `${prefix}-${++id}`,
  })
}

test('Custom M4L layout creates 4 knobs, 2 faders, 4 buttons and one Capture MIDI action', () => {
  const created = createLayout()
  assert.equal(created.mappings.length, 11)
  assert.deepEqual(created.mappings.map((mapping) => mapping.visualControlKind), ['knob', 'knob', 'knob', 'knob', 'fader', 'fader', 'button', 'button', 'button', 'button', 'action'])
  assert.ok(created.mappings.slice(0, 6).every((mapping) => mapping.controlType === 'continuous' && mapping.targetType === 'm4l_parameter'))
  assert.deepEqual(created.mappings.slice(0, 6).map((mapping) => mapping.targetParameterName), parameterNames.slice(0, 6))
  assert.ok(created.mappings.slice(6, 10).every((mapping) => mapping.controlType === 'button' && mapping.targetType === 'm4l_button' && mapping.buttonMode === 'toggle_in_script'))
  const action = created.mappings.at(-1)
  assert.equal(action.targetType, 'global_action')
  assert.equal(action.actionName, 'Capture MIDI')
  assert.equal(action.buttonMode, 'trigger')
  assert.equal(action.triggerMode, 'value_eq_127')
  assert.ok(created.mappings.every((mapping) => mapping.createdBy === 'custom_layout' && mapping.layoutId === 'custom-m4l-layout'))
  assert.ok(created.mappings.every((mapping) => mapping.visualControlId && mapping.visualControlKind && mapping.visualControlLabel && mapping.layoutInstanceId))
  assert.equal(created.customLayout.mapperType, 'm4l_remote')
})

test('visual Learn MIDI assigns the intended CC and reports duplicate MIDI without blocking reassignment', () => {
  const created = createLayout()
  const source = { id: 'controller-0-16', endpointName: 'Controller', userChannel: 1, frameworkChannel: 0, data1: 16, lastValue: 100, label: 'CC 16', controlKind: 'knob' }
  let mappings = assignM4LMidiSource(created.mappings, created.mappings[0].id, source)
  assert.equal(mappings[0].source.data1, 16)
  mappings = assignM4LMidiSource(mappings, mappings[1].id, source)
  const duplicate = detectM4LMappingWarnings(mappings).find((warning) => warning.type === 'duplicate_midi_source')
  assert.deepEqual(duplicate.mappingIds, [mappings[0].id, mappings[1].id])
  const replacement = { ...source, id: 'controller-0-17', data1: 17, label: 'CC 17' }
  mappings = assignM4LMidiSource(mappings, mappings[1].id, replacement)
  assert.equal(detectM4LMappingWarnings(mappings).some((warning) => warning.type === 'duplicate_midi_source'), false)
})

test('portable profile and generated profile preserve customLayouts and visual metadata', () => {
  const created = createLayout()
  const controlPool = [{ id: 'controller-0-16', endpointName: 'Controller', userChannel: 1, frameworkChannel: 0, data1: 16, lastValue: 0, label: 'CC 16', controlKind: 'knob' }]
  const portable = createPortableM4LProfile({ scriptName: 'M4L Performance', target, mappings: created.mappings, controlPool, customLayouts: [created.customLayout], layoutStack: [created.layoutEntry] })
  const restored = parsePortableM4LProfile(JSON.stringify(portable))
  assert.equal(restored.customLayouts[0].layoutName, 'My M4L Performance Layout')
  assert.equal(restored.customLayouts[0].controls.length, 11)
  assert.equal(restored.mappings.at(-1).actionName, 'Capture MIDI')

  const files = generateRemoteScriptFiles({ target, mappings: created.mappings, customLayouts: [created.customLayout], controlPool, layoutStack: [created.layoutEntry] })
  const profile = JSON.parse(files['profile.json'])
  assert.equal(profile.mapperType, 'm4l_remote')
  assert.equal(profile.customLayouts[0].controllerLayoutType, 'custom_grid')
  assert.equal(profile.mappings[0].visualControlLabel, 'Knob 1')
  assert.equal(profile.mappings.at(-1).visualControlKind, 'action')
})

test('assigned custom layout still generates safe compilable Python with button and Capture MIDI logic', async () => {
  const created = createLayout()
  let mappings = created.mappings
  for (let index = 0; index < mappings.length; index += 1) {
    mappings = assignM4LMidiSource(mappings, mappings[index].id, { id: `controller-0-${16 + index}`, endpointName: 'Controller', userChannel: 1, frameworkChannel: 0, data1: 16 + index, lastValue: 0, label: `CC ${16 + index}`, controlKind: mappings[index].preferredControlKind })
  }
  const files = generateRemoteScriptFiles({ target, mappings, customLayouts: [created.customLayout] })
  const script = files[`${files.scriptSlug}.py`]
  assert.match(script, /def _apply_button_mapping\(self, mapping, value, parameter\):/)
  assert.match(script, /self\.song\(\)\.capture_midi\(\)/)
  assert.doesNotMatch(script, /self\.log_message\(/)
  assert.doesNotMatch(script, /def receive_midi\(/)
  const directory = await mkdtemp(path.join(tmpdir(), 'm4l-terminal-layout-'))
  try {
    const file = path.join(directory, `${files.scriptSlug}.py`)
    await writeFile(file, script, 'utf8')
    const result = spawnSync('python3', ['-m', 'py_compile', file], { encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
  } finally { await rm(directory, { recursive: true, force: true }) }
})

test('Terminal UI exposes the M4L preview, actions, presets and profile controls', async () => {
  const root = process.cwd()
  const app = await readFile(path.join(root, 'client/src/App.jsx'), 'utf8')
  const abletonApp = await readFile(path.join(root, 'client/src/AbletonDeviceMapper.jsx'), 'utf8')
  const main = await readFile(path.join(root, 'client/src/main.jsx'), 'utf8')
  const vercel = await readFile(path.join(root, 'vercel.json'), 'utf8')
  const preview = await readFile(path.join(root, 'client/src/components/M4LControllerLayoutPreview.jsx'), 'utf8')
  const css = await readFile(path.join(root, 'client/public/terminal-edition.css'), 'utf8')
  const classicCss = await readFile(path.join(root, 'client/src/styles.css'), 'utf8')
  const monotypeCss = await readFile(path.join(root, 'client/src/monotype-theme.css'), 'utf8')
  assert.match(app, /M4LControllerLayoutPreview/)
  assert.match(main, /routeParams\.set\('mapper', 'm4l'\)/)
  assert.match(main, /window\.history\.replaceState/)
  assert.match(vercel, /"outputDirectory": "client\/dist"/)
  assert.match(vercel, /"destination": "\/index\.html"/)
  assert.match(app, /Custom M4L MIDI Layout/)
  assert.match(app, /ACTIONS/)
  assert.match(app, /PRESET M4L LAYOUTS/)
  assert.match(app, /EXPORT PROFILE JSON/)
  assert.match(app, /IMPORT PROFILE JSON/)
  assert.match(app, /terminal-mapping-matrix/)
  assert.match(preview, /CUSTOM M4L MIDI SURFACE/)
  assert.match(preview, /ADD ACTION/)
  assert.match(preview, /REMOVE SELECTED/)
  assert.match(preview, /Capture MIDI/)
  assert.match(preview, /value == 127/)
  assert.match(preview, /String\.raw`   \.---------\./)
  assert.doesNotMatch(preview, /\|\{selected \? '>'/)
  assert.match(app, /terminal-theme-stylesheet/)
  assert.match(app, /terminal-edition\.css/)
  assert.match(app, /ThemeSwitcher/)
  assert.match(app, /m4l-remote-mapper-theme/)
  assert.match(app, /writeSharedTheme\(uiTheme\)/)
  assert.match(app, /theme-terminal/)
  assert.match(app, /theme-classic/)
  assert.match(app, /theme-monotype/)
  assert.match(app, /\[ MONOTYPE \]/)
  assert.match(abletonApp, /\[ MONOTYPE \]/)
  assert.match(app, /\[ NIGHT \]/)
  assert.match(abletonApp, /\[ NIGHT \]/)
  assert.match(monotypeCss, /\.monotype-edition/)
  assert.match(monotypeCss, /\.night-edition/)
  assert.match(monotypeCss, /JetBrains Mono/)
  assert.match(monotypeCss, /border-radius: 0 !important/)
  assert.match(monotypeCss, /background: #f9f9f9/)
  assert.match(monotypeCss, /\.controller-knob::before/)
  assert.match(monotypeCss, /border-radius: 50% !important/)
  assert.match(monotypeCss, /\.controller-button--active/)
  assert.match(monotypeCss, /\.controller-button--active \+ small/)
  assert.match(monotypeCss, /\.ascii-pad--active/)
  assert.match(monotypeCss, /\.custom-layout-creator \.primary-button/)
  assert.match(monotypeCss, /justify-self: center/)
  assert.match(monotypeCss, /\.ascii-fader__track/)
  assert.match(monotypeCss, /\.ascii-fader__thumb::after/)
  assert.match(app, /m4l-classic/)
  assert.match(app, /product-summary/)
  assert.match(app, /Map MIDI controls to Max for Live/)
  assert.doesNotMatch(app, /m4l-classic-hero/)
  assert.match(app, /stylesheet\.media = uiTheme === 'terminal' \? 'all' : 'not all'/)
  assert.match(app, /if \(!terminal\) return <div className=/)
  assert.match(app, /readSharedTheme\('m4l-remote-mapper-theme'\)/)
  assert.match(app, /'Script Name', 'Connect Controller', 'Max for Live Target', 'Custom Layout', 'Mapping', 'Export ZIP'/)
  assert.match(app, /MAX FOR LIVE TARGET/)
  assert.match(app, /Export ZIP Pack/)
  assert.doesNotMatch(app, /WIRE YOUR CONTROLLER INTO MAX FOR LIVE/i)
  assert.match(css, /--term-bg: #000/)
  assert.match(css, /--term-amber: #ffb000/)
  assert.match(css, /\.ascii-terminal/)
  assert.match(css, /\.ascii-table/)
  assert.match(css, /width: min\(1080px/)
  assert.match(css, /\.m4l-theme-switcher/)
  assert.match(css, /\.theme-classic/)
  assert.match(css, /\.m4l-controller-designer \.visual-control-editor/)
  assert.match(css, /position: sticky/)
  assert.match(css, /max-height: calc\(100vh - 32px\)/)
  assert.match(classicCss, /\.m4l-classic \.stepper--m4l-five/)
  assert.match(abletonApp, /unified-terminal-shell/)
  assert.match(app, /terminal-command-bar/)
  assert.match(abletonApp, /terminal-command-bar/)
  assert.match(app, /terminal-header-actions/)
  assert.match(abletonApp, /terminal-header-actions/)
  assert.match(css, /padding: 9px 4vw/)
  assert.match(css, /grid-template-columns: 1fr auto 1fr/)
  assert.match(css, /\.terminal-command-bar \.mapper-switcher/)
  assert.doesNotMatch(app, /terminal-boot-command/)
  assert.doesNotMatch(app, /terminal-status-grid/)
  assert.doesNotMatch(abletonApp, /terminal-boot-command/)
  assert.doesNotMatch(abletonApp, /terminal-status-grid/)
  assert.match(abletonApp, /product-summary/)
  assert.match(abletonApp, /Map MIDI controls to native Ableton devices/)
  assert.doesNotMatch(abletonApp, /native-terminal-intro/)
  assert.match(abletonApp, /\[ TERMINAL \]/)
  assert.match(abletonApp, /\[ CLASSIC \]/)
  assert.match(css, /\.m4l-terminal-edition,\s*\n\.unified-terminal-shell/)
  assert.match(css, /--unified-shell-width: 1240px/)
})

test('M4L and Ableton mapper share one persistent Terminal or Classic preference', () => {
  const previousWindow = globalThis.window
  const storage = new Map()
  globalThis.window = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
  }

  try {
    assert.equal(DEFAULT_SHARED_THEME, 'night')
    assert.equal(readSharedTheme('m4l-remote-mapper-theme'), 'night')

    writeSharedTheme('terminal')
    assert.equal(storage.get(SHARED_THEME_KEY), 'terminal')
    assert.equal(readSharedTheme('m4l-remote-mapper-theme'), 'terminal')
    assert.equal(readSharedTheme('ableton-device-mapper-theme', 'normal'), 'terminal')

    writeSharedTheme('normal')
    assert.equal(storage.get(SHARED_THEME_KEY), 'classic')
    assert.equal(readSharedTheme('m4l-remote-mapper-theme'), 'classic')
    assert.equal(readSharedTheme('ableton-device-mapper-theme', 'normal'), 'classic')

    writeSharedTheme('monotype')
    assert.equal(storage.get(SHARED_THEME_KEY), 'monotype')
    assert.equal(readSharedTheme('m4l-remote-mapper-theme'), 'monotype')
    assert.equal(readSharedTheme('ableton-device-mapper-theme', 'normal'), 'monotype')

    writeSharedTheme('night')
    assert.equal(storage.get(SHARED_THEME_KEY), 'night')
    assert.equal(readSharedTheme('m4l-remote-mapper-theme'), 'night')
    assert.equal(readSharedTheme('ableton-device-mapper-theme', 'normal'), 'night')
  } finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
})

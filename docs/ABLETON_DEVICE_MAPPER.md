# Ableton Device Mapper

Ableton Device Mapper generates MIDI Remote Scripts for native Ableton Live devices. It is a separate browser view at `/ableton-device-mapper`; the existing Max for Live mapper remains available at `/`.

The view now includes the complete Custom Layout Designer and both Normal and Terminal Edition renderers. The header switch persists the selected style locally while both renderers share the same MIDI, layout, mapping, and export state.

## When to use it

Use this mapper when the target is a built-in Live instrument, audio effect, or MIDI effect. No Max for Live patch is generated or required.

The bundled Live 12.4.5b6 catalog currently contains 83 devices and 2,746 parameters across:

- instruments such as Operator, Wavetable, Drift, Simpler, and Sampler;
- audio effects such as Auto Filter, EQ Eight, Roar, and Hybrid Reverb;
- MIDI effects such as Arpeggiator and Expression Control.

Each catalog entry can provide a device name, Live class name, category, parameter name, `liveIndex`, Device-On-free `parameterIndex`, section, risk level, and knob recommendation.

## Workflow

1. Connect a controller and capture MIDI CC messages, or start from a layout preset.
2. Choose the device category and native device.
3. Apply 8 Knobs, 8 Faders, 16 Controls, Operator Musical 8, Auto Filter Basic, EQ Eight Basic, or Blank Custom.
4. Search and assign a target parameter for every MIDI source.
5. Export the ZIP and follow the native-device Setup Wizard.

Operator Musical 8 uses the catalog's validated indices for Volume, Tone, Filter Freq, Filter Res, and oscillator A–D levels.

## Device discovery

The generated script searches:

1. the selected track;
2. all regular tracks;
3. return tracks;
4. the master track;
5. nested devices inside rack chains.

It compares the configured aliases with `device.name`, `device.class_name`, and `device.class_display_name` when those properties exist.

## Parameter safety

Parameters resolve by exact alias, then normalized alias. If no name matches, the script logs the available parameters and stops. Advanced index fallback must be enabled explicitly for each mapping; it excludes `Device On`, validates bounds, and rejects disabled parameters.

MIDI values are normalized from 0–127 and scaled to the target's actual `parameter.min` and `parameter.max`.

## Exported pack

```text
Ableton_Device_Mapper_Pack/
├── 1_COPY_THIS_FOLDER_TO_REMOTE_SCRIPTS/
│   └── <scriptSlug>/
│       ├── __init__.py
│       ├── <scriptSlug>.py
│       └── profile.json
├── 2_READ_ME_FIRST.md
├── INSTALL_CHECK.command
└── TROUBLESHOOTING.md
```

Copy only `<scriptSlug>/` into Ableton's User Library Remote Scripts folder, restart Live, select the generated Control Surface and MIDI Input, load the native target device in the Set, then move a mapped control.

# Max for Live target contract

The generated Remote Script controls a Max for Live device by its Live device name and exposed parameter names. It does not require `DeviceComponent`, `set_device_component`, or `mappings.py`.

## Use the bundled target

The exported pack contains:

```text
2_OPEN_THIS_MAX_FOR_LIVE_DEVICE/
└── M4L-Remote-Target/
    ├── M4L-Remote-Target.maxpat
    ├── README.md
    └── PARAMETER_NAMES.md
```

Open the `.maxpat` from a Max Audio Effect, save it into your User Library if Max asks, and load it on a Live track. The demo profile expects the loaded device to be named exactly `M4L-Remote-Target`.

The template is a transparent stereo audio effect and exposes:

- `M4L Param 1` through `M4L Param 8` as continuous parameters;
- `M4L Button 1` through `M4L Button 8` as button parameters.

Its presentation panel also shows the expected device and parameter names, plus monitors for the first four continuous parameters.

## Naming and aliases

For each slot, the generator stores multiple aliases. The first continuous slot normally accepts:

```text
M4L Param 1    complete Long/Short Name
Param 1        compact alias
m4l_param_1    Max Scripting Name
```

Buttons follow the same convention: `M4L Button 1`, `Button 1`, and `m4l_button_1`.

When using a custom prefix, the generator trims the prefix and inserts one space before the one-based slot number. A prefix of `Macro` produces `Macro 1`; a prefix of `M4L-Param` produces `M4L-Param 1`.

In Max's Inspector, ensure that the Long Name and Short Name remain complete and unique. A clipped or duplicate name can make Live expose a different parameter than the one requested by the script.

## Safe lookup order

The generated script searches tracks, return tracks, and nested rack chains. For each mapping it then tries:

1. exact matches against every stored alias;
2. normalized alphanumeric matches against every alias;
3. an optional zero-based index fallback, only when explicitly enabled in Advanced.

The candidate must match the expected kind. A continuous mapping rejects a button candidate, and a button mapping requires a button-compatible candidate. Index fallback is disabled by default because Max for Live parameter order is not a reliable public contract.

## Value ranges

MIDI CC values are normalized and scaled to Live's reported parameter range:

```text
MIDI 0–127 → normalized 0.0–1.0 → parameter.min–parameter.max
```

This means MIDI 64 becomes about 0.504 on a 0–1 dial and about 64 on a 0–127 parameter. The generated script never assumes that every Live parameter accepts raw MIDI values.

## Adapting your own device

1. Keep or choose a stable device name and enter it in the web app.
2. Expose continuous controls and buttons as automated parameters in Max.
3. Give each parameter a unique, complete Long Name and Short Name.
4. Enter matching prefixes and slot counts in M4L Remote Mapper.
5. Leave index fallback disabled while validating names.
6. Export a new pack whenever the target contract changes.

Use `profile.json` in the generated script folder as the source of truth when comparing target names and aliases.

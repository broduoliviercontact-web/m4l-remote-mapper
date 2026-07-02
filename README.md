# M4L Remote Mapper

**MIDI Controller → Remote Script → Max for Live**

M4L Remote Mapper is a browser-based React/Vite tool that captures MIDI Control Change messages, routes them to named Max for Live parameters or Ableton global actions, and exports an installable Remote Script pack as a ZIP.

The v0.1 MVP is deliberately narrow: Max for Live parameters, Capture MIDI, Web MIDI capture, Remote Script generation, and a transparent Max Audio Effect template. It does not include an Ableton device catalogue or a backend.

## Run locally

Web MIDI requires a compatible browser and a secure context. `localhost` is accepted as secure by Chromium browsers.

```bash
cd client
npm install
npm run dev
```

Open the local URL printed by Vite, connect a MIDI controller, and click **Enable MIDI**.

## Production build

```bash
cd client
npm run build
npm run preview
```

## Workflow

1. Enable Web MIDI and select an input.
2. Move hardware controls to collect incoming CC messages.
3. Define the Max for Live device name and its exposed parameter names.
4. Route each MIDI source to an M4L parameter or to **Capture MIDI**.
5. Download the generated ZIP and follow `3_READ_ME_FIRST.md` or the in-app Setup Wizard.

The **Load nanoKONTROL2 full demo** button targets **M4L-Remote-Target** and creates the validated profile: CC16–19 control M4L Params 1–4, CC32–33 toggle M4L Buttons 1–2 in the script, CC34–35 act momentarily on M4L Buttons 3–4, and CC45 triggers Capture MIDI only at value 127.

Mappings distinguish `continuous` controls from `button` controls. Continuous MIDI values are normalized from 0–127 and scaled to the target parameter's own minimum/maximum. Buttons support `momentary`, `toggle_from_input`, `toggle_in_script`, and `trigger` modes and write only the target minimum or maximum.

Slot names come from one central naming rule: the trimmed prefix, one space, then the one-based number. For example, `M4L-Param` becomes `M4L-Param 1`, never `M4L-Param-1`; the exported profile, Python script, documentation, and customized `.maxpat` all use that same result.

Mappings resolve by name only by default. Optional index fallback must be enabled per mapping in Advanced and rejects incompatible targets, preventing a continuous mapping from landing on a button when Max exposes parameters in an unexpected order.

The bundled patch gives every parameter identical complete Long and Short Names. Generated mappings also include compact and Scripting Name aliases, and every script embeds a deterministic `BUILD_ID` logged at startup so stale Ableton caches are immediately visible.

The downloaded pack includes `2_OPEN_THIS_MAX_FOR_LIVE_DEVICE/M4L-Remote-Target/M4L-Remote-Target.maxpat`. Open it from a Max Audio Effect and save/load the device under the exact name **M4L-Remote-Target** so the Remote Script can resolve it.

For the demo installation, copy only `1_COPY_THIS_FOLDER_TO_REMOTE_SCRIPTS/M4L_Remote_Target_Remote/` into `~/Music/Ableton/User Library/Remote Scripts/`, then restart Live. In **Settings → Link, Tempo & MIDI**, choose **M4L_Remote_Target_Remote** as Control Surface, **nanoKONTROL2 SLIDER/KNOB** as Input, and **None** as Output.

After every download, the UI opens a Setup Wizard with a persistent checklist for the session and copy-ready cleanup/log commands. The **Generate Known-Good nanoKONTROL2 Test Pack** button bypasses custom mappings and exports the validated CC16/17/18/19 + CC45 profile. The ZIP also includes `INSTALL_CHECK.command` and `TROUBLESHOOTING.md`.

## Repository

- `client/` — React/Vite browser app
- `client/src/generators/remoteScriptGenerator.js` — deterministic Python/profile/docs generator
- `maxforlive/templates/M4L-Remote-Target/` — transparent stereo Max Audio Effect template
- `docs/ARCHITECTURE.md` — data flow and design decisions
- `docs/ABLETON_INSTALLATION.md` — manual Ableton setup guide

No MIDI data or mapping profile leaves the browser.

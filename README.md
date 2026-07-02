# M4L Remote Mapper

**MIDI Controller → Remote Script → Max for Live**

M4L Remote Mapper is a browser-based React/Vite tool that captures MIDI Control Change messages, routes them to named Max for Live parameters or Ableton global actions, and exports an installable Remote Script pack as a ZIP.

The v0.1 MVP is deliberately narrow: Max for Live parameters, Capture MIDI, Web MIDI capture, and Remote Script generation. It does not include an Ableton device catalogue, a backend, or `.amxd` generation.

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
5. Download the generated ZIP and follow its `INSTALLATION.md`.

The **Load nanoKONTROL2 demo** button creates the validated profile: CC 16–19 control M4L Params 1–4, and CC 45 triggers Capture MIDI only when its value equals 127.

## Repository

- `client/` — React/Vite browser app
- `client/src/generators/remoteScriptGenerator.js` — deterministic Python/profile/docs generator
- `docs/ARCHITECTURE.md` — data flow and design decisions
- `docs/ABLETON_INSTALLATION.md` — manual Ableton setup guide

No MIDI data or mapping profile leaves the browser.


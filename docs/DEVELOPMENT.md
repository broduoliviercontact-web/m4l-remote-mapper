# Development

M4L Remote Mapper is a static React/Vite app. Mapping, Python generation, ZIP assembly, and downloads all happen in the browser; no backend is required.

## Requirements

- A current Node.js LTS release and npm
- A Chromium-family browser for Web MIDI and screenshot automation
- Ableton Live with Max for Live for end-to-end hardware testing

## Install and run

```bash
cd client
npm install
npm run dev
```

Vite prints the local URL. MIDI access requires a compatible browser and explicit user permission.

Root development commands:

```bash
npm install
npm test
npm --prefix client run build
npm run docs:screenshots
```

## Repository layout

```text
client/                 React/Vite application
  src/generators/       Python and pack content generation
  src/utils/            Shared Max for Live naming rules
maxforlive/templates/   Canonical M4L target patch and notes
docs/                   User, architecture, and screenshot documentation
scripts/                Documentation automation
tests/                  Node tests for generator and ZIP safety
```

## Generator invariants

Changes to the generator must preserve these safety properties:

- MIDI CC inputs use `EncoderElement` and `add_value_listener`.
- `receive_midi` is not the primary forwarding mechanism.
- Generated scripts do not use `DeviceComponent`, `set_device_component`, or `mappings.py`.
- Logging uses the generated `_log` helper; never generate a direct `self.log_message` call.
- Continuous values scale through `parameter.min` and `parameter.max`.
- Continuous and button targets cannot cross-resolve.
- Index fallback remains opt-in and type-checked.
- Capture MIDI with `value_eq_127` calls `self.song().capture_midi()` only for value 127.

Tests compile generated Python with `python3 -m py_compile` and inspect pack contents for these invariants.

## Screenshot workflow

`npm run docs:screenshots` starts a temporary Vite process, opens the app with Playwright, loads the known-good demo, and writes the six documented UI captures. Install Chromium once if needed:

```bash
npx playwright install chromium
```

See [SCREENSHOTS.md](SCREENSHOTS.md) for capture details.

## Before opening a pull request

```bash
npm test
npm --prefix client run build
git diff --check
git status --short
```

Do not commit `node_modules`, `client/dist`, local `.env` files, Ableton logs, or Python bytecode.

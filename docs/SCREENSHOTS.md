# UI screenshots

The images in `docs/assets/screenshots/` are real captures of the local React app loaded with the known-good nanoKONTROL2 profile.

## Regenerate all images

From the repository root:

```bash
npm install
npx playwright install chromium
npm run docs:screenshots
```

The script starts Vite on a local port, launches headless Chromium, loads the demo profile, captures the documented sections, and stops the server when complete.

Generated files:

```text
docs/assets/m4l-remote-mapper-hero.png
docs/assets/screenshots/01-connect-controller.png
docs/assets/screenshots/02-m4l-target.png
docs/assets/screenshots/03-mapping-matrix.png
docs/assets/screenshots/04-export-pack.png
docs/assets/screenshots/05-setup-wizard.png
docs/assets/screenshots/06-install-check.png
```

The capture uses deterministic UI data, not a physical MIDI input. Hardware and Ableton behavior remain covered by the known-good pack and manual end-to-end tests.

## Review checklist

- No browser permission prompt obscures the page.
- The known-good demo mappings are visible.
- Text is readable at the native image size.
- No personal paths, controller serial numbers, or other private data appear.
- Every image referenced by `README.md` exists before committing.

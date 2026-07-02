# Contributing

Thanks for helping make M4L Remote Mapper more reliable for musicians and Max for Live developers. Bug reports, documentation fixes, controller templates, and focused code changes are welcome.

## Before you start

- Search existing issues before opening a duplicate.
- For a bug, include the browser, operating system, Live version, controller/port name, generated `BUILD_ID`, and the relevant Log.txt lines.
- Never post an entire Ableton log without checking it for personal paths or unrelated data.
- Discuss broad UI changes or generator contract changes in an issue before investing in a large pull request.

## Local setup

```bash
git clone <your-fork-url>
cd "M4L Remote Mapper"
npm install
npm --prefix client install
npm test
npm --prefix client run build
```

Run the app with `npm --prefix client run dev`.

## Pull request checklist

- Keep changes small enough to review.
- Add or update tests for generator behavior and pack contents.
- Preserve the invariants in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).
- Update English and French documentation when user-facing behavior changes.
- Regenerate screenshots only when the visible workflow changes.
- Run `npm test`, `npm --prefix client run build`, and `git diff --check`.
- Do not commit generated `client/dist`, dependencies, logs, `.env` files, or Python caches.

## Hardware reports

Controller compatibility reports are especially useful. Include the MIDI channel, CC numbers, button values/modes, exact input port selected in Live, and whether the known-good pack works. Avoid attaching proprietary firmware or commercial Max devices.

By contributing, you agree that your contribution may be distributed under the repository's [MIT License](LICENSE).

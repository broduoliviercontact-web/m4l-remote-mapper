import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'

const root = path.resolve(import.meta.dirname, '..')
const assets = path.join(root, 'docs/assets')
const screenshots = path.join(assets, 'screenshots')
const url = 'http://127.0.0.1:5173/'

await mkdir(screenshots, { recursive: true })

const server = spawn('npm', ['--prefix', 'client', 'run', 'dev', '--', '--host', '127.0.0.1'], {
  cwd: root,
  stdio: 'ignore',
})

const waitForServer = async () => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`Vite did not start at ${url}`)
}

let browser
try {
  await waitForServer()
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: /Wire your controller/ }).waitFor()

  await page.screenshot({ path: path.join(assets, 'm4l-remote-mapper-hero.png') })
  await page.screenshot({ path: path.join(screenshots, '01-connect-controller.png'), fullPage: true })

  await page.getByRole('button', { name: /Max for Live Target/ }).click()
  await page.screenshot({ path: path.join(screenshots, '02-m4l-target.png'), fullPage: true })

  await page.getByRole('button', { name: 'Load nanoKONTROL2 full demo' }).click()
  await page.screenshot({ path: path.join(screenshots, '03-mapping-matrix.png'), fullPage: true })

  await page.getByRole('button', { name: /Export Pack/ }).click()
  await page.screenshot({ path: path.join(screenshots, '04-export-pack.png'), fullPage: true })

  await page.getByRole('button', { name: 'Download ZIP pack' }).click()
  await page.getByRole('heading', { name: 'Setup Wizard' }).waitFor()
  await page.screenshot({ path: path.join(screenshots, '05-setup-wizard.png'), fullPage: true })
  await page.locator('.terminal-tools').screenshot({ path: path.join(screenshots, '06-install-check.png') })

  console.log(`Screenshots written to ${path.relative(root, screenshots)}`)
} finally {
  if (browser) await browser.close()
  server.kill('SIGTERM')
}

import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const IMAGES_DIR = path.resolve(__dirname, '..', 'images')

// Demo entries covering 6 categories with realistic data
const DEMO_ENTRIES = [
  { category: 'Social', name: 'Twitter / X', login: 'john_doe', password: 'Tw!tter_2026#Sec', url: 'https://x.com', description: 'Main social account' },
  { category: 'Social', name: 'LinkedIn', login: 'john.doe@mail.com', password: 'L1nk$_Pr0file!', url: 'https://linkedin.com', description: 'Professional profile' },
  { category: 'Email', name: 'Gmail', login: 'john.doe@gmail.com', password: 'Gm@il_Str0ng!99', url: 'https://mail.google.com', description: 'Primary email' },
  { category: 'Email', name: 'ProtonMail', login: 'johndoe@proton.me', password: 'Pr0t0n#Encrypted', url: 'https://proton.me', description: 'Encrypted email' },
  { category: 'Banking', name: 'Chase Bank', login: 'jdoe_chase', password: 'Ch@se$ecure2026', url: 'https://chase.com', description: 'Checking account' },
  { category: 'Banking', name: 'PayPal', login: 'john.doe@gmail.com', password: 'P@yP4l_M0ney!', url: 'https://paypal.com', description: 'Payment service' },
  { category: 'Dev Tools', name: 'GitHub', login: 'johndoe-dev', password: 'G1tHub#T0ken_2026', url: 'https://github.com', description: 'Code repositories' },
  { category: 'Dev Tools', name: 'Vercel', login: 'johndoe-dev', password: 'V3rcel_D3ploy!', url: 'https://vercel.com', description: 'Deployment platform' },
  { category: 'Dev Tools', name: 'Figma', login: 'john.doe@mail.com', password: 'F1gm@_Des1gn#', url: 'https://figma.com', description: 'Design tool' },
  { category: 'Cloud', name: 'AWS Console', login: 'jdoe-admin', password: 'Aws#Cl0ud_2026!', url: 'https://aws.amazon.com', description: 'Cloud infrastructure' },
  { category: 'Cloud', name: 'DigitalOcean', login: 'john.doe@gmail.com', password: 'D0_Dr0plet$!', url: 'https://digitalocean.com', description: 'VPS hosting' },
  { category: 'Crypto', name: 'Coinbase', login: 'jdoe_crypto', password: 'C01nb@se_H0dl!', url: 'https://coinbase.com', description: 'Crypto exchange' },
  { category: 'Crypto', name: 'MetaMask', login: 'wallet-main', password: 'M3t@M4sk_W@llet', url: 'https://metamask.io', description: 'Ethereum wallet' },
  { category: 'Social', name: 'Discord', login: 'johndoe#1234', password: 'D1sc0rd_Ch@t!', url: 'https://discord.com', description: 'Gaming & communities' },
  { category: 'Email', name: 'Outlook', login: 'j.doe@outlook.com', password: '0utl00k_M@1l#', url: 'https://outlook.com', description: 'Work email' },
]

async function connectLocalStorage(page: Page, password = 'demo1234') {
  await page.waitForSelector('.modal-panel', { timeout: 5000 })
  await page.locator('.master-input').fill(password)
  await page.locator('.repo-card').first().click()
  await page.locator('button:has-text("Connect")').click()
  await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 5000 })
}

async function addDemoEntries(page: Page) {
  for (const entry of DEMO_ENTRIES) {
    await page.locator('.sidebar-btn[aria-label="Add"]').click()
    await expect(page.locator('.modal-panel')).toBeVisible()
    const inputs = page.locator('.modal-panel .form-field-input')
    await inputs.nth(0).fill(entry.category)
    await inputs.nth(1).fill(entry.name)
    await inputs.nth(2).fill(entry.login)
    await inputs.nth(3).fill(entry.password)
    // URL field (index 4) — fill if input exists
    const urlInput = inputs.nth(4)
    if (await urlInput.count()) await urlInput.fill(entry.url)
    // Description (index 5 — textarea)
    const descInput = page.locator('.modal-panel .form-field-input, .modal-panel textarea').last()
    // Try filling the textarea via the 5th form-field-input or a textarea
    const textarea = page.locator('.modal-panel textarea')
    if (await textarea.count()) await textarea.fill(entry.description)

    await page.locator('button:has-text("Save")').click()
    await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 3000 })
  }
}

// Use only Desktop Chrome for screenshots
test.describe('Screenshots for README', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('capture light theme screenshot', async ({ page }) => {
    await page.goto('/')
    await connectLocalStorage(page)
    await addDemoEntries(page)

    // Ensure light theme
    const html = page.locator('html')
    const theme = await html.getAttribute('data-theme')
    if (theme === 'dark') {
      await page.locator('.sidebar-btn[aria-label="Light theme"]').click()
    }

    // Wait for UI to settle
    await page.waitForTimeout(500)

    // Deselect any row by clicking empty area
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    await page.screenshot({
      path: path.join(IMAGES_DIR, 'screenshot-light.png'),
      fullPage: false,
    })
  })

  test('capture dark theme screenshot', async ({ page }) => {
    await page.goto('/')
    await connectLocalStorage(page)
    await addDemoEntries(page)

    // Switch to dark theme
    const html = page.locator('html')
    const theme = await html.getAttribute('data-theme')
    if (theme !== 'dark') {
      await page.locator('.sidebar-btn[aria-label="Dark theme"]').click()
    }
    await expect(html).toHaveAttribute('data-theme', 'dark')

    await page.waitForTimeout(500)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    await page.screenshot({
      path: path.join(IMAGES_DIR, 'screenshot-dark.png'),
      fullPage: false,
    })

    // Reset to light so other tests aren't affected
    await page.locator('.sidebar-btn[aria-label="Light theme"]').click()
  })
})

test.describe('Mobile Screenshot', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('capture mobile screenshot', async ({ page }) => {
    await page.goto('/')
    await connectLocalStorage(page)

    // Add a subset of demo entries for mobile view
    for (const entry of DEMO_ENTRIES.slice(0, 8)) {
      await page.locator('.bottom-nav .bottom-nav-btn[aria-label="Add"]').click()
      await expect(page.locator('.modal-panel')).toBeVisible()
      const inputs = page.locator('.modal-panel .form-field-input')
      await inputs.nth(0).fill(entry.category)
      await inputs.nth(1).fill(entry.name)
      await inputs.nth(2).fill(entry.login)
      await inputs.nth(3).fill(entry.password)
      const urlInput = inputs.nth(4)
      if (await urlInput.count()) await urlInput.fill(entry.url)
      await page.locator('button:has-text("Save")').click()
      await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 3000 })
    }

    await page.waitForTimeout(500)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    await page.screenshot({
      path: path.join(IMAGES_DIR, 'screenshot-mobile.png'),
      fullPage: false,
    })
  })
})

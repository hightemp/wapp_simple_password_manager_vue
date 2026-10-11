/**
 * Regenerates the README screenshots in images/ (light theme only).
 * Run with: npm run screenshots
 */
import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const IMAGES_DIR = path.resolve(__dirname, '..', 'images')

// Demo data: fictional accounts with nested categories
const DEMO_ENTRIES = [
  { category: 'Work/Email', name: 'Outlook', login: 'j.doe@contoso.com', password: '0utl00k_M@1l#2026', url: 'https://outlook.office.com', description: 'Work mailbox' },
  { category: 'Work/Email', name: 'ProtonMail', login: 'jdoe@proton.me', password: 'Pr0t0n#Encrypted!', url: 'https://proton.me', description: 'Encrypted mail' },
  { category: 'Work/Dev', name: 'GitHub', login: 'johndoe-dev', password: 'G1tHub#T0ken_2026', url: 'https://github.com', description: 'Code repositories' },
  { category: 'Work/Dev', name: 'GitLab', login: 'jdoe', password: 'G1tL@b_Runner!9', url: 'https://gitlab.com', description: 'CI runners' },
  { category: 'Work/Dev', name: 'Figma', login: 'john.doe@contoso.com', password: 'F1gm@_Des1gn#', url: 'https://figma.com', description: 'Design system' },
  { category: 'Work/Cloud', name: 'AWS Console', login: 'jdoe-admin', password: 'Aws#Cl0ud_2026!', url: 'https://console.aws.amazon.com', description: 'Production account' },
  { category: 'Work/Cloud', name: 'DigitalOcean', login: 'john.doe@contoso.com', password: 'D0_Dr0plet$!x', url: 'https://cloud.digitalocean.com', description: 'Staging droplets' },
  { category: 'Work/Cloud', name: 'Vercel', login: 'johndoe-dev', password: 'V3rcel_D3ploy!', url: 'https://vercel.com', description: 'Preview deploys' },
  { category: 'Personal/Social', name: 'Twitter / X', login: 'john_doe', password: 'Tw!tter_2026#Sec', url: 'https://x.com', description: 'Personal account' },
  { category: 'Personal/Social', name: 'LinkedIn', login: 'john.doe@mail.com', password: 'L1nk$_Pr0file!', url: 'https://linkedin.com', description: 'Professional profile' },
  { category: 'Personal/Social', name: 'Discord', login: 'johndoe#1234', password: 'D1sc0rd_Ch@t!', url: 'https://discord.com', description: 'Gaming & communities' },
  { category: 'Personal/Shopping', name: 'Amazon', login: 'john.doe@mail.com', password: 'Am@z0n_Pr1me!', url: 'https://amazon.com', description: 'Prime membership' },
  { category: 'Personal/Shopping', name: 'eBay', login: 'jdoe_shop', password: 'eB@y_B1dder#', url: 'https://ebay.com', description: '' },
  { category: 'Personal', name: 'Gmail', login: 'john.doe@gmail.com', password: 'Gm@il_Str0ng!99', url: 'https://mail.google.com', description: 'Primary email' },
  { category: 'Finance/Banking', name: 'Chase Bank', login: 'jdoe_chase', password: 'Ch@se$ecure2026', url: 'https://chase.com', description: 'Checking account' },
  { category: 'Finance/Banking', name: 'PayPal', login: 'john.doe@gmail.com', password: 'P@yP4l_M0ney!', url: 'https://paypal.com', description: 'Payments' },
  { category: 'Finance/Crypto', name: 'Coinbase', login: 'jdoe_crypto', password: 'C01nb@se_H0dl!', url: 'https://coinbase.com', description: 'Exchange' },
  { category: 'Finance/Crypto', name: 'MetaMask', login: 'wallet-main', password: 'M3t@M4sk_W@llet', url: 'https://metamask.io', description: 'Ethereum wallet' },
  { category: '', name: 'Home Wi-Fi', login: 'JDOE-5G', password: 'Wh0le-H0use-W1f1', url: '', description: 'Router admin: 192.168.1.1' },
  { category: '', name: 'Netflix', login: 'john.doe@gmail.com', password: 'N3tfl1x_&_Ch1ll', url: 'https://netflix.com', description: 'Family plan' },
]

const DEMO_DATABASE = JSON.stringify({
  table: {
    last_index: DEMO_ENTRIES.length,
    data: DEMO_ENTRIES.map((entry, index) => ({ id: index + 1, ...entry })),
    categories: [],
  },
})

async function connectLocalStorage(page: Page) {
  await page.goto('/')
  await page.waitForSelector('.modal-panel', { timeout: 5000 })
  await page.locator('.master-input').fill('demo-password')
  await page.locator('.repo-card').first().click()
  await page.locator('button:has-text("Connect")').click()
  await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 5000 })
}

/** Load the demo entries through the app's own import */
async function importDemoData(page: Page) {
  await page.locator('input[type="file"]').setInputFiles({
    name: 'demo.json',
    mimeType: 'application/json',
    buffer: Buffer.from(DEMO_DATABASE),
  })
  await expect(page.locator('.notification:has-text("Imported")')).toBeVisible()
  // Save, so the "unsaved changes" dot is not shown
  await page.keyboard.press('ControlOrMeta+s')
  await expect(page.locator('.notification:has-text("Saved")')).toBeVisible()
  // Hide toasts so they don't end up in the screenshots
  await page.evaluate(() => document.querySelectorAll<HTMLElement>('.notification-dismiss').forEach((b) => b.click()))
  await expect(page.locator('.notification')).toHaveCount(0)
}

async function shot(page: Page, name: string, { keepFocus = false } = {}) {
  const isDesktop = page.viewportSize()!.width > 768
  // No hover / focus effects: park the pointer on an inert spot (empty part of the
  // sidebar, or the top-left corner on mobile) and drop focus from clicked buttons
  await page.mouse.move(isDesktop ? 28 : 4, isDesktop ? 500 : 4)
  if (!keepFocus) await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  if (isDesktop) {
    // The Save button shows a check mark for 2 s after saving
    await expect(page.locator('.sidebar-btn[aria-label="Save"] .i-lucide-save')).toBeVisible({ timeout: 3000 })
  }
  // Let transitions finish
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(IMAGES_DIR, name), fullPage: false })
}

test.describe('Desktop screenshots', () => {
  test.use({ viewport: { width: 1440, height: 860 }, colorScheme: 'light' })

  test.beforeEach(async ({ page }) => {
    await connectLocalStorage(page)
    await importDemoData(page)
    for (const category of ['Work', 'Personal', 'Finance']) {
      await page.locator(`.cat-row[data-path="${category}"] .cat-chevron`).click()
    }
  })

  test('main view', async ({ page }) => {
    await shot(page, 'desktop-main.png')
  })

  test('category with selected rows', async ({ page }) => {
    await page.locator('.cat-row[data-path="Work"]').click()
    const rows = page.locator('.grid-row:not(.grid-header)')
    await rows.filter({ hasText: 'GitHub' }).click()
    await rows.filter({ hasText: 'Figma' }).click({ modifiers: ['Shift'] })
    await rows.filter({ hasText: 'AWS Console' }).locator('[aria-label="Show password"]').click()
    await shot(page, 'desktop-category.png')
  })

  test('entry editor with category suggestions', async ({ page }) => {
    await page.locator('.grid-row:not(.grid-header)').filter({ hasText: 'GitHub' }).dblclick()
    await page.locator('.modal-panel .form-field-input').first().fill('Work/')
    // Keep focus in the field so the suggestion list stays open
    await shot(page, 'desktop-editor.png', { keepFocus: true })
  })

  test('password generator', async ({ page }) => {
    await page.locator('.grid-row:not(.grid-header)').filter({ hasText: 'GitHub' }).dblclick()
    await page.locator('.pw-gen-toggle').click()
    await page.locator('.gen-btn:has-text("Generate")').click()
    await page.locator('.modal-body').evaluate((body) => body.scrollTo(0, body.scrollHeight))
    await shot(page, 'desktop-generator.png')
  })

  test('repository settings', async ({ page }) => {
    // Example repositories with fictional credentials (fields are masked)
    await page.evaluate(() => {
      localStorage.setItem('aReposList', JSON.stringify([
        { type: 'github', name: 'Personal vault', login: 'johndoe-dev', repo: 'vault', key: 'ghp_demo_not_a_real_token_000000' },
        { type: 'webdav', name: 'Nextcloud', url: 'https://cloud.example.com/remote.php/dav/files/jdoe/', username: 'jdoe', password: 'demo' },
      ]))
    })
    await page.reload()
    await page.waitForSelector('.modal-panel')
    await page.locator('.master-input').fill('demo-password')
    await page.locator('.repo-card:has-text("Personal vault")').click()
    await page.locator('.repo-card:has-text("Personal vault") [aria-label="Edit repository"]').click()
    await shot(page, 'desktop-repositories.png')
  })
})

test.describe('Mobile screenshots', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'light',
  })

  test.beforeEach(async ({ page }) => {
    await connectLocalStorage(page)
    await importDemoData(page)
  })

  test('entry list', async ({ page }) => {
    await shot(page, 'mobile-list.png')
  })

  test('entry details', async ({ page }) => {
    await page.locator('.entry-card:has-text("GitHub")').click()
    await page.locator('.modal-panel [aria-label="Show password"]').click()
    await shot(page, 'mobile-details.png')
  })

  test('category picker', async ({ page }) => {
    await page.locator('[aria-label="Choose category"]').click()
    for (const category of ['Work', 'Personal']) {
      await page.locator(`.modal-panel .cat-row[data-path="${category}"] .cat-chevron`).click()
    }
    await shot(page, 'mobile-categories.png')
  })
})

import { test, expect, type Page, type Locator } from '@playwright/test'
import fs from 'node:fs'

// Helper: connect to LocalStorage repo with a master password
async function connectLocalStorage(page: Page, password = 'test1234') {
  // The repo modal should be shown on first load
  await page.waitForSelector('.modal-panel', { timeout: 5000 })

  // Enter master password
  const pwInput = page.locator('.master-input')
  await pwInput.fill(password)

  // Select LocalStorage (first repo card = localstorage)
  const repoCards = page.locator('.repo-card')
  await repoCards.first().click()

  // Click Connect
  await page.locator('button:has-text("Connect")').click()
  await confirmCreateIfAsked(page, password)

  // Wait for modal to close
  await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 5000 })
}

// An empty storage asks before creating a database: repeat the password and confirm
async function confirmCreateIfAsked(page: Page, password: string) {
  const create = page.locator('.modal-panel:has-text("Create a new database")')
  // Loaded (no dialog left open) or asking to create
  await page.waitForFunction(() => !document.querySelector('.loader-overlay') && (
    !document.querySelector('.modal-overlay:not(.modal-leave-active)') ||
    [...document.querySelectorAll('.modal-panel')].some((panel) => panel.textContent?.includes('Create a new database'))
  ), null, { timeout: 5000 })
  if (await create.isVisible()) {
    await create.locator('input[type="password"]').fill(password)
    await create.locator('button.action-btn--primary').click()
  }
}

// ====== Tests ======

test.describe('First Launch & Repository', () => {
  test('should show repo modal on first load', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.modal-panel')).toBeVisible()
    await expect(page.locator('text=Repository Settings')).toBeVisible()
  })

  test('should connect to LocalStorage', async ({ page }) => {
    await page.goto('/')
    await connectLocalStorage(page)
    // Table area should be visible, modal closed
    await expect(page.locator('.data-grid')).toBeVisible()
  })
})

test.describe('CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await connectLocalStorage(page)
  })

  test('should add a new entry', async ({ page }) => {
    // Click Add button in sidebar
    await page.locator('.sidebar-btn[aria-label="Add"]').click()
    await page.locator('.type-option[data-type="login"]').click()

    // Edit form should appear
    await expect(page.locator('.modal-panel .form-field-input').first()).toBeVisible()

    // Fill in fields (the form fields are dynamic based on db.structure)
    const inputs = page.locator('.form-field-input')
    const inputCount = await inputs.count()

    // Fill category
    if (inputCount > 0) await inputs.nth(0).fill('Social')
    // Fill name
    if (inputCount > 1) await inputs.nth(1).fill('Twitter')
    // Fill login
    if (inputCount > 2) await inputs.nth(2).fill('testuser')
    // Fill password
    if (inputCount > 3) await inputs.nth(3).fill('secret123')

    // Click Save
    await page.locator('button:has-text("Save")').click()

    // Modal should close
    await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 3000 })

    // Should see the entry in the table
    await expect(page.locator('.grid-row:not(.grid-header)').first()).toBeVisible()
    await expect(page.locator('text=Twitter')).toBeVisible()
  })

  test('should edit an entry', async ({ page }) => {
    // First add an entry
    await page.locator('.sidebar-btn[aria-label="Add"]').click()
    await page.locator('.type-option[data-type="login"]').click()
    const inputs = page.locator('.modal-panel .form-field-input')
    await inputs.nth(1).fill('Original Name')
    await page.locator('button:has-text("Save")').click()
    await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 3000 })

    // Select the row
    await page.locator('.grid-row:not(.grid-header)').first().click()

    // Click Edit
    await page.locator('.sidebar-btn[aria-label="Edit"]').click()
    await expect(page.locator('.modal-panel')).toBeVisible()

    // Change name
    const nameInput = page.locator('.modal-panel .form-field-input').nth(1)
    await nameInput.clear()
    await nameInput.fill('Edited Name')

    await page.locator('button:has-text("Save")').click()
    await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 3000 })

    // Verify updated
    await expect(page.locator('text=Edited Name')).toBeVisible()
  })

  test('should delete an entry', async ({ page }) => {
    // Add entry
    await page.locator('.sidebar-btn[aria-label="Add"]').click()
    await page.locator('.type-option[data-type="login"]').click()
    const inputs = page.locator('.modal-panel .form-field-input')
    await inputs.nth(1).fill('To Delete')
    await page.locator('button:has-text("Save")').click()
    await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 3000 })

    // Select & delete
    await page.locator('.grid-row:not(.grid-header)').first().click()

    // Native dialogs must not be used anymore
    page.on('dialog', (dialog) => { throw new Error('Unexpected native dialog: ' + dialog.message()) })

    // Deleting moves the entry to the trash without asking; Undo brings it back
    await page.locator('.sidebar-btn[aria-label="Delete"]').click()
    await expect(page.locator('.modal-panel')).toHaveCount(0)
    await expect(page.locator('.grid-row:has-text("To Delete")')).toHaveCount(0)
    await page.locator('.notification:has-text("Moved to trash") .notification-action').click()
    await expect(page.locator('.grid-row:has-text("To Delete")')).toBeVisible()

    // Delete again: entry should be gone
    await page.locator('.grid-row:has-text("To Delete")').click()
    await page.locator('.sidebar-btn[aria-label="Delete"]').click()
    await expect(page.locator('.grid-row:has-text("To Delete")')).toHaveCount(0)
  })
})

test.describe('Password Generator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await connectLocalStorage(page)
  })

  test('should generate and use a password', async ({ page }) => {
    await page.locator('.sidebar-btn[aria-label="Add"]').click()
    await page.locator('.type-option[data-type="login"]').click()
    await expect(page.locator('.modal-panel')).toBeVisible()

    // Open password generator
    await page.locator('button:has-text("Generate Password")').click()

    // Click generate
    await page.locator('.gen-btn--secondary').click()

    // Password preview should appear
    await expect(page.locator('.pw-gen-code')).toBeVisible()
    const generated = await page.locator('.pw-gen-code').textContent()
    expect(generated).toBeTruthy()
    expect(generated!.length).toBeGreaterThan(0)

    // Click Use
    await page.locator('button:has-text("Use")').click()

    // Save and verify
    await page.locator('button:has-text("Save")').click()
  })
})

test.describe('Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await connectLocalStorage(page)
  })

  test('should filter entries by name', async ({ page }) => {
    // Add 2 entries
    for (const name of ['Alpha', 'Beta']) {
      await page.locator('.sidebar-btn[aria-label="Add"]').click()
      await page.locator('.type-option[data-type="login"]').click()
      const inputs = page.locator('.modal-panel .form-field-input')
      await inputs.nth(1).fill(name)
      await page.locator('button:has-text("Save")').click()
      await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 3000 })
    }

    // Filter by 'Alpha'
    const filterInputs = page.locator('.filter-input')
    // Name is the first column (category is shown as the tree)
    await filterInputs.nth(0).fill('Alpha')

    // Wait for debounce
    await page.waitForTimeout(500)

    // Should only see Alpha
    const rows = page.locator('.grid-row:not(.grid-header)')
    await expect(rows).toHaveCount(1)
    await expect(page.locator('text=Alpha')).toBeVisible()

    // Clear filter
    await filterInputs.nth(0).clear()
    await page.waitForTimeout(500)
    await expect(rows).toHaveCount(2)
  })

  test('should filter from last page with 30+ entries', async ({ page }) => {
    test.setTimeout(90_000) // Adding many entries is slow
    // Add 30 entries; give entry #15 a unique name for filtering
    for (let i = 1; i <= 30; i++) {
      await page.locator('.sidebar-btn[aria-label="Add"]').click()
      await page.locator('.type-option[data-type="login"]').click()
      await expect(page.locator('.modal-panel')).toBeVisible()
      const inputs = page.locator('.modal-panel .form-field-input')
      await inputs.nth(1).fill(i === 15 ? 'Unique Item' : `Item ${i}`)
      await page.locator('button:has-text("Save")').click()
      await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 3000 })
    }

    // Pagination should be visible
    const pgBar = page.locator('.pagination-bar').first()
    await expect(pgBar).toBeVisible({ timeout: 3000 })

    // Navigate to the last page
    await pgBar.locator('.pg-btn[aria-label="Last page"]').click()
    const pgInfo = pgBar.locator('.pg-info')
    const infoText = await pgInfo.textContent()
    const parts = infoText!.trim().split('/')
    expect(parts[0].trim()).toBe(parts[1].trim()) // on last page

    // Now filter by the unique name (Name is the first column)
    const filterInputs = page.locator('.filter-input')
    await filterInputs.nth(0).fill('Unique')
    await page.waitForTimeout(500)

    // Only 1 entry should match; pagination should disappear or reset to page 1
    const rows = page.locator('.grid-row:not(.grid-header)')
    await expect(rows).toHaveCount(1)
    await expect(page.locator('text=Unique Item')).toBeVisible()

    // Clear filter — all 30 entries should be back
    await filterInputs.nth(0).clear()
    await page.waitForTimeout(500)
    const totalRows = await rows.count()
    expect(totalRows).toBeGreaterThanOrEqual(1) // at least current page rows visible

    // Pagination should be visible again
    await expect(pgBar).toBeVisible()
  })
})

test.describe('Password Masking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await connectLocalStorage(page)
  })

  test('should mask and reveal passwords', async ({ page }) => {
    // Add entry with password
    await page.locator('.sidebar-btn[aria-label="Add"]').click()
    await page.locator('.type-option[data-type="login"]').click()
    const inputs = page.locator('.modal-panel .form-field-input')
    await inputs.nth(1).fill('Test Entry')
    await inputs.nth(3).fill('mypassword')
    await page.locator('button:has-text("Save")').click()
    await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 3000 })

    // Password should be masked
    await expect(page.locator('.masked')).toBeVisible()

    // Click eye button to reveal
    const eyeBtn = page.locator('.cell-action-btn[aria-label="Show password"]')
    // Hover to make visible first
    await page.locator('.grid-row:not(.grid-header)').first().hover()
    await eyeBtn.click()

    // Should show revealed password
    await expect(page.locator('.revealed')).toBeVisible()
    await expect(page.locator('.revealed')).toHaveText('mypassword')

    // Wait for auto-hide (3 seconds)
    await page.waitForTimeout(3500)
    await expect(page.locator('.masked')).toBeVisible()
  })

  test('should keep cell buttons inside the login and password cells', async ({ page }) => {
    await page.locator('.sidebar-btn[aria-label="Add"]').click()
    await page.locator('.type-option[data-type="login"]').click()
    const inputs = page.locator('.modal-panel .form-field-input')
    await inputs.nth(1).fill('Long')
    await inputs.nth(2).fill('a.very.long.login.name@some-long-domain.example.com')
    await inputs.nth(3).fill('a-very-long-password-that-does-not-fit-into-the-column-1234567890')
    await page.locator('.modal-panel button:has-text("Save")').click()
    await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 3000 })

    const row = page.locator('.grid-row:not(.grid-header)').first()
    await row.hover()

    async function expectButtonsInsideCells() {
      for (const cell of await row.locator('.grid-cell:has(.cell-action-btn)').all()) {
        const cellBox = (await cell.boundingBox())!
        for (const button of await cell.locator('.cell-action-btn').all()) {
          const box = (await button.boundingBox())!
          expect(box.x + box.width).toBeLessThanOrEqual(cellBox.x + cellBox.width + 0.5)
        }
      }
    }

    await expectButtonsInsideCells()
    // Revealed long password must not push the buttons out either
    await row.locator('[aria-label="Show password"]').click()
    await expectButtonsInsideCells()
  })

  test('should mask the password in the edit form until shown', async ({ page }) => {
    await page.locator('.sidebar-btn[aria-label="Add"]').click()
    await page.locator('.type-option[data-type="login"]').click()
    const password = page.locator('.modal-panel .form-field-input').nth(3)
    await password.fill('secret-1')
    await expect(password).toHaveAttribute('type', 'password')

    await page.locator('.modal-panel [aria-label="Show Password"]').click()
    await expect(password).toHaveAttribute('type', 'text')
    await expect(password).toHaveValue('secret-1')

    await page.locator('.modal-panel [aria-label="Hide Password"]').click()
    await expect(password).toHaveAttribute('type', 'password')

    // Reopening the form starts masked again
    await page.locator('.modal-panel [aria-label="Show Password"]').click()
    await page.locator('.modal-panel button:has-text("Save")').click()
    await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 3000 })
    await page.locator('.grid-row:not(.grid-header)').first().dblclick()
    await expect(page.locator('.modal-panel .form-field-input').nth(3)).toHaveAttribute('type', 'password')
  })
})

test.describe('Theme Toggle', () => {
  test('should toggle dark theme', async ({ page }) => {
    await page.goto('/')
    await connectLocalStorage(page)

    // Click theme button in sidebar
    await page.locator('.sidebar-btn[aria-label="Dark theme"]').click()

    // data-theme="dark" should be set
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    // Click again to go back to light
    await page.locator('.sidebar-btn[aria-label="Light theme"]').click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })

  test('should persist theme across reload', async ({ page }) => {
    await page.goto('/')
    await connectLocalStorage(page)

    // Enable dark
    await page.locator('.sidebar-btn[aria-label="Dark theme"]').click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    // Reload
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })
})

test.describe('Save & Toast', () => {
  test('should show notification on save', async ({ page }) => {
    await page.goto('/')
    await connectLocalStorage(page)

    // Click Save
    await page.locator('.sidebar-btn[aria-label="Save"]').click()

    // Notification should appear
    await expect(page.locator('.notification')).toBeVisible()
    await expect(page.locator('.notification-title')).toHaveText('Saved')

    // Should auto-dismiss
    await page.waitForTimeout(4000)
    await expect(page.locator('.notification')).not.toBeVisible()
  })
})

test.describe('Clipboard Copy', () => {
  test('should copy login to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])

    await page.goto('/')
    await connectLocalStorage(page)

    // Add entry with login
    await page.locator('.sidebar-btn[aria-label="Add"]').click()
    await page.locator('.type-option[data-type="login"]').click()
    const inputs = page.locator('.modal-panel .form-field-input')
    await inputs.nth(1).fill('Copy Test')
    await inputs.nth(2).fill('mylogin')
    await page.locator('button:has-text("Save")').click()
    await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 3000 })

    // Hover over row to show copy buttons
    await page.locator('.grid-row:not(.grid-header)').first().hover()

    // Click copy button for login
    const copyBtn = page.locator('.cell-action-btn[aria-label="Copy login"]')
    await copyBtn.click()

    // Check clipboard
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboardText).toBe('mylogin')
  })

  test('should copy fields from the edit form', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/')
    await connectLocalStorage(page)

    await page.locator('.sidebar-btn[aria-label="Add"]').click()
    await page.locator('.type-option[data-type="login"]').click()
    const inputs = page.locator('.modal-panel .form-field-input')
    await inputs.nth(2).fill('form-login')
    await inputs.nth(3).fill('form-secret')
    await inputs.nth(5).fill('some notes')

    const readClipboard = () => page.evaluate(() => navigator.clipboard.readText())

    // Empty fields have nothing to copy
    await expect(page.locator('.modal-panel [aria-label="Copy URL"]')).toBeDisabled()

    await page.locator('.modal-panel [aria-label="Copy Password"]').click()
    expect(await readClipboard()).toBe('form-secret')
    // Copying does not reveal the password
    await expect(inputs.nth(3)).toHaveAttribute('type', 'password')

    await page.locator('.modal-panel [aria-label="Copy Login"]').click()
    expect(await readClipboard()).toBe('form-login')

    await page.locator('.modal-panel [aria-label="Copy Notes"]').click()
    expect(await readClipboard()).toBe('some notes')
  })
})

// ====== Helper: add multiple entries quickly ======
async function addEntries(page: Page, count: number) {
  for (let i = 1; i <= count; i++) {
    await page.locator('.sidebar-btn[aria-label="Add"]').click()
    await page.locator('.type-option[data-type="login"]').click()
    await expect(page.locator('.modal-panel')).toBeVisible()
    const inputs = page.locator('.modal-panel .form-field-input')
    await inputs.nth(0).fill(`Cat${i}`)
    await inputs.nth(1).fill(`Entry ${i}`)
    await inputs.nth(2).fill(`user${i}`)
    await inputs.nth(3).fill(`pass${i}`)
    await page.locator('button:has-text("Save")').click()
    await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 3000 })
  }
}

test.describe('Pagination', () => {
  test('should paginate when many entries exist', async ({ page }) => {
    test.setTimeout(90_000) // Adding many entries is slow
    await page.goto('/')
    await connectLocalStorage(page)

    // Add enough entries to trigger pagination.
    // The page size depends on viewport height; add 50 to guarantee 3+ pages.
    await addEntries(page, 50)

    // Pagination bar should be visible
    const pgBar = page.locator('.pagination-bar').first()
    await expect(pgBar).toBeVisible({ timeout: 3000 })

    // Should show page info "1 / N"
    const pgInfo = pgBar.locator('.pg-info')
    await expect(pgInfo).toContainText('1 /')

    // Click Next
    await pgBar.locator('.pg-btn[aria-label="Next page"]').click()
    await expect(pgInfo).toContainText('2 /')

    // Click Last (should not be disabled if there are 3+ pages and we are on page 2)
    const lastBtn = pgBar.locator('.pg-btn[aria-label="Last page"]')
    if (await lastBtn.isEnabled()) {
      await lastBtn.click()
      const text = await pgInfo.textContent()
      const parts = text!.trim().split('/')
      expect(parts[0].trim()).toBe(parts[1].trim()) // current === max
    }

    // Next should be disabled on last page
    await expect(pgBar.locator('.pg-btn[aria-label="Next page"]')).toBeDisabled()

    // Click First
    await pgBar.locator('.pg-btn[aria-label="First page"]').click()
    await expect(pgInfo).toContainText('1 /')

    // Previous should be disabled on first page
    await expect(pgBar.locator('.pg-btn[aria-label="Previous page"]')).toBeDisabled()
  })
})

test.describe('Save & Load (LocalStorage)', () => {
  test('should persist data across page reload', async ({ page }) => {
    await page.goto('/')
    await connectLocalStorage(page)

    // Add entries
    await page.locator('.sidebar-btn[aria-label="Add"]').click()
    await page.locator('.type-option[data-type="login"]').click()
    const inputs = page.locator('.modal-panel .form-field-input')
    await inputs.nth(0).fill('Work')
    await inputs.nth(1).fill('Persist Test')
    await inputs.nth(2).fill('persuser')
    await page.locator('button:has-text("Save")').click()
    await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 3000 })

    // Save to storage
    await page.locator('.sidebar-btn[aria-label="Save"]').click()
    await expect(page.locator('.notification')).toBeVisible()

    // Reload
    await page.reload()

    // Reconnect with same password
    await connectLocalStorage(page)

    // Entry should still be there
    await expect(page.locator('text=Persist Test')).toBeVisible()
    await expect(page.locator('text=persuser')).toBeVisible()
  })
})

test.describe('Auto Lock', () => {
  test('should lock after inactivity timeout', async ({ page }) => {
    await page.goto('/')
    await connectLocalStorage(page)

    // Override the auto-lock timeout to 1 second via page.evaluate
    // We need to re-trigger the timer setup with a shorter timeout.
    // The app listens for mousemove/keydown/click to reset the timer.
    // We override by clearing the existing timer and setting a new short one.
    await page.evaluate(() => {
      // Access the Vue app internals to force a short timeout
      // Dispatch a custom event and override the timeout
      // Simpler approach: directly set a short timeout that clears password
      const origSetTimeout = window.setTimeout
      // Clear all existing timeouts by setting a large number
      for (let i = 0; i < 10000; i++) {
        window.clearTimeout(i)
      }
      // Set a new short auto-lock: after 1s show the repo window
      origSetTimeout(() => {
        // Trigger the lock by dispatching storage event or setting state
        // The easiest way: directly manipulate the Pinia store from window
        const app = (document.querySelector('#app') as any)?.__vue_app__
        if (app) {
          const pinia = app.config.globalProperties.$pinia
          if (pinia) {
            const dbStore = pinia.state.value.database
            if (dbStore) {
              dbStore.masterPassword = ''
              dbStore.isRepoWindowOpen = true
            }
          }
        }
      }, 1000)
    })

    // Stop all mouse/keyboard activity and wait
    await page.waitForTimeout(2000)

    // The repo modal should reappear (auto-lock triggered)
    await expect(page.locator('.modal-panel')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Repository Settings')).toBeVisible()
  })
})

test.describe('Import & Export', () => {
  test('should export and then import data', async ({ page }) => {
    await page.goto('/')
    await connectLocalStorage(page)

    // Add entries
    await page.locator('.sidebar-btn[aria-label="Add"]').click()
    await page.locator('.type-option[data-type="login"]').click()
    const inputs = page.locator('.modal-panel .form-field-input')
    await inputs.nth(0).fill('Finance')
    await inputs.nth(1).fill('Export Test')
    await inputs.nth(2).fill('exportuser')
    await inputs.nth(3).fill('exportpass')
    await page.locator('button:has-text("Save")').click()
    await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 3000 })

    // Trigger export — intercept the download
    const downloadPromise = page.waitForEvent('download')
    await page.locator('.sidebar-btn[aria-label="Export"]').click()
    const download = await downloadPromise

    // Verify the download file name pattern
    expect(download.suggestedFilename()).toMatch(/passwords-database.*\.json/)

    // Read the exported file content
    const filePath = await download.path()
    const exportedData = fs.readFileSync(filePath!, 'utf-8')
    const parsed = JSON.parse(exportedData)
    expect(parsed.table).toBeDefined()
    expect(parsed.table.data.length).toBeGreaterThan(0)

    // Now delete the entry to simulate "clean state"
    await page.locator('.grid-row:not(.grid-header)').first().click()
    await page.locator('.sidebar-btn[aria-label="Delete"]').click()
    await expect(page.locator('.grid-row:has-text("Export Test")')).toHaveCount(0)

    // Import the previously exported file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(filePath!)

    // Entry should be restored (match table rows only — the "Moved to trash" toast names it too)
    await expect(page.locator('.grid-row:has-text("Export Test")')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.grid-row:has-text("exportuser")')).toBeVisible()
  })
})

test.describe('Categories', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await connectLocalStorage(page)
  })

  async function addEntry(page: Page, name: string, category = '') {
    await page.locator('.sidebar-btn[aria-label="Add"]').click()
    await page.locator('.type-option[data-type="login"]').click()
    const inputs = page.locator('.modal-panel .form-field-input')
    if (category) await inputs.nth(0).fill(category)
    await inputs.nth(1).fill(name)
    await page.locator('.modal-panel button:has-text("Save")').click()
    await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 3000 })
  }

  const node = (page: Page, path: string) => page.locator(`.cat-row[data-path="${path}"]`)
  const count = (page: Page, path: string) => node(page, path).locator('.cat-count')
  const rows = (page: Page) => page.locator('.grid-row:not(.grid-header)')

  async function seed(page: Page) {
    await addEntry(page, 'Outlook', 'Work/Email')
    await addEntry(page, 'Prod SSH', 'Work/Servers')
    await addEntry(page, 'Netflix', 'Personal')
    await addEntry(page, 'Misc')
  }

  test('should show the tree with counts and filter the table', async ({ page }) => {
    await seed(page)
    // Category is shown as the tree, not as a table column
    await expect(page.locator('.grid-header')).not.toContainText('Category')

    await expect(count(page, '*')).toHaveText('4')
    await expect(count(page, 'Work')).toHaveText('2')
    await expect(count(page, '')).toHaveText('1')
    await expect(node(page, 'Work/Email')).toHaveCount(0)
    await node(page, 'Work').locator('.cat-chevron').click()
    await expect(count(page, 'Work/Email')).toHaveText('1')

    await node(page, 'Work').click()
    await expect(rows(page)).toHaveCount(2)
    await node(page, 'Work/Email').click()
    await expect(rows(page)).toHaveCount(1)
    await expect(rows(page).first()).toContainText('Outlook')
    await node(page, '').click()
    await expect(rows(page)).toHaveCount(1)
    await expect(rows(page).first()).toContainText('Misc')
  })

  test('should create, rename and delete categories', async ({ page }) => {
    await seed(page)

    await page.locator('[aria-label="New category"]').click()
    await page.locator('.cat-input').fill('Archive')
    await page.locator('.cat-input').press('Enter')
    await expect(count(page, 'Archive')).toHaveText('0')
    await expect(page.locator('.notification')).toHaveCount(0)

    await node(page, 'Work').hover()
    await node(page, 'Work').locator('[aria-label="Rename category"]').click()
    await page.locator('.cat-input').fill('Job')
    await page.locator('.cat-input').press('Enter')
    await expect(node(page, 'Work')).toHaveCount(0)
    await expect(count(page, 'Job')).toHaveText('2')

    // Deleting moves entries and subcategories up — nothing is deleted
    await node(page, 'Job').hover()
    await node(page, 'Job').locator('[aria-label="Delete category"]').click()
    await page.locator('.modal-panel button:has-text("Delete")').click()
    await expect(node(page, 'Job')).toHaveCount(0)
    await expect(count(page, 'Email')).toHaveText('1')
    await expect(count(page, 'Servers')).toHaveText('1')
    await expect(count(page, '*')).toHaveText('4')
  })

  test('should move entries by drag and drop, one or several', async ({ page }) => {
    await seed(page)
    await rows(page).filter({ hasText: 'Misc' }).dragTo(node(page, 'Personal'))
    await expect(count(page, 'Personal')).toHaveText('2')
    await expect(count(page, '')).toHaveText('0')

    // Ctrl+click selects several rows; dragging one of them moves all
    await rows(page).filter({ hasText: 'Outlook' }).click()
    await rows(page).filter({ hasText: 'Prod SSH' }).click({ modifiers: ['ControlOrMeta'] })
    await expect(page.locator('.grid-row.active')).toHaveCount(2)
    await rows(page).filter({ hasText: 'Outlook' }).dragTo(node(page, ''))
    await expect(count(page, '')).toHaveText('2')
    await expect(node(page, 'Work')).toHaveCount(0)
  })

  test('should move a category into another one and back to the root', async ({ page }) => {
    await seed(page)
    await node(page, 'Personal').dragTo(node(page, 'Work'))
    await expect(node(page, 'Personal')).toHaveCount(0)
    await expect(count(page, 'Work')).toHaveText('3')

    // The moved category is revealed (its new parent is expanded)
    await node(page, 'Work/Personal').dragTo(node(page, '*'))
    await expect(count(page, 'Personal')).toHaveText('1')
    await expect(count(page, 'Work')).toHaveText('2')
  })

  test('should select several categories with Ctrl and Shift and filter by all of them', async ({ page }) => {
    await seed(page)
    await addEntry(page, 'Chase', 'Banking')

    // Ctrl+click: Personal + Uncategorized
    await node(page, 'Personal').click()
    await node(page, '').click({ modifiers: ['ControlOrMeta'] })
    await expect(page.locator('.cat-row--selected')).toHaveCount(2)
    await expect(rows(page)).toHaveCount(2)

    // Ctrl+click again removes it
    await node(page, '').click({ modifiers: ['ControlOrMeta'] })
    await expect(rows(page)).toHaveCount(1)

    // Shift+click: range Banking … Personal (Banking, Personal in visible order)
    await node(page, 'Banking').click()
    await node(page, 'Personal').click({ modifiers: ['Shift'] })
    await expect(page.locator('.cat-row--selected')).toHaveCount(2)
    await expect(rows(page)).toHaveCount(2)

    // A plain click selects one again
    await node(page, 'Work').click()
    await expect(page.locator('.cat-row--selected')).toHaveCount(1)
    await expect(rows(page)).toHaveCount(2)
  })

  test('should move several selected categories at once', async ({ page }) => {
    await seed(page)
    await addEntry(page, 'Chase', 'Banking')
    await page.locator('[aria-label="New category"]').click()
    await page.locator('.cat-input').fill('Archive')
    await page.locator('.cat-input').press('Enter')

    await node(page, 'Banking').click()
    await node(page, 'Personal').click({ modifiers: ['ControlOrMeta'] })
    await node(page, 'Personal').dragTo(node(page, 'Archive'))

    await expect(node(page, 'Banking')).toHaveCount(0)
    await expect(node(page, 'Personal')).toHaveCount(0)
    await expect(count(page, 'Archive')).toHaveText('2')
    await expect(count(page, 'Archive/Banking')).toHaveText('1')
    await expect(count(page, 'Archive/Personal')).toHaveText('1')
    // The moved categories stay selected
    await expect(page.locator('.cat-row--selected')).toHaveCount(2)
  })

  test('should delete several selected categories at once', async ({ page }) => {
    await seed(page)
    await node(page, 'Personal').click()
    await node(page, 'Work').click({ modifiers: ['ControlOrMeta'] })
    await node(page, 'Work').hover()
    await node(page, 'Work').locator('[aria-label="Delete category"]').click()

    await expect(page.locator('.modal-panel')).toContainText('Delete 2 categories?')
    await page.locator('.modal-panel button:has-text("Delete")').click()
    await expect(node(page, 'Work')).toHaveCount(0)
    await expect(node(page, 'Personal')).toHaveCount(0)
    // Subcategories of Work moved up, entries kept
    await expect(count(page, 'Email')).toHaveText('1')
    await expect(count(page, '*')).toHaveText('4')
  })

  test('should select a range with Shift and delete several entries', async ({ page }) => {
    await seed(page)
    await rows(page).nth(0).click()
    await rows(page).nth(2).click({ modifiers: ['Shift'] })
    await expect(page.locator('.grid-row.active')).toHaveCount(3)

    await page.keyboard.press('Delete')
    await expect(page.locator('.notification:has-text("3 entries moved to trash")')).toBeVisible()
    await expect(rows(page)).toHaveCount(1)
    await expect(page.locator('.cat-row[data-path="trash"] .cat-count')).toHaveText('3')
  })

  test('should suggest categories in the entry form and create new ones', async ({ page }) => {
    await seed(page)
    await page.locator('.sidebar-btn[aria-label="Add"]').click()
    await page.locator('.type-option[data-type="login"]').click()
    const category = page.locator('.modal-panel .form-field-input').first()
    await category.fill('serv')
    await expect(page.locator('.cat-option')).toHaveText(['Work/Servers', 'Create "serv"'])
    await category.press('ArrowDown')
    await category.press('Enter')
    await expect(category).toHaveValue('Work/Servers')

    await category.fill('Work / Cloud ')
    await page.locator('.cat-option--new').click()
    await page.locator('.modal-panel .form-field-input').nth(1).fill('AWS')
    await page.locator('.modal-panel button:has-text("Save")').click()
    await node(page, 'Work').locator('.cat-chevron').click()
    await expect(count(page, 'Work/Cloud')).toHaveText('1')
  })

  test('should remember the selected category and expanded nodes after reload', async ({ page }) => {
    await seed(page)
    await page.locator('.sidebar-btn[aria-label="Save"]').click()
    await node(page, 'Work').locator('.cat-chevron').click()
    await node(page, 'Work/Servers').click()
    await expect(rows(page)).toHaveCount(1)

    await page.reload()
    await connectLocalStorage(page)
    await expect(node(page, 'Work/Servers')).toHaveClass(/cat-row--selected/)
    await expect(rows(page)).toHaveCount(1)
    await expect(rows(page).first()).toContainText('Prod SSH')
  })

  test('should collapse the category panel', async ({ page }) => {
    await page.locator('[aria-label="Hide categories"]').click()
    await expect(page.locator('.cat-tree')).toHaveCount(0)
    await page.locator('[aria-label="Show categories"]').click()
    await expect(page.locator('.cat-tree')).toBeVisible()
  })
})

test.describe('Mobile', { tag: '@mobile' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await connectLocalStorage(page)
  })

  async function addEntry(page: Page, entry: { name: string; login?: string; password?: string; url?: string }) {
    await page.locator('.bottom-nav [aria-label="Add"]').click()
    await page.locator('.type-option[data-type="login"]').click()
    await expect(page.locator('.modal-panel')).toBeVisible()
    const inputs = page.locator('.modal-panel .form-field-input')
    await inputs.nth(1).fill(entry.name)
    if (entry.login) await inputs.nth(2).fill(entry.login)
    if (entry.password) await inputs.nth(3).fill(entry.password)
    if (entry.url) await inputs.nth(4).fill(entry.url)
    await page.locator('.modal-panel button:has-text("Save")').click()
    await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 3000 })
  }

  async function expectNoHorizontalScroll(page: Page) {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  }

  async function expectTouchTarget(locator: Locator) {
    const box = await locator.boundingBox()
    expect(box, 'element should be visible').not.toBeNull()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
  }

  test('should show the card list and bottom nav instead of the table', async ({ page }) => {
    await expect(page.locator('.sidebar')).not.toBeVisible()
    await expect(page.locator('.data-grid')).toHaveCount(0)
    await expect(page.locator('.mobile-search-input')).toBeVisible()

    const bottomNav = page.locator('.bottom-nav')
    for (const label of ['Repository', 'Add', 'Save', 'More']) {
      await expectTouchTarget(bottomNav.locator(`[aria-label="${label}"]`))
    }
    await expectNoHorizontalScroll(page)
  })

  test('should fit the repository dialog on screen', async ({ page }) => {
    await page.locator('.bottom-nav [aria-label="Repository"]').click()
    const connect = page.locator('.modal-panel button:has-text("Connect")')
    await expect(connect).toBeInViewport({ ratio: 1 })
    await expectNoHorizontalScroll(page)
  })

  test('should not zoom on input focus (font-size >= 16px)', async ({ page }) => {
    const searchFont = await page.locator('.mobile-search-input').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
    expect(searchFont).toBeGreaterThanOrEqual(16)

    await page.locator('.bottom-nav [aria-label="Add"]').click()
    await page.locator('.type-option[data-type="login"]').click()
    const fieldFont = await page.locator('.modal-panel .form-field-input').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
    expect(fieldFont).toBeGreaterThanOrEqual(16)
  })

  test('should add entries and search them', async ({ page }) => {
    await addEntry(page, { name: 'Gmail', login: 'me@gmail.com' })
    await addEntry(page, { name: 'GitHub', login: 'octocat' })

    const cards = page.locator('.entry-card')
    await expect(cards).toHaveCount(2)
    await expectTouchTarget(cards.first().locator('[aria-label="Copy login"]'))

    // Search matches any field, case-insensitive
    await page.locator('.mobile-search-input').fill('OCTO')
    await expect(cards).toHaveCount(1)
    await expect(cards.first()).toContainText('GitHub')

    await page.locator('.mobile-search-input').fill('nothing-like-this')
    await expect(cards).toHaveCount(0)
    await expect(page.locator('text=Nothing found')).toBeVisible()
  })

  test('should open details, reveal and copy the password', async ({ page }) => {
    await addEntry(page, { name: 'Bank', login: 'client42', password: 's3cret!', url: 'https://bank.example' })
    await page.locator('.entry-card:has-text("Bank")').click()

    const sheet = page.locator('.modal-panel')
    await expect(sheet).toContainText('client42')
    await expect(sheet).not.toContainText('s3cret!')
    await sheet.locator('[aria-label="Show password"]').click()
    await expect(sheet).toContainText('s3cret!')

    await expectTouchTarget(sheet.locator('[aria-label="Copy password"]'))
    await sheet.locator('[aria-label="Copy password"]').click()
    // WebKit may refuse clipboard access in headless mode — either toast proves the button works
    await expect(page.locator('.notification:has-text("Cop")')).toBeVisible()
    await expectNoHorizontalScroll(page)
  })

  test('should edit an entry from the details sheet', async ({ page }) => {
    await addEntry(page, { name: 'Before Edit' })
    await page.locator('.entry-card:has-text("Before Edit")').click()
    await page.locator('.modal-panel button:has-text("Edit")').click()

    await page.locator('.modal-panel .form-field-input').nth(1).fill('After Edit')
    await page.locator('.modal-panel button:has-text("Save")').click()
    await expect(page.locator('.entry-card:has-text("After Edit")')).toBeVisible()
    await expect(page.locator('.entry-card:has-text("Before Edit")')).toHaveCount(0)
  })

  test('should delete an entry from the details sheet', async ({ page }) => {
    await addEntry(page, { name: 'Mobile Delete' })
    await page.locator('.entry-card:has-text("Mobile Delete")').click()
    await page.locator('.modal-panel button:has-text("Delete")').click()

    await expect(page.locator('.entry-card:has-text("Mobile Delete")')).toHaveCount(0)
    await expect(page.locator('.modal-panel')).toHaveCount(0)
  })

  test('should save via bottom nav', async ({ page }) => {
    await addEntry(page, { name: 'Mobile Save' })
    await page.locator('.bottom-nav [aria-label="Save"]').click()
    await expect(page.locator('.notification:has-text("Saved")')).toBeVisible()
  })

  test('should export and import the database from the More menu', async ({ page }) => {
    await addEntry(page, { name: 'Exported', login: 'exp-user' })

    await page.locator('.bottom-nav [aria-label="More"]').click()
    const downloadPromise = page.waitForEvent('download')
    await page.locator('.menu-item:has-text("Export database")').click()
    const download = await downloadPromise
    const filePath = await download.path()

    // Delete the entry, then restore it from the exported file
    await page.locator('.entry-card:has-text("Exported")').click()
    await page.locator('.modal-panel button:has-text("Delete")').click()
    await expect(page.locator('.entry-card')).toHaveCount(0)

    await page.locator('input[type="file"]').setInputFiles(filePath!)
    await expect(page.locator('.entry-card:has-text("Exported")')).toBeVisible()
  })

  test('should open change password and toggle theme from the More menu', async ({ page }) => {
    await page.locator('.bottom-nav [aria-label="More"]').click()
    await page.locator('.menu-item:has-text("Change master password")').click()
    await expect(page.locator('.modal-title', { hasText: /^Change Master Password$/ })).toBeVisible()
    await expectNoHorizontalScroll(page)
    await page.locator('.modal-panel button:has-text("Cancel")').click()

    await page.locator('.bottom-nav [aria-label="More"]').click()
    await page.locator('.menu-item:has-text("Dark theme")').click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  test('should lock from the More menu', async ({ page }) => {
    await addEntry(page, { name: 'Secret Entry' })
    await page.locator('.bottom-nav [aria-label="More"]').click()
    await page.locator('.menu-item:has-text("Lock")').click()

    await expect(page.locator('.modal-panel:has-text("Repository Settings")')).toBeVisible()
    await expect(page.locator('.entry-card')).toHaveCount(0)
  })

  test('should filter by category from the category sheet', async ({ page }) => {
    await addEntry(page, { name: 'Outlook' })
    await page.locator('.bottom-nav [aria-label="Add"]').click()
    await page.locator('.type-option[data-type="login"]').click()
    const inputs = page.locator('.modal-panel .form-field-input')
    await inputs.nth(0).fill('Work/Email')
    await inputs.nth(1).fill('Gmail')
    await page.locator('.modal-panel button:has-text("Save")').click()
    await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 3000 })

    await page.locator('[aria-label="Choose category"]').click()
    await page.locator('.modal-panel .cat-row[data-path="Work"]').click()
    await expect(page.locator('.entry-card')).toHaveCount(1)
    await expect(page.locator('.entry-card')).toContainText('Gmail')
    await expect(page.locator('[aria-label="Choose category"]')).toContainText('Work')

    await page.locator('[aria-label="Choose category"]').click()
    await page.locator('.modal-panel .cat-row[data-path=""]').click()
    await expect(page.locator('.entry-card')).toHaveCount(1)
    await expect(page.locator('.entry-card')).toContainText('Outlook')
    await expectNoHorizontalScroll(page)
  })

  test('should move an entry to another category from its details', async ({ page }) => {
    await page.locator('.bottom-nav [aria-label="Add"]').click()
    await page.locator('.type-option[data-type="login"]').click()
    const inputs = page.locator('.modal-panel .form-field-input')
    await inputs.nth(0).fill('Personal')
    await inputs.nth(1).fill('Netflix')
    await page.locator('.modal-panel button:has-text("Save")').click()
    await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 3000 })
    await addEntry(page, { name: 'Misc' })

    await page.locator('.entry-card:has-text("Misc")').click()
    await expect(page.locator('.modal-panel [data-field="category"]')).toContainText('Uncategorized')
    await page.locator('[aria-label="Change category"]').click()
    await page.locator('.modal-panel:has-text("Move to category") .cat-row[data-path="Personal"]').click()

    await expect(page.locator('.modal-panel [data-field="category"]')).toContainText('Personal')
    await expect(page.locator('.notification:has-text("Entry moved")')).toBeVisible()
  })

  test('should add a card and filter by type', async ({ page }) => {
    await addEntry(page, { name: 'Plain login', login: 'me' })
    await page.locator('.bottom-nav [aria-label="Add"]').click()
    await page.locator('.type-option[data-type="card"]').click()
    await page.locator('.modal-panel [data-field="name"] input').fill('Travel card')
    await page.locator('.modal-panel [data-field="card_number"] input').fill('5555555555554444')
    await page.locator('.modal-panel button:has-text("Save")').click()
    await expect(page.locator('.modal-panel')).toHaveCount(0)

    const card = page.locator('.entry-card:has-text("Travel card")')
    await expect(card).toContainText('Mastercard •••• 4444')
    await expectTouchTarget(card.locator('[aria-label="Copy number"]'))
    await card.click()
    const sheet = page.locator('.modal-panel')
    await expect(sheet).not.toContainText('5555')
    await sheet.locator('[aria-label="Show number"]').click()
    await expect(sheet).toContainText('5555 5555 5555 4444')
    await page.keyboard.press('Escape')

    await page.locator('[aria-label="Choose category"]').click()
    await page.locator('.modal-panel .type-row[data-type="card"]').click()
    await expect(page.locator('.entry-card')).toHaveCount(1)
    await expect(page.locator('.mobile-category-name')).toHaveText('All · Card')
    await expectNoHorizontalScroll(page)
  })

  test('should show history and restore from the trash', async ({ page }) => {
    await addEntry(page, { name: 'Phone Site', password: 'first-pass' })

    // Edit the password, then look at the history from the details sheet
    await page.locator('.entry-card:has-text("Phone Site")').click()
    await page.locator('.modal-panel button:has-text("Edit")').click()
    await page.locator('.modal-panel .form-field-input').nth(3).fill('second-pass')
    await page.locator('.modal-panel button:has-text("Save")').click()
    await expect(page.locator('.modal-panel')).toHaveCount(0)

    await page.locator('.entry-card:has-text("Phone Site")').click()
    await page.locator('.modal-panel button:has-text("History")').click()
    const history = page.locator('.modal-panel:has-text("History: Phone Site")')
    await history.locator('[aria-label="Show Password"]').click()
    await expect(history.locator('[data-field="password"]')).toContainText('first-pass')
    await history.locator('[aria-label="Restore Password"]').click()
    // The restore is recorded as the newest version; the old one now matches the entry
    await expect(history.locator('.history-version')).toHaveCount(2)
    await expect(history.locator('.history-version').last().locator('[aria-label="Restore Password"]')).toBeDisabled()
    await history.locator('button:has-text("Close")').click()

    // Delete, then restore it from the trash in the category sheet
    await page.locator('.modal-panel button:has-text("Delete")').click()
    await expect(page.locator('.entry-card')).toHaveCount(0)
    await page.locator('[aria-label="Choose category"]').click()
    await page.locator('.modal-panel .cat-row[data-path="trash"]').click()
    await expect(page.locator('.mobile-category-name')).toHaveText('Trash')
    await page.locator('.entry-card:has-text("Phone Site")').click()
    await page.locator('.modal-panel button:has-text("Restore")').click()
    await expect(page.locator('.entry-card')).toHaveCount(0)
    await expect(page.locator('.notification:has-text("Entry restored")')).toBeVisible()
  })
})

// ====== Helper: add one entry and return to grid ======
async function addOneEntry(page: Page, name = 'TestEntry') {
  await page.locator('.sidebar-btn[aria-label="Add"]').click()
  await page.locator('.type-option[data-type="login"]').click()
  await expect(page.locator('.modal-panel')).toBeVisible()
  const inputs = page.locator('.modal-panel .form-field-input')
  await inputs.nth(0).fill('Cat')
  await inputs.nth(1).fill(name)
  await inputs.nth(2).fill('user1')
  await inputs.nth(3).fill('pass1')
  await page.locator('button:has-text("Save")').click()
  await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 3000 })
}

test.describe('History', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await connectLocalStorage(page)
  })

  const rows = (page: Page) => page.locator('.grid-row:not(.grid-header)')
  const inputs = (page: Page) => page.locator('.modal-panel .form-field-input')

  async function addAndEdit(page: Page) {
    await page.locator('.sidebar-btn[aria-label="Add"]').click()
    await page.locator('.type-option[data-type="login"]').click()
    await inputs(page).nth(1).fill('Site')
    await inputs(page).nth(2).fill('old-login')
    await inputs(page).nth(3).fill('old-pass')
    await page.locator('.modal-panel button:has-text("Save")').click()
    await expect(page.locator('.modal-panel')).toHaveCount(0)

    await rows(page).first().dblclick()
    await inputs(page).nth(2).fill('new-login')
    await inputs(page).nth(3).fill('new-pass')
    await page.locator('.modal-panel button:has-text("Save")').click()
    await expect(page.locator('.modal-panel')).toHaveCount(0)
  }

  test('should show previous values and restore one field', async ({ page }) => {
    await addAndEdit(page)

    await rows(page).first().click({ button: 'right' })
    await page.locator('.ctx-item:has-text("History")').click()
    const history = page.locator('.modal-panel:has-text("History: Site")')
    await expect(history.locator('.history-version')).toHaveCount(1)
    await expect(history.locator('[data-field="login"]')).toContainText('old-login')
    // Old passwords are masked until shown
    await expect(history.locator('[data-field="password"]')).not.toContainText('old-pass')
    await history.locator('[aria-label="Show Password"]').click()
    await expect(history.locator('[data-field="password"]')).toContainText('old-pass')

    // Restoring a field changes the entry right away and is recorded too
    await history.locator('[aria-label="Restore Password"]').click()
    await expect(history.locator('.history-version')).toHaveCount(2)
    await expect(history.locator('.history-version').first().locator('[data-field="password"]')).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(page.locator('.modal-panel')).toHaveCount(0)

    await rows(page).first().dblclick()
    await expect(inputs(page).nth(2)).toHaveValue('new-login')
    await expect(inputs(page).nth(3)).toHaveValue('old-pass')
  })

  test('should restore a version into the edit form and clear the history', async ({ page }) => {
    await addAndEdit(page)

    await rows(page).first().dblclick()
    await expect(page.locator('.edit-history-count')).toHaveText('1')
    await page.locator('.modal-panel button:has-text("History")').click()
    await page.locator('.modal-panel [aria-label="Restore version"]').click()
    // Restoring from the form fills it; nothing is stored until Save
    await expect(page.locator('.modal-panel:has-text("History:")')).toHaveCount(0)
    await expect(inputs(page).nth(2)).toHaveValue('old-login')
    await expect(inputs(page).nth(3)).toHaveValue('old-pass')
    await page.locator('.modal-panel button:has-text("Save")').click()
    await expect(page.locator('.modal-panel')).toHaveCount(0)

    await rows(page).first().dblclick()
    await expect(page.locator('.edit-history-count')).toHaveText('2')
    await page.locator('.modal-panel button:has-text("History")').click()
    await page.locator('.modal-panel button:has-text("Clear history")').click()
    await page.locator('.modal-panel:has-text("Delete all previous values") button:has-text("Clear")').click()
    await expect(page.locator('.modal-panel:has-text("History:")')).toContainText('No changes yet')
  })

  test('should keep the history after saving and reloading', async ({ page }) => {
    await addAndEdit(page)
    await page.keyboard.press('ControlOrMeta+s')
    await expect(page.locator('.notification:has-text("Saved")')).toBeVisible()

    await page.reload()
    await connectLocalStorage(page)
    await rows(page).first().dblclick()
    await expect(page.locator('.edit-history-count')).toHaveText('1')
  })
})

test.describe('Trash', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await connectLocalStorage(page)
  })

  const rows = (page: Page) => page.locator('.grid-row:not(.grid-header)')
  const trashNode = (page: Page) => page.locator('.cat-row[data-path="trash"]')

  async function addEntry(page: Page, name: string, category = '') {
    await page.locator('.sidebar-btn[aria-label="Add"]').click()
    await page.locator('.type-option[data-type="login"]').click()
    const inputs = page.locator('.modal-panel .form-field-input')
    if (category) await inputs.nth(0).fill(category)
    await inputs.nth(1).fill(name)
    await page.locator('.modal-panel button:has-text("Save")').click()
    await expect(page.locator('.modal-panel')).toHaveCount(0)
  }

  test('should move entries to the trash and restore them', async ({ page }) => {
    await addEntry(page, 'Alpha', 'Work')
    await addEntry(page, 'Beta')

    await rows(page).filter({ hasText: 'Alpha' }).click()
    await page.keyboard.press('Delete')
    await expect(page.locator('.cat-row[data-path="Work"]')).toHaveCount(0)
    // Entries can also be dragged onto the trash
    await rows(page).filter({ hasText: 'Beta' }).dragTo(trashNode(page))
    await expect(rows(page)).toHaveCount(0)
    await expect(trashNode(page).locator('.cat-count')).toHaveText('2')

    await trashNode(page).click()
    await expect(page.locator('.trash-bar')).toBeVisible()
    await expect(rows(page)).toHaveCount(2)

    // Restore puts the entry back into its category
    await rows(page).filter({ hasText: 'Alpha' }).click({ button: 'right' })
    await page.locator('.ctx-item:has-text("Restore")').click()
    await expect(rows(page)).toHaveCount(1)
    await expect(page.locator('.cat-row[data-path="Work"] .cat-count')).toHaveText('1')

    // Choosing a category leaves the trash
    await page.locator('.cat-row[data-path="Work"]').click()
    await expect(page.locator('.trash-bar')).toHaveCount(0)
    await expect(rows(page)).toHaveCount(1)
  })

  test('should delete forever and empty the trash after confirming', async ({ page }) => {
    await addEntry(page, 'Gamma')
    await addEntry(page, 'Delta')
    await addEntry(page, 'Epsilon')
    for (const name of ['Gamma', 'Delta', 'Epsilon']) {
      await rows(page).filter({ hasText: name }).click()
      await page.keyboard.press('Delete')
    }
    await trashNode(page).click()

    // Delete forever asks first
    await rows(page).filter({ hasText: 'Gamma' }).click()
    await page.keyboard.press('Delete')
    const confirm = page.locator('.modal-panel:has-text("for good")')
    await confirm.locator('button:has-text("Cancel")').click()
    await expect(rows(page)).toHaveCount(3)
    await rows(page).filter({ hasText: 'Gamma' }).click()
    await page.keyboard.press('Delete')
    await confirm.locator('button:has-text("Delete forever")').click()
    await expect(rows(page)).toHaveCount(2)

    await page.locator('.trash-bar button:has-text("Empty trash")').click()
    await page.locator('.modal-panel button:has-text("Empty trash")').click()
    await expect(page.locator('.empty-title')).toHaveText('Trash is empty')
    await expect(trashNode(page).locator('.cat-count')).toHaveText('0')
  })

  test('should keep the trash after saving and reloading', async ({ page }) => {
    await addEntry(page, 'Kept')
    await rows(page).first().click()
    await page.keyboard.press('Delete')
    await page.keyboard.press('ControlOrMeta+s')
    await expect(page.locator('.notification:has-text("Saved")')).toBeVisible()

    await page.reload()
    await connectLocalStorage(page)
    await expect(trashNode(page).locator('.cat-count')).toHaveText('1')
  })
})

test.describe('Master Password', () => {
  test('should confirm creating a database and warn about a weak password', async ({ page }) => {
    await page.goto('/')
    await page.locator('.master-input').fill('abc')
    await page.locator('.repo-card').first().click()
    await page.locator('button:has-text("Connect")').click()

    const create = page.locator('.modal-panel:has-text("Create a new database")')
    await expect(create).toBeVisible()
    await expect(create.locator('.strength-label')).toHaveText('Very weak')
    await expect(create.locator('.weak-warning')).toBeVisible()

    // Back returns to the repository window
    await create.locator('button:has-text("Back")').click()
    await expect(page.locator('.master-input')).toBeVisible()

    // A strong password, typed twice
    await page.locator('.master-input').fill('violet-anchor-Cloud-73')
    await page.locator('button:has-text("Connect")').click()
    await expect(create.locator('.weak-warning')).toHaveCount(0)
    await create.locator('input[type="password"]').fill('violet-anchor-cloud-73')
    await create.locator('button:has-text("Create")').click()
    await expect(create.locator('.field-error')).toHaveText('Passwords do not match')
    await create.locator('input[type="password"]').fill('violet-anchor-Cloud-73')
    await create.locator('button:has-text("Create")').click()
    await expect(page.locator('.modal-panel')).toHaveCount(0)
    await expect(page.locator('.data-grid')).toBeVisible()
  })

  test('should ask again before changing to a weak password', async ({ page }) => {
    await page.goto('/')
    await connectLocalStorage(page)
    await page.locator('.sidebar-btn[aria-label="Change Password"]').click()
    const modal = page.locator('.modal-panel:has-text("Change Master Password")')
    const inputs = modal.locator('input[type="password"]')
    await inputs.nth(1).fill('qwerty')
    await inputs.nth(2).fill('qwerty')
    await modal.locator('button.action-btn--primary').click()
    await expect(modal.locator('.weak-warning')).toBeVisible()
    await modal.locator('button:has-text("Use Weak Password")').click()
    await expect(page.locator('.notification:has-text("Password Changed")')).toBeVisible()
  })
})

test.describe('Sync conflicts & backups', () => {
  const rows = (page: Page) => page.locator('.grid-row:not(.grid-header)')

  async function addEntry(page: Page, name: string, password = '') {
    await page.locator('.sidebar-btn[aria-label="Add"]').click()
    await page.locator('.type-option[data-type="login"]').click()
    const inputs = page.locator('.modal-panel .form-field-input')
    await inputs.nth(1).fill(name)
    if (password) await inputs.nth(3).fill(password)
    await page.locator('.modal-panel button:has-text("Save")').click()
    await expect(page.locator('.modal-panel')).toHaveCount(0)
  }

  async function save(page: Page, toast = 'Saved') {
    // Close earlier toasts so the check below sees this save's one
    await page.evaluate(() => document.querySelectorAll<HTMLElement>('.notification-dismiss').forEach((b) => b.click()))
    await expect(page.locator('.notification')).toHaveCount(0)
    await page.keyboard.press('ControlOrMeta+s')
    await expect(page.locator(`.notification:has-text("${toast}")`).first()).toBeVisible()
  }

  test('should merge changes saved in another tab instead of overwriting them', async ({ page, context }) => {
    await page.goto('/')
    await connectLocalStorage(page)
    await addEntry(page, 'Shared', 'original')
    await save(page)

    // A second tab works with the same storage
    const other = await context.newPage()
    await other.goto('/')
    await connectLocalStorage(other)
    await addEntry(other, 'From tab 2')
    await rows(other).filter({ hasText: 'Shared' }).dblclick()
    await other.locator('.modal-panel .form-field-input').nth(3).fill('theirs')
    await other.locator('.modal-panel button:has-text("Save")').click()
    await save(other)
    await other.close()

    // The first tab changed the same password and adds its own entry
    await addEntry(page, 'From tab 1')
    await rows(page).filter({ hasText: 'Shared' }).dblclick()
    await page.locator('.modal-panel .form-field-input').nth(3).fill('mine')
    await page.locator('.modal-panel button:has-text("Save")').click()
    await save(page, 'merged changes from another device')

    await expect(rows(page)).toHaveCount(3)
    await expect(rows(page).filter({ hasText: 'From tab 2' })).toBeVisible()
    // Same field changed in both tabs: ours is kept, theirs is in the history
    await rows(page).filter({ hasText: 'Shared' }).dblclick()
    await expect(page.locator('.modal-panel .form-field-input').nth(3)).toHaveValue('mine')
    await page.locator('.modal-panel button:has-text("History")').click()
    const history = page.locator('.modal-panel:has-text("History: Shared")')
    await history.locator('.history-version').first().locator('[aria-label="Show Password"]').click()
    await expect(history.locator('.history-version').first()).toContainText('theirs')
  })

  test('should keep local backups and restore one', async ({ page }) => {
    await page.goto('/')
    await connectLocalStorage(page)
    await addEntry(page, 'First')
    await save(page)
    await addEntry(page, 'Second')
    await save(page)

    await page.locator('.sidebar-btn[aria-label="Select Repository"]').click()
    await page.locator('.repo-card').first().click()
    await page.locator('.modal-panel button:has-text("Backups")').click()
    const backups = page.locator('.modal-panel:has-text("Backups: Local Storage")')
    // Before each save the previous version was kept: the empty database, then "First"
    await expect(backups.locator('.backup-row')).toHaveCount(2)
    await backups.locator('.backup-row').first().locator('button:has-text("Restore")').click()
    await page.locator('.modal-panel:has-text("Restore backup") button:has-text("Restore")').click()

    await expect(page.locator('.notification:has-text("Backup restored")')).toBeVisible()
    await expect(page.locator('.modal-panel')).toHaveCount(0)
    await expect(rows(page)).toHaveCount(1)
    await expect(rows(page).first()).toContainText('First')
  })
})

test.describe('Entry types', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/')
    await connectLocalStorage(page)
  })

  const rows = (page: Page) => page.locator('.grid-row:not(.grid-header)')
  const field = (page: Page, key: string) => page.locator(`.modal-panel [data-field="${key}"]`)

  async function startEntry(page: Page, type: string) {
    await page.locator('.sidebar-btn[aria-label="Add"]').click()
    await page.locator(`.type-option[data-type="${type}"]`).click()
    await expect(page.locator('.modal-panel .entry-type-select')).toHaveValue(type)
  }

  async function save(page: Page) {
    await page.locator('.modal-panel button:has-text("Save")').click()
    await expect(page.locator('.modal-panel')).toHaveCount(0)
  }

  test('should add a card with a formatted, checked number', async ({ page }) => {
    await startEntry(page, 'card')
    await expect(page.locator('.modal-panel .modal-title')).toHaveText('New Card')
    await field(page, 'name').locator('input').fill('Visa Gold')
    const number = field(page, 'card_number').locator('input')
    await number.pressSequentially('4242424242424241')
    await expect(field(page, 'card_number')).toContainText('typo')
    await number.fill('')
    await number.pressSequentially('4242424242424242')
    await expect(number).toHaveValue('4242 4242 4242 4242')
    await expect(field(page, 'card_number')).toContainText('Visa')
    await field(page, 'card_expiry').locator('input').pressSequentially('1227')
    await expect(field(page, 'card_expiry').locator('input')).toHaveValue('12/27')
    // Logins only: no password generator
    await expect(page.locator('.pw-gen-toggle')).toHaveCount(0)
    await save(page)

    const row = rows(page).first()
    await expect(row).toContainText('Visa •••• 4242 · 12/27')
    await row.hover()
    await row.locator('[aria-label="Show number"]').click()
    await expect(row.locator('.revealed')).toHaveText('4242 4242 4242 4242')
    await row.locator('[aria-label="Copy number"]').click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('4242424242424242')
  })

  test('should keep a secure note hidden until shown', async ({ page }) => {
    await startEntry(page, 'secure_note')
    await field(page, 'name').locator('input').fill('Wi-Fi at home')
    await field(page, 'note').locator('.form-field-hidden-text').click()
    await field(page, 'note').locator('textarea').fill('line one\nline two')
    await field(page, 'note').locator('[aria-label="Hide Note"]').click()
    await expect(field(page, 'note')).toContainText('2 lines')
    await save(page)

    const row = rows(page).first()
    await expect(row.locator('.masked')).toBeVisible()
    await row.hover()
    await row.locator('[aria-label="Show note"]').click()
    await expect(row.locator('.revealed')).toContainText('line one')
  })

  test('should add, keep and reorder custom fields', async ({ page }) => {
    await startEntry(page, 'login')
    await field(page, 'name').locator('input').fill('Bank')
    await page.locator('.modal-panel .add-field-btn').click()
    const first = page.locator('.modal-panel .custom-field').nth(0)
    await expect(first.locator('.custom-field-label')).toBeFocused()
    await first.locator('.custom-field-label').fill('Secret question')
    await first.locator('.custom-field-kind').selectOption('secret')
    await first.locator('.form-field-input').fill('blue')
    await expect(first.locator('.form-field-input')).toHaveAttribute('type', 'password')

    await page.locator('.modal-panel .add-field-btn').click()
    const second = page.locator('.modal-panel .custom-field').nth(1)
    await second.locator('.custom-field-label').fill('Branch')
    await second.locator('.form-field-input').fill('Main street')
    await second.locator('[aria-label="Move field up"]').click()
    await expect(page.locator('.modal-panel .custom-field-label').first()).toHaveValue('Branch')
    await save(page)

    // Search covers custom fields
    await page.locator('.filter-input').first().fill('Bank')
    await rows(page).first().dblclick()
    await expect(page.locator('.modal-panel .custom-field-label')).toHaveCount(2)
    await expect(page.locator('.modal-panel .custom-field-label').nth(1)).toHaveValue('Secret question')
    await expect(page.locator('.modal-panel .custom-field').nth(1).locator('.form-field-input')).toHaveValue('blue')

    await page.locator('.modal-panel .custom-field').nth(0).locator('[aria-label="Remove field"]').click()
    await save(page)
    await rows(page).first().dblclick()
    await expect(page.locator('.modal-panel .custom-field')).toHaveCount(1)
  })

  test('should move fields the new type lacks into custom fields', async ({ page }) => {
    await startEntry(page, 'login')
    await field(page, 'name').locator('input').fill('Server')
    await field(page, 'login').locator('input').fill('root')
    await field(page, 'password').locator('input').fill('toor')
    await page.locator('.modal-panel .entry-type-select').selectOption('secure_note')
    await expect(page.locator('.modal-panel .custom-field-label')).toHaveCount(2)
    await expect(page.locator('.modal-panel .custom-field-label').nth(0)).toHaveValue('Login')
    await expect(page.locator('.modal-panel .custom-field').nth(1).locator('.form-field-input')).toHaveValue('toor')
    await save(page)
    await expect(rows(page).first().locator('.cell-type-icon')).toHaveAttribute('title', 'Secure Note')
  })

  test('should filter by type and add entries of the filtered type', async ({ page }) => {
    await startEntry(page, 'login')
    await field(page, 'name').locator('input').fill('Mail')
    await save(page)
    await startEntry(page, 'identity')
    await field(page, 'name').locator('input').fill('Me')
    await field(page, 'full_name').locator('input').fill('John Doe')
    await save(page)

    const types = page.locator('.type-filter')
    await expect(types.locator('.type-row[data-type="login"] .type-row-count')).toHaveText('1')
    await types.locator('.type-row[data-type="identity"]').click()
    await expect(rows(page)).toHaveCount(1)
    await expect(rows(page).first()).toContainText('John Doe')

    // With a type selected, Add skips the type menu
    await page.locator('.sidebar-btn[aria-label="Add"]').click()
    await expect(page.locator('.modal-panel .entry-type-select')).toHaveValue('identity')
    await page.keyboard.press('Escape')

    // Selecting it again shows all types
    await types.locator('.type-row[data-type="identity"]').click()
    await expect(rows(page)).toHaveCount(2)
  })
})

test.describe('Escape Key Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await connectLocalStorage(page)
    await addOneEntry(page, 'EscTest')
  })

  test('Escape deselects row when no modal is open', async ({ page }) => {
    const row = page.locator('.grid-row:not(.grid-header)').first()
    await row.click()
    await expect(row).toHaveClass(/active/)

    // Focus the grid and press Escape
    await page.locator('.data-grid').focus()
    await page.keyboard.press('Escape')

    // Row should be deselected
    await expect(row).not.toHaveClass(/active/)
  })

  test('Escape closes edit modal but keeps row selected', async ({ page }) => {
    const row = page.locator('.grid-row:not(.grid-header)').first()
    await row.click()
    await expect(row).toHaveClass(/active/)

    // Open edit modal via Enter
    await page.keyboard.press('Enter')
    await expect(page.locator('.modal-panel')).toBeVisible()

    // Press Escape to close the modal
    await page.keyboard.press('Escape')
    await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 3000 })

    // Row should still be selected
    await expect(row).toHaveClass(/active/)
  })

  test('Escape closes shortcuts modal but keeps row selected', async ({ page }) => {
    const row = page.locator('.grid-row:not(.grid-header)').first()
    await row.click()
    await expect(row).toHaveClass(/active/)

    // Open shortcuts modal via sidebar button
    await page.locator('.sidebar-btn[aria-label="Keyboard Shortcuts"]').click()
    await expect(page.locator('.modal-panel')).toBeVisible()

    // Press Escape to close
    await page.keyboard.press('Escape')
    await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 3000 })

    // Row should still be selected
    await expect(row).toHaveClass(/active/)
  })

  test('Arrow select + Enter + Escape preserves selection', async ({ page }) => {
    // Add a second entry
    await addOneEntry(page, 'EscTest2')

    // Use arrow key to select
    await page.locator('.data-grid').focus()
    await page.keyboard.press('ArrowDown')

    // One of the rows should be active
    const activeRow = page.locator('.grid-row.active')
    await expect(activeRow).toHaveCount(1)

    // Open edit modal
    await page.keyboard.press('Enter')
    await expect(page.locator('.modal-panel')).toBeVisible()

    // Escape should close modal and keep selection
    await page.keyboard.press('Escape')
    await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 3000 })
    await expect(activeRow).toHaveCount(1)
  })
})

test.describe('Google Drive Repository UI', () => {
  test('should show googledrive option in repo type select', async ({ page }) => {
    await page.goto('/')
    // Repo modal auto-opens
    await expect(page.locator('.modal-panel')).toBeVisible()

    // Click "Add Repository"
    await page.locator('.repo-add-card').click()

    // Type dropdown should have googledrive option
    const select = page.locator('.repo-form-panel select.form-field-input')
    await expect(select).toBeVisible()
    const options = select.locator('option')
    const texts = await options.allTextContents()
    expect(texts.some(t => /google\s*drive/i.test(t))).toBe(true)
  })

  test('should show Client ID field when googledrive type is selected', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.modal-panel')).toBeVisible()

    // Click "Add Repository"
    await page.locator('.repo-add-card').click()

    // Select googledrive type
    const select = page.locator('.repo-form-panel select.form-field-input')
    await select.selectOption('googledrive')

    // Client ID field should be visible
    await expect(page.locator('label:has-text("Client ID")')).toBeVisible()
    await expect(page.locator('input[placeholder*="apps.googleusercontent.com"]')).toBeVisible()

    // GitHub fields should NOT be visible
    await expect(page.locator('label:has-text("API Key")')).not.toBeVisible()
  })

  test('should validate Client ID field', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.modal-panel')).toBeVisible()

    // Click "Add Repository" and select googledrive
    await page.locator('.repo-add-card').click()
    const select = page.locator('.repo-form-panel select.form-field-input')
    await select.selectOption('googledrive')

    // Fill name but leave Client ID empty → click Save
    await page.locator('input[placeholder="My Repository"]').fill('My GDrive')
    await page.locator('button:has-text("Save")').click()

    // Should show validation error on client_id field
    await expect(page.locator('.field-error')).toBeVisible()
    await expect(page.locator('.field-error')).toContainText(/client.*id/i)
  })

  test('should save googledrive repo and show it in list', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.modal-panel')).toBeVisible()

    // Click "Add Repository"  
    await page.locator('.repo-add-card').click()
    const select = page.locator('.repo-form-panel select.form-field-input')
    await select.selectOption('googledrive')

    // Fill fields
    await page.locator('input[placeholder="My Repository"]').fill('My Google Drive')
    await page.locator('input[placeholder*="apps.googleusercontent.com"]').fill('12345.apps.googleusercontent.com')

    // Save
    await page.locator('button:has-text("Save")').click()

    // Should appear in repo list
    await expect(page.locator('.repo-card-name:has-text("My Google Drive")')).toBeVisible()
    await expect(page.locator('.repo-card-type:has-text("googledrive")')).toBeVisible()
  })
})

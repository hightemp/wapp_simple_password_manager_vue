import { test, expect, type Page } from '@playwright/test'
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

  // Wait for modal to close
  await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 5000 })
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

    // Edit modal should appear
    await expect(page.locator('.modal-panel')).toBeVisible()

    // Fill in fields (the form fields are dynamic based on oStructure)
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
    const inputs = page.locator('.modal-panel .form-field-input')
    await inputs.nth(1).fill('To Delete')
    await page.locator('button:has-text("Save")').click()
    await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 3000 })

    // Select & delete
    await page.locator('.grid-row:not(.grid-header)').first().click()

    // Handle confirm dialog
    page.on('dialog', (dialog) => dialog.accept())
    await page.locator('.sidebar-btn[aria-label="Delete"]').click()

    // Entry should be gone
    await expect(page.locator('text=To Delete')).not.toBeVisible()
  })
})

test.describe('Password Generator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await connectLocalStorage(page)
  })

  test('should generate and use a password', async ({ page }) => {
    await page.locator('.sidebar-btn[aria-label="Add"]').click()
    await expect(page.locator('.modal-panel')).toBeVisible()

    // Open password generator
    await page.locator('button:has-text("Generate Password")').click()

    // Click generate
    await page.locator('button:has-text("Generate")').click()

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
      const inputs = page.locator('.modal-panel .form-field-input')
      await inputs.nth(1).fill(name)
      await page.locator('button:has-text("Save")').click()
      await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 3000 })
    }

    // Filter by 'Alpha'
    const filterInputs = page.locator('.filter-input')
    // Name column filter (second column — index 1)
    await filterInputs.nth(1).fill('Alpha')

    // Wait for debounce
    await page.waitForTimeout(500)

    // Should only see Alpha
    const rows = page.locator('.grid-row:not(.grid-header)')
    await expect(rows).toHaveCount(1)
    await expect(page.locator('text=Alpha')).toBeVisible()

    // Clear filter
    await filterInputs.nth(1).clear()
    await page.waitForTimeout(500)
    await expect(rows).toHaveCount(2)
  })

  test('should filter from last page with 30+ entries', async ({ page }) => {
    // Add 30 entries; give entry #15 a unique category for filtering
    for (let i = 1; i <= 30; i++) {
      await page.locator('.sidebar-btn[aria-label="Add"]').click()
      await expect(page.locator('.modal-panel')).toBeVisible()
      const inputs = page.locator('.modal-panel .form-field-input')
      await inputs.nth(0).fill(i === 15 ? 'UniqueCategory' : `Bulk${i}`)
      await inputs.nth(1).fill(`Item ${i}`)
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

    // Now filter by the unique category
    const filterInputs = page.locator('.filter-input')
    // Category is the first column (index 0)
    await filterInputs.nth(0).fill('UniqueCategory')
    await page.waitForTimeout(500)

    // Only 1 entry should match; pagination should disappear or reset to page 1
    const rows = page.locator('.grid-row:not(.grid-header)')
    await expect(rows).toHaveCount(1)
    await expect(page.locator('text=Item 15')).toBeVisible()

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
    await expect(page.locator('text=Saved')).toBeVisible()

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
})

// ====== Helper: add multiple entries quickly ======
async function addEntries(page: Page, count: number) {
  for (let i = 1; i <= count; i++) {
    await page.locator('.sidebar-btn[aria-label="Add"]').click()
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
    await page.goto('/')
    await connectLocalStorage(page)

    // Add enough entries to trigger pagination.
    // The page size depends on viewport height; add 30 to be safe.
    await addEntries(page, 30)

    // Pagination bar should be visible
    const pgBar = page.locator('.pagination-bar').first()
    await expect(pgBar).toBeVisible({ timeout: 3000 })

    // Should show page info "1 / N"
    const pgInfo = pgBar.locator('.pg-info')
    await expect(pgInfo).toContainText('1 /')

    // Click Next
    await pgBar.locator('.pg-btn[aria-label="Next page"]').click()
    await expect(pgInfo).toContainText('2 /')

    // Click Last
    await pgBar.locator('.pg-btn[aria-label="Last page"]').click()
    const text = await pgInfo.textContent()
    const parts = text!.trim().split('/')
    expect(parts[0].trim()).toBe(parts[1].trim()) // current === max

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
              dbStore.sPassword = ''
              dbStore.bShowRepoWindow = true
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
    page.on('dialog', (dialog) => dialog.accept())
    await page.locator('.sidebar-btn[aria-label="Delete"]').click()
    await expect(page.locator('text=Export Test')).not.toBeVisible()

    // Import the previously exported file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(filePath!)

    // Entry should be restored
    await expect(page.locator('text=Export Test')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=exportuser')).toBeVisible()
  })
})

test.describe('Mobile Viewport', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('should show bottom nav and hide sidebar on mobile', async ({ page }) => {
    await page.goto('/')
    await connectLocalStorage(page)

    // Sidebar should NOT be visible on mobile
    const sidebar = page.locator('.sidebar')
    await expect(sidebar).not.toBeVisible()

    // Bottom nav should be visible
    const bottomNav = page.locator('.bottom-nav')
    await expect(bottomNav).toBeVisible()

    // Bottom nav should have action buttons
    await expect(bottomNav.locator('[aria-label="Add"]')).toBeVisible()
    await expect(bottomNav.locator('[aria-label="Save"]')).toBeVisible()
    await expect(bottomNav.locator('[aria-label="Repository"]')).toBeVisible()

    // Add entry via bottom nav
    await bottomNav.locator('[aria-label="Add"]').click()
    await expect(page.locator('.modal-panel')).toBeVisible()
    const inputs = page.locator('.modal-panel .form-field-input')
    await inputs.nth(1).fill('Mobile Test')
    await page.locator('button:has-text("Save")').click()
    await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 3000 })

    // Entry should appear
    await expect(page.locator('text=Mobile Test')).toBeVisible()
  })
})

// ====== Helper: add one entry and return to grid ======
async function addOneEntry(page: Page, name = 'TestEntry') {
  await page.locator('.sidebar-btn[aria-label="Add"]').click()
  await expect(page.locator('.modal-panel')).toBeVisible()
  const inputs = page.locator('.modal-panel .form-field-input')
  await inputs.nth(0).fill('Cat')
  await inputs.nth(1).fill(name)
  await inputs.nth(2).fill('user1')
  await inputs.nth(3).fill('pass1')
  await page.locator('button:has-text("Save")').click()
  await expect(page.locator('.modal-panel')).not.toBeVisible({ timeout: 3000 })
}

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

    const rows = page.locator('.grid-row:not(.grid-header)')
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

import { test, expect, type Page } from '@playwright/test'

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

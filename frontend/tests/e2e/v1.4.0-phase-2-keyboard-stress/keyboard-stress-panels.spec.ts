import { test, expect } from '@playwright/test'
import { KeyboardStressTester, type StressError } from '../../helpers/keyboard-stress'

/**
 * Keyboard Stress Tests: Panel Navigation & Functionality
 *
 * Uses the panels that are actually rendered without a backend: the terminal,
 * the file sidebar, the activity rail, settings, and the command palette.
 */

test.describe('Keyboard Stress: Panel Navigation & Functionality', () => {
  let stress: KeyboardStressTester

  test.beforeEach(async ({ page }) => {
    stress = new KeyboardStressTester(page)
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByText('PrismNote').first()).toBeVisible()
  })

  // ========== TERMINAL PANEL TESTS ==========

  test('[PANEL-001] Terminal panel: Tab through prompt rapidly', async () => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await stress.openTerminal()
    await stress.rapidTabCycles(50, 5)

    const focused = await stress.getFocusedElement()
    expect(focused.tag).not.toBe('NONE')
    expect(errors).toHaveLength(0)
  })

  test('[PANEL-002] Terminal panel: Arrow keys navigate input', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    const input = await stress.openTerminal()
    await input.fill('terminal navigation')

    for (let i = 0; i < 40; i++) {
      await page.keyboard.press(i % 2 === 0 ? 'ArrowUp' : 'ArrowDown', { delay: 5 })
    }

    await expect(input).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('[PANEL-003] Terminal panel: Ctrl/Meta+Enter leaves the prompt usable', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    const input = await stress.openTerminal()
    await input.fill('echo stress')

    for (let i = 0; i < 10; i++) {
      await page.keyboard.press(`${stress.modifier}+Enter`, { delay: 5 })
    }

    await expect(input).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('[PANEL-004] Terminal panel: repeated command execution clears the prompt', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    const input = await stress.openTerminal()
    for (let i = 0; i < 5; i++) {
      await input.fill(`echo stress-${i}`)
      await page.keyboard.press('Enter', { delay: 10 })
      await expect(input).toHaveValue('')
    }

    await expect(page.getByText('prismnote', { exact: true }).first()).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  // ========== FILE EXPLORER PANEL TESTS ==========

  test('[PANEL-005] File Explorer: Tab through files', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await page.getByTitle('Files').first().click()
    await expect(page.getByText('FILES').first()).toBeVisible()
    await stress.rapidTabCycles(30, 5)

    const focused = await stress.getFocusedElement()
    expect(focused.tag).not.toBe('NONE')
    expect(errors).toHaveLength(0)
  })

  test('[PANEL-006] File Explorer: Arrow keys navigate tree', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await page.getByTitle('Files').first().click()
    for (let i = 0; i < 40; i++) {
      const key = i % 4 === 0 ? 'ArrowRight' : i % 4 === 1 ? 'ArrowLeft' : i % 4 === 2 ? 'ArrowUp' : 'ArrowDown'
      await page.keyboard.press(key, { delay: 5 })
    }

    expect(errors).toHaveLength(0)
  })

  test('[PANEL-007] File Explorer: Ctrl/Meta+N is handled without crashing', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await page.getByTitle('Files').first().click()
    await page.keyboard.press(stress.appCombo('n'), { delay: 10 })
    await page.waitForTimeout(100)

    await expect(page.getByText('PrismNote').first()).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  // ========== KEYBOARD FOCUS TESTS ==========

  test('[PANEL-008] Terminal: Tab in terminal input', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    const input = await stress.openTerminal()
    await input.type('python', { delay: 5 })
    await stress.rapidTabCycles(10, 5)

    await expect(page.getByTestId('terminal-input').first()).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('[PANEL-009] Terminal: rapid command execution', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    const input = await stress.openTerminal()
    for (let i = 0; i < 5; i++) {
      await input.fill(`echo test${i}`)
      await page.keyboard.press('Enter', { delay: 10 })
    }

    await expect(input).toHaveValue('')
    expect(errors).toHaveLength(0)
  })

  // ========== COMMAND PALETTE TESTS ==========

  test('[PANEL-010] Command Palette: Open/close rapid cycles', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await stress.openCommandPalette()

    for (let i = 0; i < 10; i++) {
      await page.keyboard.press(stress.appCombo('Shift+p'), { delay: 10 })
      await page.keyboard.press('Escape', { delay: 10 })
    }

    await expect(page.getByRole('textbox', { name: 'Search commands' })).toHaveCount(0)
    expect(errors).toHaveLength(0)
  })

  test('[PANEL-011] Command Palette: Rapid filtering and navigation', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await stress.openCommandPalette()
    const search = page.getByRole('textbox', { name: 'Search commands' })
    await search.fill('new')

    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('ArrowDown', { delay: 5 })
    }

    await expect(search).toHaveValue('new')
    expect(errors).toHaveLength(0)
  })

  // ========== SETTINGS PANEL TESTS ==========

  test('[PANEL-012] Settings: Tab through form fields', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await stress.openSettings()
    await stress.rapidTabCycles(40, 5)
    await page.keyboard.press('Escape')

    await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0)
    expect(errors).toHaveLength(0)
  })

  test('[PANEL-013] Settings: Rapid input in settings fields', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await stress.openSettings()
    const textInputs = page.getByRole('dialog').locator('input[type="text"]')
    const count = Math.min(await textInputs.count(), 3)

    for (let i = 0; i < count; i++) {
      const input = textInputs.nth(i)
      await input.click()
      await input.fill('test value')
      await page.keyboard.press('ArrowUp', { delay: 5 })
    }

    await page.keyboard.press('Escape')
    expect(errors).toHaveLength(0)
  })

  // ========== CROSS-PANEL NAVIGATION TESTS ==========

  test('[PANEL-014] Cross-panel: Tab from terminal to sidebar to rail', async ({ page }) => {
    const errors: StressError[] = []
    const focusPath: string[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await stress.openTerminal()

    for (let i = 0; i < 100; i++) {
      await page.keyboard.press('Tab', { delay: 5 })
      if (i % 20 === 0) {
        const focused = await stress.getFocusedElement()
        focusPath.push(`${focused.tag}#${focused.id || focused.class}`)
      }
    }

    expect(focusPath.length).toBeGreaterThan(1)
    expect(errors).toHaveLength(0)
  })

  test('[PANEL-015] Cross-panel: Keyboard shortcuts work from different panels', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    const input = await stress.openTerminal()
    await input.fill('shortcut test')
    await stress.openSettings()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0)

    await page.getByTitle('Files').first().click()
    await stress.openCommandPalette()
    await page.keyboard.press('Escape')

    expect(errors).toHaveLength(0)
  })

  test('[PANEL-016] Panel visibility: Toggle panels without crashing', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    const toggleKeys = ['Alt+f', 'Alt+t', 'Alt+d']
    for (const key of toggleKeys) {
      await page.keyboard.press(key, { delay: 20 })
    }

    await expect(page.getByText('PrismNote').first()).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('[PANEL-017] Stress: Rapid panel switching + keyboard interaction', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    const railButtons = ['Files', 'Terminal Console', 'Data Science Notebook']

    for (let i = 0; i < 20; i++) {
      await page.getByTitle(railButtons[i % railButtons.length]).first().click()
      await stress.rapidTabCycles(5, 5)
    }

    await expect(page.getByText('PrismNote').first()).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('[PANEL-018] Stress: Repeated panel toggles keep the layout responsive', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    for (let cycle = 0; cycle < 5; cycle++) {
      for (let i = 0; i < 10; i++) {
        const title = i % 2 === 0 ? 'Files' : 'Terminal Console'
        await page.getByTitle(title).first().click()
        await page.waitForTimeout(10)
      }
    }

    await expect(page.getByText('PrismNote').first()).toBeVisible()
    expect(errors).toHaveLength(0)
  })
})

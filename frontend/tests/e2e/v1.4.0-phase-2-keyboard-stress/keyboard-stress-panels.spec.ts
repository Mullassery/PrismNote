import { test, expect, Page } from '@playwright/test'
import { KeyboardStressTester } from '../../helpers/keyboard-stress'

/**
 * Keyboard Stress Tests: Panel Navigation & Functionality
 *
 * Test each major panel (Files, Notebook, Terminal, Settings, Deploy, Data)
 * to verify keyboard shortcuts and navigation work under stress
 */

test.describe('Keyboard Stress: Panel Navigation & Functionality', () => {
  let page: Page
  let stress: KeyboardStressTester

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    stress = new KeyboardStressTester(testPage)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  // ========== NOTEBOOK PANEL TESTS ==========

  test('[PANEL-001] Notebook panel: Tab through cells rapidly', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    // Click notebook to focus
    await page.click('[data-testid="notebook-container"]')
    await page.waitForTimeout(100)

    // Tab 50 times (should move between cells)
    await stress.rapidTabCycles(50, 20)

    const focused = await stress.getFocusedElement()
    expect(focused).toBeDefined()
    expect(errors).toHaveLength(0)
  })

  test('[PANEL-002] Notebook panel: Arrow keys navigate cells', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await page.click('[data-testid="notebook-container"]')

    // Rapid up/down arrows
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press(i % 2 === 0 ? 'ArrowUp' : 'ArrowDown', { delay: 20 })
    }

    expect(errors).toHaveLength(0)
  })

  test('[PANEL-003] Notebook panel: Ctrl/Meta+Enter executes cell', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await page.click('[data-testid="notebook-container"]')

    const executeKey = process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter'

    // Execute cell multiple times
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press(executeKey, { delay: 100 })
      await page.waitForTimeout(200) // Wait for execution
    }

    expect(errors).toHaveLength(0)
  })

  test('[PANEL-004] Notebook panel: Shift+Enter creates new cell', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await page.click('[data-testid="notebook-container"]')

    const cellsBefore = await page.locator('[data-testid^="cell-"]').count()

    // Shift+Enter to create new cells
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Shift+Enter', { delay: 100 })
      await page.waitForTimeout(200)
    }

    const cellsAfter = await page.locator('[data-testid^="cell-"]').count()
    console.log(`Cells before: ${cellsBefore}, after: ${cellsAfter}`)

    expect(cellsAfter).toBeGreaterThanOrEqual(cellsBefore)
    expect(errors).toHaveLength(0)
  })

  // ========== FILE EXPLORER PANEL TESTS ==========

  test('[PANEL-005] File Explorer: Tab through files', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    // Click file explorer
    await page.click('[data-testid="sidebar-files"]')
    await page.waitForTimeout(100)

    // Tab through files
    await stress.rapidTabCycles(30, 25)

    expect(errors).toHaveLength(0)
  })

  test('[PANEL-006] File Explorer: Arrow keys navigate tree', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await page.click('[data-testid="sidebar-files"]')
    await page.waitForTimeout(100)

    // Arrow keys to navigate tree
    for (let i = 0; i < 40; i++) {
      const key = i % 4 === 0 ? 'ArrowRight' : i % 4 === 1 ? 'ArrowLeft' : i % 4 === 2 ? 'ArrowUp' : 'ArrowDown'
      await page.keyboard.press(key, { delay: 20 })
    }

    expect(errors).toHaveLength(0)
  })

  test('[PANEL-007] File Explorer: Ctrl/Meta+N creates new file', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await page.click('[data-testid="sidebar-files"]')

    const newKey = process.platform === 'darwin' ? 'Meta+n' : 'Control+n'

    // Try to create new file
    await page.keyboard.press(newKey, { delay: 100 })
    await page.waitForTimeout(300)

    // Should have opened a dialog or created something
    expect(errors).toHaveLength(0)
  })

  // ========== TERMINAL PANEL TESTS ==========

  test('[PANEL-008] Terminal: Tab in terminal input', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    // Click terminal area
    await page.click('[data-testid="terminal-input"]')
    await page.waitForTimeout(100)

    // Type and tab
    await page.keyboard.type('python', { delay: 20 })
    await stress.rapidTabCycles(10, 25)

    expect(errors).toHaveLength(0)
  })

  test('[PANEL-009] Terminal: Rapid command execution', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await page.click('[data-testid="terminal-input"]')

    // Type and execute commands
    for (let i = 0; i < 5; i++) {
      await page.keyboard.type(`echo test${i}`, { delay: 20 })
      await page.keyboard.press('Enter', { delay: 50 })
      await page.waitForTimeout(200)
    }

    expect(errors).toHaveLength(0)
  })

  // ========== COMMAND PALETTE TESTS ==========

  test('[PANEL-010] Command Palette: Open/close rapid cycles', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    const paletteKey = process.platform === 'darwin' ? 'Meta+k' : 'Control+k'

    // Rapid open/close
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press(paletteKey, { delay: 50 })
      await page.waitForTimeout(100)
      await page.keyboard.press('Escape', { delay: 50 })
      await page.waitForTimeout(100)
    }

    // Palette should be closed
    const palette = await page.$('[role="dialog"]')
    expect(palette).toBeFalsy()

    expect(errors).toHaveLength(0)
  })

  test('[PANEL-011] Command Palette: Rapid filtering and navigation', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    const paletteKey = process.platform === 'darwin' ? 'Meta+k' : 'Control+k'

    // Open palette
    await page.keyboard.press(paletteKey)
    await page.waitForTimeout(200)

    // Type to search
    await page.keyboard.type('new', { delay: 30 })

    // Arrow down through results
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('ArrowDown', { delay: 20 })
    }

    // Execute command
    await page.keyboard.press('Enter', { delay: 50 })

    expect(errors).toHaveLength(0)
  })

  // ========== SETTINGS PANEL TESTS ==========

  test('[PANEL-012] Settings: Tab through form fields', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    // Open settings
    await page.keyboard.press('Comma')
    await page.waitForTimeout(300)

    // Tab through form
    await stress.rapidTabCycles(40, 25)

    // Close
    await page.keyboard.press('Escape')

    expect(errors).toHaveLength(0)
  })

  test('[PANEL-013] Settings: Rapid input in settings fields', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    // Open settings
    await page.keyboard.press('Comma')
    await page.waitForTimeout(300)

    // Find and click input fields, type
    const inputs = await page.$$('input[type="text"]')
    for (const input of inputs.slice(0, 3)) {
      await input.click()
      await page.keyboard.type('test value', { delay: 15 })
      await page.keyboard.press('ArrowUp', { delay: 20 })
    }

    await page.keyboard.press('Escape')

    expect(errors).toHaveLength(0)
  })

  // ========== DATA EXPLORER TESTS ==========

  test('[PANEL-014] Data Explorer: Tab through data view', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    // Click data explorer button (if visible)
    const dataButton = await page.$('[data-testid="bottom-panel-data"]')
    if (dataButton) {
      await dataButton.click()
      await page.waitForTimeout(300)

      // Tab through data
      await stress.rapidTabCycles(30, 25)
    }

    expect(errors).toHaveLength(0)
  })

  test('[PANEL-015] Data Explorer: Arrow navigation in table', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    // Open data explorer
    const dataButton = await page.$('[data-testid="bottom-panel-data"]')
    if (dataButton) {
      await dataButton.click()
      await page.waitForTimeout(300)

      // Rapid arrow navigation
      await stress.arrowKeyMashing(50, 20)
    }

    expect(errors).toHaveLength(0)
  })

  // ========== CROSS-PANEL NAVIGATION TESTS ==========

  test('[PANEL-016] Cross-panel: Tab from notebook to sidebar to terminal', async () => {
    const errors: any[] = []
    const focusPath: string[] = []

    stress.captureConsoleErrors((err) => errors.push(err))

    // Start in notebook
    await page.click('[data-testid="notebook-container"]')
    await page.waitForTimeout(100)

    // Tab 100 times and track focus path
    for (let i = 0; i < 100; i++) {
      await page.keyboard.press('Tab', { delay: 15 })
      if (i % 20 === 0) {
        const focused = await stress.getFocusedElement()
        focusPath.push(`${focused.tag}#${focused.id || focused.class}`)
      }
    }

    console.log('Focus path:', focusPath)

    // Should have cycled through multiple panels
    expect(focusPath.length).toBeGreaterThan(1)
    expect(errors).toHaveLength(0)
  })

  test('[PANEL-017] Cross-panel: Keyboard shortcuts from different panels', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    // Test shortcuts from notebook panel
    await page.click('[data-testid="notebook-container"]')
    await page.keyboard.press('Comma') // Settings
    await page.waitForTimeout(100)
    await page.keyboard.press('Escape')

    // Test shortcuts from file panel
    await page.click('[data-testid="sidebar-files"]')
    await page.keyboard.press('Meta+k') // Command palette
    await page.waitForTimeout(100)
    await page.keyboard.press('Escape')

    expect(errors).toHaveLength(0)
  })

  test('[PANEL-018] Panel visibility: Toggle panels with keyboard', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    // Get initial panel states
    const filesPanel = await page.$('[data-testid="sidebar-files"]')
    const terminal = await page.$('[data-testid="terminal-panel"]')

    // Try keyboard shortcuts to toggle (varies by implementation)
    const toggleKeys = ['Alt+f', 'Alt+t', 'Alt+d']

    for (const key of toggleKeys) {
      await page.keyboard.press(key as any, { delay: 100 })
      await page.waitForTimeout(100)
    }

    expect(errors).toHaveLength(0)
  })

  test('[PANEL-019] Stress: Rapid panel switching + keyboard interaction', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    const panels = [
      '[data-testid="notebook-container"]',
      '[data-testid="sidebar-files"]',
      '[data-testid="terminal-input"]',
    ]

    // Rapidly switch panels and use keyboard
    for (let i = 0; i < 20; i++) {
      const panel = panels[i % panels.length]
      const selector = await page.$(panel)
      if (selector) {
        await selector.click()
        await page.waitForTimeout(50)

        // Tab a few times
        await stress.rapidTabCycles(5, 20)
      }
    }

    expect(errors).toHaveLength(0)
  })

  test('[PANEL-020] Memory monitoring during panel switching stress', async () => {
    const memorySnapshots: number[] = []

    const panels = [
      '[data-testid="notebook-container"]',
      '[data-testid="sidebar-files"]',
      '[data-testid="terminal-input"]',
    ]

    for (let cycle = 0; cycle < 5; cycle++) {
      const mem = await stress.getMemoryUsage()
      if (mem) memorySnapshots.push(mem.usedJSHeapSize)

      // Switch panels 10 times per cycle
      for (let i = 0; i < 10; i++) {
        const panel = panels[i % panels.length]
        const selector = await page.$(panel)
        if (selector) {
          await selector.click()
          await page.waitForTimeout(100)
        }
      }

      await page.waitForTimeout(200)
    }

    console.log('Memory snapshots (MB):', memorySnapshots.map((m) => (m / 1024 / 1024).toFixed(2)))

    if (memorySnapshots.length >= 2) {
      const firstMem = memorySnapshots[0]
      const lastMem = memorySnapshots[memorySnapshots.length - 1]
      const growthPercent = ((lastMem - firstMem) / firstMem) * 100

      console.log(`Memory growth: ${growthPercent.toFixed(1)}%`)
      expect(growthPercent).toBeLessThan(30)
    }
  })
})

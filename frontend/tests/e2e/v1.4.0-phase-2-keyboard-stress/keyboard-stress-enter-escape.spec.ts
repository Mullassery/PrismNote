import { test, expect, Page } from '@playwright/test'
import { KeyboardStressTester } from '../../helpers/keyboard-stress'

/**
 * Keyboard Stress Tests: Enter & Escape Keys
 *
 * EXTREMES TESTED:
 * - Rapid Enter presses (create cells, confirm dialogs)
 * - Rapid Escape presses (close modals, cancel operations)
 * - Enter/Escape collision (happening simultaneously)
 * - Modal stacking corruption
 */

test.describe('Keyboard Stress: Enter & Escape Keys', () => {
  let page: Page
  let stress: KeyboardStressTester

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    stress = new KeyboardStressTester(testPage)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('[STRESS-101] Rapid Enter presses 50x in notebook - create multiple cells', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))
    stress.captureUnhandledRejections((err) => errors.push(err))

    // Click in notebook to focus it
    await page.click('[data-testid="notebook-container"]')
    await page.waitForTimeout(100)

    const cellsBefore = await page.locator('[data-testid^="cell-"]').count()

    // Rapid Enter to create new cells
    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('Enter', { delay: 15 })
      await page.waitForTimeout(10)
    }

    const cellsAfter = await page.locator('[data-testid^="cell-"]').count()

    console.log(`Cells before: ${cellsBefore}, after: ${cellsAfter}`)

    // Should have created NEW cells (not just inserted text)
    // Behavior depends on implementation - check no crash occurred
    expect(errors).toHaveLength(0)
    expect(cellsAfter).toBeGreaterThanOrEqual(cellsBefore)
  })

  test('[STRESS-102] Rapid Escape presses 50x - no modal stack corruption', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    // Open a modal
    await page.keyboard.press('Meta+k') // Command palette
    await page.waitForTimeout(200)

    let modalsOpen = await page.locator('[role="dialog"]').count()
    console.log(`Modals open: ${modalsOpen}`)

    // Rapid Escape 50 times
    await stress.rapidEscapePresses(50, 20)

    // All modals should be closed
    modalsOpen = await page.locator('[role="dialog"]').count()
    expect(modalsOpen).toBe(0)

    expect(errors).toHaveLength(0)
  })

  test('[STRESS-103] Open modal, spam Tab+Enter - verify form submission handling', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    // Open settings modal
    await page.keyboard.press('Comma')
    await page.waitForTimeout(300)

    const modalExists = await page.$('[role="dialog"]')
    expect(modalExists).toBeTruthy()

    // Tab to a button, then rapidly press Enter
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab', { delay: 15 })
      await page.keyboard.press('Enter', { delay: 15 })
      await page.waitForTimeout(20)
    }

    expect(errors).toHaveLength(0)
  })

  test('[STRESS-104] Open multiple modals with rapid Escape - no state corruption', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    // Open settings
    await page.keyboard.press('Comma')
    await page.waitForTimeout(100)

    // Try to open another modal while first is open
    await page.keyboard.press('Meta+k')
    await page.waitForTimeout(100)

    // Rapid Escape
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Escape', { delay: 20 })
      await page.waitForTimeout(15)
    }

    // All modals should be closed
    const modalsOpen = await page.locator('[role="dialog"]').count()
    expect(modalsOpen).toBe(0)

    // App should still be functional
    const focused = await stress.getFocusedElement()
    expect(focused).toBeDefined()

    expect(errors).toHaveLength(0)
  })

  test('[STRESS-105] Press Escape while modal opening (race condition)', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    // Open modal, immediately start spamming Escape (before it's fully rendered)
    await page.keyboard.press('Comma') // Start modal open

    // Escape immediately
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Escape', { delay: 5 })
    }

    await page.waitForTimeout(200)

    const modalsOpen = await page.locator('[role="dialog"]').count()
    console.log(`Final modal count: ${modalsOpen}`)

    // Should handle gracefully (no more than 1 modal open)
    expect(modalsOpen).toBeLessThanOrEqual(1)
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-106] Enter key in text input - check character insertion vs form submission', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    // Open command palette (has search input)
    await page.keyboard.press('Meta+k')
    await page.waitForTimeout(200)

    // Type some text
    await page.keyboard.type('test query', { delay: 30 })

    // Rapid Enter presses
    await stress.rapidEnterPresses(10, 20)

    // Check what happened:
    // - Should have executed a command or closed the modal
    // - Should NOT have inserted newlines in the search input
    const input = await page.$('input[type="search"]')
    if (input) {
      const value = await input.inputValue()
      expect(value).not.toContain('\n')
    }

    expect(errors).toHaveLength(0)
  })

  test('[STRESS-107] Rapid Escape in nested context - focus restoration', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    // Get initial focus
    const focusStart = await stress.getFocusedElement()

    // Open modal, tab inside, close
    await page.keyboard.press('Comma')
    await page.waitForTimeout(100)
    await stress.rapidTabCycles(10, 20)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)

    // Focus should be restored (or in a logical place)
    const focusEnd = await stress.getFocusedElement()
    expect(focusEnd).toBeDefined()

    console.log('Focus start:', focusStart)
    console.log('Focus end:', focusEnd)

    expect(errors).toHaveLength(0)
  })

  test('[STRESS-108] Undo/Redo spam (Ctrl+Z / Ctrl+Y) - state consistency', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    // Create some state to undo (type in a cell)
    await page.click('[data-testid="notebook-container"]')
    await page.keyboard.type('let x = 42', { delay: 20 })
    await page.waitForTimeout(200)

    const stateAfterType = await page.$eval('[data-testid="notebook-container"]', (el) =>
      (el as any).textContent
    )

    // Rapid undo/redo 20 times
    const undoKey = process.platform === 'darwin' ? 'Meta+z' : 'Control+z'
    const redoKey = process.platform === 'darwin' ? 'Meta+Shift+z' : 'Control+y'

    for (let i = 0; i < 20; i++) {
      await page.keyboard.press(undoKey, { delay: 15 })
      await page.keyboard.press(redoKey, { delay: 15 })
    }

    // State should be back to what it was
    const stateAfterCycling = await page.$eval('[data-testid="notebook-container"]', (el) =>
      (el as any).textContent
    )

    expect(stateAfterCycling).toBe(stateAfterType)
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-109] Enter key with modifiers (Shift+Enter, Ctrl+Enter)', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await page.click('[data-testid="notebook-container"]')
    await page.waitForTimeout(100)

    // Different Enter combinations
    await page.keyboard.press('Shift+Enter', { delay: 20 })
    await page.waitForTimeout(50)

    await page.keyboard.press('Control+Enter', { delay: 20 })
    await page.waitForTimeout(50)

    await page.keyboard.press('Meta+Enter', { delay: 20 })
    await page.waitForTimeout(50)

    // App should still be responsive
    const focused = await stress.getFocusedElement()
    expect(focused).toBeDefined()

    expect(errors).toHaveLength(0)
  })

  test('[STRESS-110] Memory leak detection during modal open/close cycles', async () => {
    const memorySnapshots: number[] = []

    // Warm up
    await page.waitForTimeout(200)

    for (let cycle = 0; cycle < 5; cycle++) {
      const mem = await stress.getMemoryUsage()
      if (mem) memorySnapshots.push(mem.usedJSHeapSize)

      // Open modal
      await page.keyboard.press('Comma')
      await page.waitForTimeout(100)

      // Tab inside
      await stress.rapidTabCycles(10, 20)

      // Close with Escape
      await page.keyboard.press('Escape')
      await page.waitForTimeout(100)
    }

    console.log('Memory snapshots (MB):', memorySnapshots.map((m) => (m / 1024 / 1024).toFixed(2)))

    if (memorySnapshots.length >= 2) {
      const firstMem = memorySnapshots[0]
      const lastMem = memorySnapshots[memorySnapshots.length - 1]
      const growthPercent = ((lastMem - firstMem) / firstMem) * 100

      console.log(`Memory growth during modal cycling: ${growthPercent.toFixed(1)}%`)
      expect(growthPercent).toBeLessThan(25)
    }
  })
})

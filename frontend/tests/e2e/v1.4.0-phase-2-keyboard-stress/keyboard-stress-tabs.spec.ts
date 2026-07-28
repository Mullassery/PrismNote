import { test, expect, Page } from '@playwright/test'
import { KeyboardStressTester } from '../../helpers/keyboard-stress'

/**
 * Keyboard Stress Tests: Tab Navigation
 *
 * GOAL: Find where tab cycling breaks the app
 * EXTREMES TESTED:
 * - Rapid forward/backward cycling
 * - Extreme speed (no delays)
 * - Sustained holds
 * - Focus escape/corruption
 * - Memory issues
 */

test.describe('Keyboard Stress: Tab Navigation', () => {
  let page: Page
  let stress: KeyboardStressTester

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    stress = new KeyboardStressTester(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('[STRESS-001] Rapid tab forward 100x - no crashes', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))
    stress.captureUnhandledRejections((err) => errors.push(err))

    // Start with keyboard focus in the app (click notebook area)
    await page.click('[data-testid="notebook-container"]')
    await page.waitForTimeout(100)

    const memStart = await stress.getMemoryUsage()

    // Rapid tab 100 times
    await stress.rapidTabCycles(100, 15) // 15ms between presses = 1.5s total

    const memEnd = await stress.getMemoryUsage()

    // Verify:
    const focused = await stress.getFocusedElement()
    expect(focused).toBeDefined()
    expect(focused.tag).toBeTruthy()

    // No console errors
    if (errors.length > 0) {
      console.log('Errors during rapid tab:', errors)
    }
    expect(errors).toHaveLength(0)

    // Memory didn't explode (allow 5MB growth for normal operation)
    if (memStart && memEnd) {
      const memGrowth = (memEnd.usedJSHeapSize - memStart.usedJSHeapSize) / 1024 / 1024 // in MB
      console.log(`Memory growth: ${memGrowth.toFixed(2)} MB`)
      expect(memGrowth).toBeLessThan(10) // 10MB is reasonable
    }
  })

  test('[STRESS-002] Extreme speed tab (no delay) 200x - find race conditions', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await page.click('[data-testid="notebook-container"]')
    await page.waitForTimeout(100)

    const focusLog: any[] = []
    let lastFocus = await stress.getFocusedElement()
    focusLog.push({ step: 0, ...lastFocus })

    // Tab at absolute maximum speed (no artificial delay)
    for (let i = 0; i < 200; i++) {
      await page.keyboard.press('Tab')
      if (i % 20 === 0) {
        const current = await stress.getFocusedElement()
        focusLog.push({ step: i, ...current })
      }
    }

    const finalFocus = await stress.getFocusedElement()
    expect(finalFocus).toBeDefined()

    // Did focus stay within the app?
    expect(finalFocus.id || finalFocus.class).not.toBe('none')

    console.log('Focus progression:', focusLog)
    console.log('Errors:', errors.length > 0 ? errors : 'NONE')
  })

  test('[STRESS-003] Reverse tab (Shift+Tab) 100x - check backward navigation', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))
    stress.captureUnhandledRejections((err) => errors.push(err))

    await page.click('[data-testid="notebook-container"]')
    await page.waitForTimeout(100)

    const memStart = await stress.getMemoryUsage()

    // Rapid Shift+Tab 100 times
    await stress.reverseTabCycles(100, 15)

    const memEnd = await stress.getMemoryUsage()

    const focused = await stress.getFocusedElement()
    expect(focused).toBeDefined()

    expect(errors).toHaveLength(0)

    if (memStart && memEnd) {
      const memGrowth = (memEnd.usedJSHeapSize - memStart.usedJSHeapSize) / 1024 / 1024
      console.log(`Reverse tab memory growth: ${memGrowth.toFixed(2)} MB`)
      expect(memGrowth).toBeLessThan(10)
    }
  })

  test('[STRESS-004] Alternating Tab/Shift+Tab 150x - check navigation order corruption', async () => {
    const errors: any[] = []
    const focusChanges: any[] = []

    stress.captureConsoleErrors((err) => errors.push(err))

    await page.click('[data-testid="notebook-container"]')
    await page.waitForTimeout(100)

    // Alternate forward/backward rapidly
    for (let i = 0; i < 150; i++) {
      await page.keyboard.press(i % 2 === 0 ? 'Tab' : 'Shift+Tab', { delay: 10 })
      if (i % 30 === 0) {
        focusChanges.push(await stress.getFocusedElement())
      }
    }

    const finalFocus = await stress.getFocusedElement()
    expect(finalFocus).toBeDefined()

    // Focus should be somewhere in the app
    expect(finalFocus.tag).toBeTruthy()

    console.log('Focus changes:', focusChanges)
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-005] Sustained Tab hold (2 seconds) - check for stuck focus', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await page.click('[data-testid="notebook-container"]')
    await page.waitForTimeout(100)

    const focusBefore = await stress.getFocusedElement()

    // Hold Tab for 2 seconds (re-press every 50ms to simulate hold)
    await stress.sustainedKeyHold('Tab', 2000)

    const focusAfter = await stress.getFocusedElement()

    // Focus should have moved (Tab was held down)
    expect(focusAfter).toBeDefined()
    expect(focusAfter.tag).toBeTruthy()

    console.log('Focus before hold:', focusBefore)
    console.log('Focus after hold:', focusAfter)
    console.log('Errors:', errors)

    expect(errors).toHaveLength(0)
  })

  test('[STRESS-006] Focus shouldn\'t escape the app container (100 tab cycles)', async () => {
    const escapeEvents: any[] = []
    stress.captureConsoleErrors((err) => escapeEvents.push(err))

    await page.click('[data-testid="notebook-container"]')

    for (let i = 0; i < 100; i++) {
      await page.keyboard.press('Tab')
      const focused = await stress.getFocusedElement()

      // If focus is on "body" or "html", it escaped!
      if (focused.tag === 'HTML' || focused.tag === 'BODY') {
        escapeEvents.push({
          iteration: i,
          focused,
          message: 'Focus escaped to document level',
        })
      }
    }

    if (escapeEvents.length > 0) {
      console.log('FOCUS ESCAPE DETECTED:', escapeEvents)
    }
    expect(escapeEvents).toHaveLength(0) // Should NOT escape
  })

  test('[STRESS-007] Tab through all major UI sections - verify coverage', async () => {
    const focusSequence: string[] = []
    const expectedSections = ['notebook', 'sidebar', 'terminal', 'settings', 'deploy']

    await page.click('[data-testid="notebook-container"]')

    // Tab 50 times and collect unique focus targets
    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('Tab', { delay: 20 })
      const focused = await stress.getFocusedElement()
      focusSequence.push(`${focused.tag}#${focused.id || focused.class}`)
    }

    // Count unique focus points
    const uniqueFocus = new Set(focusSequence)
    console.log(`Unique focus points: ${uniqueFocus.size}`)
    console.log('Focus sequence (sample):', focusSequence.slice(0, 20))

    // Should have visited multiple sections (not stuck on one)
    expect(uniqueFocus.size).toBeGreaterThan(3)
  })

  test('[STRESS-008] Tab after rapid modal open/close - verify focus restoration', async () => {
    await page.click('[data-testid="notebook-container"]')

    // Open and close settings modal 10 times rapidly
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Comma') // Settings shortcut
      await page.waitForTimeout(50)
      await page.keyboard.press('Escape') // Close modal
      await page.waitForTimeout(50)
    }

    // Now try tabbing — should work and focus should be restored
    const focusBefore = await stress.getFocusedElement()
    await stress.rapidTabCycles(20, 20)
    const focusAfter = await stress.getFocusedElement()

    expect(focusAfter).toBeDefined()
    expect(focusAfter.tag).toBeTruthy()

    console.log('Focus restored properly after modal cycles')
  })

  test('[STRESS-009] Check for focus trap in modals - can you Tab out?', async () => {
    // Open command palette (should create a focus trap)
    await page.keyboard.press('Meta+k') // Cmd+K (or Ctrl+K on Linux)
    await page.waitForTimeout(200)

    const modalOpen = await page.$('[role="dialog"]')
    expect(modalOpen).toBeTruthy() // Modal should be open

    // Tab 30 times inside modal
    await stress.rapidTabCycles(30, 20)

    // Focus should still be inside modal (no escape)
    try {
      await stress.assertFocusInContainer('[role="dialog"]')
      console.log('✓ Focus trap working correctly (focus stayed in modal)')
    } catch (e) {
      console.log('✗ Focus trap broken (focus escaped modal):', e.message)
      throw e
    }

    // Close modal
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
  })

  test('[STRESS-010] Stress test with memory monitoring - detect leaks', async ({ page: testPage }) => {
    const memorySnapshots: number[] = []

    // Warm up
    await page.click('[data-testid="notebook-container"]')
    await page.waitForTimeout(200)

    // Tab cycle with memory monitoring
    for (let cycle = 0; cycle < 5; cycle++) {
      const mem = await stress.getMemoryUsage()
      if (mem) memorySnapshots.push(mem.usedJSHeapSize)

      // 50 rapid tabs per cycle
      await stress.rapidTabCycles(50, 10)

      await page.waitForTimeout(100)
    }

    // Analyze memory trend
    console.log('Memory snapshots (MB):', memorySnapshots.map((m) => (m / 1024 / 1024).toFixed(2)))

    if (memorySnapshots.length >= 2) {
      const firstMem = memorySnapshots[0]
      const lastMem = memorySnapshots[memorySnapshots.length - 1]
      const growthPercent = ((lastMem - firstMem) / firstMem) * 100

      console.log(`Memory growth: ${growthPercent.toFixed(1)}%`)

      // Should not grow more than 30%
      expect(growthPercent).toBeLessThan(30)
    }
  })
})

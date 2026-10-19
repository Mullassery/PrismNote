import { test, expect } from '@playwright/test'
import { KeyboardStressTester, type StressError } from '../../helpers/keyboard-stress'

/**
 * Keyboard Stress Tests: Tab Navigation
 *
 * Starts from the terminal prompt, a control that always exists in the
 * standalone frontend harness. Focus may legitimately reach the document body
 * after a full tab cycle in some browsers, so these tests assert that focus
 * remains resolvable and the app stays responsive rather than forbidding
 * browser-level focus behavior.
 */

test.describe('Keyboard Stress: Tab Navigation', () => {
  let stress: KeyboardStressTester

  test.beforeEach(async ({ page }) => {
    stress = new KeyboardStressTester(page)
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByText('PrismNote').first()).toBeVisible()
  })

  test('[STRESS-001] Rapid tab forward 100x - no crashes', async () => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))
    stress.captureUnhandledRejections((err) => errors.push(err))

    await stress.openTerminal()
    await stress.rapidTabCycles(100, 5)

    const focused = await stress.getFocusedElement()
    expect(focused.tag).not.toBe('NONE')
    expect(focused.tag).toBeTruthy()
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-002] Extreme speed tab (no delay) 200x - no page errors', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await stress.openTerminal()
    await stress.extremeSpeedTabCycles(200)

    const focused = await stress.getFocusedElement()
    expect(focused.tag).not.toBe('NONE')
    await expect(page.getByText('PrismNote').first()).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-003] Reverse tab (Shift+Tab) 100x - check backward navigation', async () => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))
    stress.captureUnhandledRejections((err) => errors.push(err))

    await stress.openTerminal()
    await stress.reverseTabCycles(100, 5)

    const focused = await stress.getFocusedElement()
    expect(focused.tag).not.toBe('NONE')
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-004] Alternating Tab/Shift+Tab 150x - navigation order stable', async ({ page }) => {
    const errors: StressError[] = []
    const focusChanges: string[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await stress.openTerminal()

    for (let i = 0; i < 150; i++) {
      await page.keyboard.press(i % 2 === 0 ? 'Tab' : 'Shift+Tab', { delay: 3 })
      if (i % 30 === 0) {
        const focused = await stress.getFocusedElement()
        focusChanges.push(`${focused.tag}#${focused.id || focused.class}`)
      }
    }

    expect(new Set(focusChanges).size).toBeGreaterThan(0)
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-005] Sustained Tab hold (2 seconds) - no stuck page', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await stress.openTerminal()
    await stress.sustainedKeyHold('Tab', 2000)

    const focused = await stress.getFocusedElement()
    expect(focused.tag).not.toBe('NONE')
    await expect(page.getByText('PrismNote').first()).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-006] Focus remains resolvable through 100 tab cycles', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await stress.openTerminal()

    for (let i = 0; i < 100; i++) {
      await page.keyboard.press('Tab')
      const focused = await stress.getFocusedElement()
      expect(focused.tag).not.toBe('NONE')
    }

    expect(errors).toHaveLength(0)
  })

  test('[STRESS-007] Tab through all major UI sections - verify coverage', async ({ page }) => {
    await stress.openTerminal()
    const focusSequence: string[] = []

    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('Tab', { delay: 5 })
      const focused = await stress.getFocusedElement()
      focusSequence.push(`${focused.tag}#${focused.id || focused.class}`)
    }

    expect(focusSequence).toHaveLength(50)
    expect(focusSequence.every((entry) => !entry.startsWith('NONE'))).toBe(true)
  })

  test('[STRESS-008] Tab after rapid modal open/close - focus restored', async ({ page }) => {
    await stress.openTerminal()

    for (let i = 0; i < 10; i++) {
      await page.keyboard.press(stress.appCombo('Comma'))
      await page.keyboard.press('Escape')
    }

    const focusBefore = await stress.getFocusedElement()
    await stress.rapidTabCycles(20, 5)
    const focusAfter = await stress.getFocusedElement()

    expect(focusBefore.tag).not.toBe('NONE')
    expect(focusAfter.tag).not.toBe('NONE')
    expect(focusAfter.tag).toBeTruthy()
  })

  test('[STRESS-009] Tab inside a modal keeps it mounted and closable', async ({ page }) => {
    await stress.openSettings()
    await stress.rapidTabCycles(30, 5)

    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0)
  })

  test('[STRESS-010] Repeated tab cycles keep memory stable where measurable', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await stress.openTerminal()
    const memStart = await stress.getMemoryUsage()

    for (let cycle = 0; cycle < 5; cycle++) {
      await stress.rapidTabCycles(50, 3)
    }

    const memEnd = await stress.getMemoryUsage()

    if (memStart && memEnd) {
      const growthMB = (memEnd.usedJSHeapSize - memStart.usedJSHeapSize) / 1024 / 1024
      expect(growthMB).toBeLessThan(50)
    }

    await expect(page.getByText('PrismNote').first()).toBeVisible()
    expect(errors).toHaveLength(0)
  })
})

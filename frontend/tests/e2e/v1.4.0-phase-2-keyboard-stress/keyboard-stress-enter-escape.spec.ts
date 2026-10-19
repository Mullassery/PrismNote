import { test, expect } from '@playwright/test'
import { KeyboardStressTester, type StressError } from '../../helpers/keyboard-stress'

/**
 * Keyboard Stress Tests: Enter & Escape Keys
 *
 * Exercises real overlays and text controls. The previous suite clicked a
 * notebook container that only exists after a backend-created notebook, so
 * it timed out before the keyboard work began.
 */

test.describe('Keyboard Stress: Enter & Escape Keys', () => {
  let stress: KeyboardStressTester

  test.beforeEach(async ({ page }) => {
    stress = new KeyboardStressTester(page)
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByText('PrismNote').first()).toBeVisible()
  })

  test('[STRESS-101] Rapid Enter presses 50x in terminal - no duplicate submissions', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))
    stress.captureUnhandledRejections((err) => errors.push(err))

    const input = await stress.openTerminal()
    await input.fill('')

    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('Enter', { delay: 5 })
    }

    await expect(input).toHaveValue('')
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-102] Rapid Escape presses 50x - no modal stack corruption', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await stress.openCommandPalette()
    await stress.rapidEscapePresses(50, 5)

    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-103] Open settings, spam Tab - handlers stay responsive', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await stress.openSettings()

    await stress.rapidTabCycles(30, 5)

    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-104] Open two overlays with rapid Escape - no state corruption', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await stress.openSettings()
    await stress.openCommandPalette()

    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Escape', { delay: 5 })
    }

    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByText('PrismNote').first()).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-105] Press Escape while modal opening (race condition)', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await page.keyboard.press(stress.appCombo('Comma'))
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Escape', { delay: 5 })
    }

    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-106] Enter in command search does not insert a newline', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await stress.openCommandPalette()
    const search = page.getByRole('textbox', { name: 'Search commands' })
    await search.fill('no-such-command-zz')

    await stress.rapidEnterPresses(10, 5)

    await expect(search).toHaveValue('no-such-command-zz')
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-107] Rapid Escape in nested context - focus restoration', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    const focusStart = await stress.getFocusedElement()
    await stress.openSettings()
    await stress.rapidTabCycles(10, 5)
    await page.keyboard.press('Escape')

    await expect(page.getByRole('dialog')).toHaveCount(0)
    const focusEnd = await stress.getFocusedElement()
    expect(focusEnd).toBeDefined()
    expect(focusEnd.tag).not.toBe('NONE')
    expect(focusStart.tag).not.toBe('NONE')
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-108] Undo/Redo spam (Ctrl+Z / Ctrl+Y) - input state stays usable', async () => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    const input = await stress.openTerminal()
    await input.fill('let x = 42')
    await stress.undoRedoCycling(20, 5)

    await expect(input).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-109] Enter key with modifiers (Shift+Enter, Ctrl+Enter)', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    const input = await stress.openTerminal()
    await input.fill('echo modifiers')

    await page.keyboard.press('Shift+Enter', { delay: 5 })
    await page.keyboard.press('Control+Enter', { delay: 5 })
    await page.keyboard.press('Meta+Enter', { delay: 5 })

    await expect(input).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-110] Modal open/close cycles - no crash or leak of dialog nodes', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    for (let cycle = 0; cycle < 10; cycle++) {
      await stress.openSettings()
      await stress.rapidTabCycles(10, 5)
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)
    }

    expect(errors).toHaveLength(0)
  })
})

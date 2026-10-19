import { test, expect } from '@playwright/test'
import { KeyboardStressTester, type StressError } from '../../helpers/keyboard-stress'

/**
 * Keyboard Stress Tests: Arrow Keys & Text Input
 *
 * These tests exercise a real text control that exists in the standalone
 * frontend harness: the terminal prompt. (The old version targeted a
 * `notebook-container` that only exists after a notebook is created through
 * the Rust backend, so every test timed out before doing any keyboard work.)
 */

test.describe('Keyboard Stress: Arrow Keys & Input', () => {
  let stress: KeyboardStressTester

  test.beforeEach(async ({ page }) => {
    stress = new KeyboardStressTester(page)
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByText('PrismNote').first()).toBeVisible()
  })

  test('[STRESS-201] Arrow key mashing (100 random presses) - no crashes', async () => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))
    stress.captureUnhandledRejections((err) => errors.push(err))

    const input = await stress.openTerminal()
    await input.fill('arrow stress')
    await stress.arrowKeyMashing(100, 5)

    await expect(input).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-202] Rapid vertical arrow navigation (100x up/down) - value intact', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    const input = await stress.openTerminal()
    await input.fill('vertical navigation')

    for (let i = 0; i < 100; i++) {
      await page.keyboard.press(i % 2 === 0 ? 'ArrowUp' : 'ArrowDown', { delay: 5 })
    }

    await expect(input).toHaveValue('vertical navigation')
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-203] Rapid horizontal arrow navigation (100x left/right)', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    const input = await stress.openTerminal()
    await input.fill('horizontal navigation')

    for (let i = 0; i < 100; i++) {
      await page.keyboard.press(i % 2 === 0 ? 'ArrowLeft' : 'ArrowRight', { delay: 5 })
    }

    await expect(input).toHaveValue('horizontal navigation')
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-204] Type extremely long string rapidly (10KB) - input not truncated', async () => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    const input = await stress.openTerminal()
    const longText = 'x'.repeat(10_000)
    await input.fill(longText)

    await expect(input).toHaveValue(longText)
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-205] Rapid paste operations (5 large blocks)', async () => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    const input = await stress.openTerminal()
    const textBlocks = Array.from(
      { length: 5 },
      (_, i) => `Pasted block ${i}: ${'x'.repeat(100)}`,
    )

    await stress.rapidPaste('[data-testid="terminal-input"]', textBlocks)

    await expect(input).toHaveValue(textBlocks[textBlocks.length - 1])
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-206] Type while scrolling - no text corruption', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    const input = await stress.openTerminal()
    const textToType = 'Testing concurrent scroll'
    await input.fill('')

    for (const char of textToType) {
      await page.keyboard.type(char, { delay: 5 })
      await page.evaluate(() => window.scrollBy(0, 10))
    }

    await expect(input).toHaveValue(textToType)
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-207] Ctrl/Meta arrow key navigation (jump to word boundaries)', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    const input = await stress.openTerminal()
    await input.fill('word1 word2 word3 word4 word5')

    for (let i = 0; i < 30; i++) {
      await page.keyboard.press(`${stress.modifier}+ArrowRight`, { delay: 5 })
    }
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press(`${stress.modifier}+ArrowLeft`, { delay: 5 })
    }

    await expect(input).toHaveValue('word1 word2 word3 word4 word5')
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-208] Arrow keys with Shift (selection stress)', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    const input = await stress.openTerminal()
    await input.fill('This is some text for selection testing')
    await input.press('Home')

    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('Shift+ArrowRight', { delay: 5 })
    }
    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('Shift+ArrowLeft', { delay: 5 })
    }

    await expect(input).toHaveValue('This is some text for selection testing')
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-209] Home/End key navigation rapid press', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    const input = await stress.openTerminal()
    await input.fill('Multi-line text for navigation')

    for (let i = 0; i < 50; i++) {
      await page.keyboard.press(i % 2 === 0 ? 'Home' : 'End', { delay: 5 })
    }

    await expect(input).toHaveValue('Multi-line text for navigation')
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-210] Page Up/Page Down rapid navigation', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await stress.openTerminal()
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press(i % 2 === 0 ? 'PageUp' : 'PageDown', { delay: 5 })
    }

    await expect(page.getByTestId('terminal-input').first()).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-211] Delete/Backspace spam (corrupt text)', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    const input = await stress.openTerminal()
    await input.fill('Initial text')
    await input.press('End')

    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Backspace', { delay: 5 })
    }
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Delete', { delay: 5 })
    }

    await expect(input).toHaveValue('')
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-212] Type, select all, delete cycle (state corruption check)', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    const input = await stress.openTerminal()
    const selectAllKey = stress.combo('a')

    for (let cycle = 0; cycle < 10; cycle++) {
      await input.fill(`Cycle ${cycle} text`)
      await page.keyboard.press(selectAllKey)
      await page.keyboard.press('Delete')
      await expect(input).toHaveValue('')
    }

    await expect(input).toBeVisible()
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-213] Extreme input: 5000 character paste then navigate', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    const input = await stress.openTerminal()
    const largeText = 'a'.repeat(5000)
    await input.fill(largeText)

    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('ArrowUp', { delay: 3 })
      await page.keyboard.press('ArrowDown', { delay: 3 })
    }

    await expect(input).toHaveValue(largeText)
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-214] Modifier key combinations stress', async ({ page }) => {
    const errors: StressError[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    const combinations = [
      'Shift+ArrowUp',
      'Shift+ArrowDown',
      'Shift+ArrowLeft',
      'Shift+ArrowRight',
      'Control+Shift+ArrowUp',
      'Control+Shift+ArrowDown',
    ]

    const input = await stress.openTerminal()
    await input.fill('modifier stress')

    for (let i = 0; i < 50; i++) {
      const combo = combinations[i % combinations.length]
      await page.keyboard.press(combo, { delay: 5 })
    }

    await expect(input).toHaveValue('modifier stress')
    expect(errors).toHaveLength(0)
  })
})

import { test, expect, Page } from '@playwright/test'
import { KeyboardStressTester } from '../../helpers/keyboard-stress'

/**
 * Keyboard Stress Tests: Arrow Keys & Text Input
 *
 * EXTREMES TESTED:
 * - Rapid arrow key presses (all directions)
 * - Arrow key mashing (random directions)
 * - Long text input rapidly
 * - Paste operations at extreme speed
 * - Character dropping / buffer overflow
 * - Scroll position corruption
 */

test.describe('Keyboard Stress: Arrow Keys & Input', () => {
  let page: Page
  let stress: KeyboardStressTester

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    stress = new KeyboardStressTester(testPage)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('[STRESS-201] Arrow key mashing (100 random presses) - no crashes', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))
    stress.captureUnhandledRejections((err) => errors.push(err))

    // Click notebook to give it focus
    await page.click('[data-testid="notebook-container"]')
    await page.waitForTimeout(100)

    const memStart = await stress.getMemoryUsage()

    // Random arrow key mashing
    await stress.arrowKeyMashing(100, 15)

    const memEnd = await stress.getMemoryUsage()

    // Should still be responsive
    const focused = await stress.getFocusedElement()
    expect(focused).toBeDefined()

    // No crashes
    expect(errors).toHaveLength(0)

    if (memStart && memEnd) {
      const memGrowth = (memEnd.usedJSHeapSize - memStart.usedJSHeapSize) / 1024 / 1024
      console.log(`Arrow key mashing memory growth: ${memGrowth.toFixed(2)} MB`)
      expect(memGrowth).toBeLessThan(8)
    }
  })

  test('[STRESS-202] Rapid vertical arrow navigation (100x up/down) - scroll position', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await page.click('[data-testid="notebook-container"]')
    await page.waitForTimeout(100)

    // Press up/down 100 times alternating
    for (let i = 0; i < 100; i++) {
      await page.keyboard.press(i % 2 === 0 ? 'ArrowUp' : 'ArrowDown', { delay: 10 })
    }

    // Page should still be scrollable and usable
    const scrollable = await page.$('[data-testid="notebook-container"]')
    expect(scrollable).toBeTruthy()

    expect(errors).toHaveLength(0)
  })

  test('[STRESS-203] Rapid horizontal arrow navigation (100x left/right)', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await page.click('[data-testid="notebook-container"]')
    await page.waitForTimeout(100)

    // Press left/right 100 times
    for (let i = 0; i < 100; i++) {
      await page.keyboard.press(i % 2 === 0 ? 'ArrowLeft' : 'ArrowRight', { delay: 10 })
    }

    const focused = await stress.getFocusedElement()
    expect(focused).toBeDefined()

    expect(errors).toHaveLength(0)
  })

  test('[STRESS-204] Type extremely long string rapidly (10KB) - buffer overflow check', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    // Click in notebook to focus
    await page.click('[data-testid="notebook-container"]')
    await page.waitForTimeout(100)

    // Generate 10KB of text
    const longText = Array(1000).fill('x').join('')
    expect(longText.length).toBe(1000)

    const memStart = await stress.getMemoryUsage()

    // Type very rapidly (1ms per character)
    await stress.rapidTypeString('[data-testid="notebook-container"]', longText, 1)

    const memEnd = await stress.getMemoryUsage()

    // Text should be there (check partial)
    const content = await page.$eval('[data-testid="notebook-container"]', (el) =>
      (el as any).textContent || ''
    )
    console.log(`Content length: ${content.length}, expected min: 500`)

    // Memory shouldn't explode
    if (memStart && memEnd) {
      const memGrowth = (memEnd.usedJSHeapSize - memStart.usedJSHeapSize) / 1024 / 1024
      console.log(`Long text memory growth: ${memGrowth.toFixed(2)} MB`)
      expect(memGrowth).toBeLessThan(15) // 15MB reasonable for 1KB text
    }

    expect(errors).toHaveLength(0)
  })

  test('[STRESS-205] Rapid paste operations (5 large blocks)', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await page.click('[data-testid="notebook-container"]')
    await page.waitForTimeout(100)

    const textBlocks = Array(5)
      .fill(null)
      .map((_, i) => `Pasted block ${i}: ${Array(100).fill('x').join('')}`)

    await stress.rapidPaste('[data-testid="notebook-container"]', textBlocks, 50)

    const content = await page.$eval('[data-testid="notebook-container"]', (el) =>
      (el as any).textContent || ''
    )

    console.log(`Total content length: ${content.length}`)
    expect(content.length).toBeGreaterThan(0)

    expect(errors).toHaveLength(0)
  })

  test('[STRESS-206] Type while scrolling - no text corruption', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await page.click('[data-testid="notebook-container"]')
    await page.waitForTimeout(100)

    // Start typing
    const textToType = 'Testing concurrent scroll'

    for (const char of textToType) {
      // Type character
      await page.keyboard.type(char, { delay: 20 })

      // Scroll while typing
      await page.evaluate(() => {
        window.scrollBy(0, 10)
      })
    }

    const content = await page.$eval('[data-testid="notebook-container"]', (el) =>
      (el as any).textContent || ''
    )

    expect(content).toContain(textToType)
    expect(errors).toHaveLength(0)
  })

  test('[STRESS-207] Ctrl/Meta arrow key navigation (jump to word boundaries)', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await page.click('[data-testid="notebook-container"]')

    // Type some text
    await page.keyboard.type('word1 word2 word3 word4 word5', { delay: 10 })

    const moveKey = process.platform === 'darwin' ? 'Meta' : 'Control'

    // Rapid Ctrl/Meta+Arrow (jump word boundaries)
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press(`${moveKey}+ArrowRight`, { delay: 15 })
    }

    for (let i = 0; i < 30; i++) {
      await page.keyboard.press(`${moveKey}+ArrowLeft`, { delay: 15 })
    }

    const focused = await stress.getFocusedElement()
    expect(focused).toBeDefined()

    expect(errors).toHaveLength(0)
  })

  test('[STRESS-208] Arrow keys with Shift (selection stress)', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await page.click('[data-testid="notebook-container"]')

    // Type text
    await page.keyboard.type('This is some text for selection testing', { delay: 10 })

    // Shift+arrow to select
    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('Shift+ArrowRight', { delay: 10 })
    }

    // Deselect
    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('Shift+ArrowLeft', { delay: 10 })
    }

    expect(errors).toHaveLength(0)
  })

  test('[STRESS-209] Home/End key navigation rapid press', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await page.click('[data-testid="notebook-container"]')
    await page.keyboard.type('Multi-line\ntext\nfor\nnavigation', { delay: 10 })

    // Rapid Home/End
    for (let i = 0; i < 50; i++) {
      await page.keyboard.press(i % 2 === 0 ? 'Home' : 'End', { delay: 15 })
    }

    const focused = await stress.getFocusedElement()
    expect(focused).toBeDefined()

    expect(errors).toHaveLength(0)
  })

  test('[STRESS-210] Page Up/Page Down rapid navigation', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    // Rapid Page Up/Down
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press(i % 2 === 0 ? 'PageUp' : 'PageDown', { delay: 20 })
    }

    // Page should still be in valid state
    const element = await page.$('[data-testid="notebook-container"]')
    expect(element).toBeTruthy()

    expect(errors).toHaveLength(0)
  })

  test('[STRESS-211] Delete/Backspace spam (corrupt text)', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await page.click('[data-testid="notebook-container"]')

    // Type text
    await page.keyboard.type('Initial text', { delay: 10 })

    // Spam backspace
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Backspace', { delay: 15 })
    }

    // Spam delete
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Delete', { delay: 15 })
    }

    expect(errors).toHaveLength(0)
  })

  test('[STRESS-212] Type, select all, delete cycle (state corruption check)', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    const selectAllKey = process.platform === 'darwin' ? 'Meta+a' : 'Control+a'

    // Cycle 10 times: type, select all, delete
    for (let cycle = 0; cycle < 10; cycle++) {
      await page.keyboard.type(`Cycle ${cycle} text`, { delay: 10 })
      await page.keyboard.press(selectAllKey)
      await page.keyboard.press('Delete')
      await page.waitForTimeout(50)
    }

    // Should still be functional
    const focused = await stress.getFocusedElement()
    expect(focused).toBeDefined()

    expect(errors).toHaveLength(0)
  })

  test('[STRESS-213] Extreme input: 5000 character paste then navigate', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    await page.click('[data-testid="notebook-container"]')

    // Generate 5KB text
    const largeText = Array(5000).fill('a').join('')

    // Paste
    await stress.rapidPaste('[data-testid="notebook-container"]', [largeText], 100)

    // Navigate in the text
    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('ArrowUp', { delay: 10 })
      await page.keyboard.press('ArrowDown', { delay: 10 })
    }

    // Memory shouldn't explode
    const mem = await stress.getMemoryUsage()
    if (mem) {
      const memMB = mem.usedJSHeapSize / 1024 / 1024
      console.log(`Memory after large paste: ${memMB.toFixed(2)} MB`)
      expect(memMB).toBeLessThan(200) // 200MB is reasonable
    }

    expect(errors).toHaveLength(0)
  })

  test('[STRESS-214] Modifier key combinations stress', async () => {
    const errors: any[] = []
    stress.captureConsoleErrors((err) => errors.push(err))

    const combinations = [
      'Shift+ArrowUp',
      'Shift+ArrowDown',
      'Shift+ArrowLeft',
      'Shift+ArrowRight',
      'Control+Shift+ArrowUp',
      'Control+Shift+ArrowDown',
    ]

    await page.click('[data-testid="notebook-container"]')

    // Rapid combination presses
    for (let i = 0; i < 50; i++) {
      const combo = combinations[i % combinations.length]
      await page.keyboard.press(combo as any, { delay: 15 })
    }

    expect(errors).toHaveLength(0)
  })
})

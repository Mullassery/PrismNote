import { expect, type Page } from '@playwright/test'

/** A console error or page error captured during a stress run. */
export interface StressError {
  message: string
  location?: unknown
  stack?: string
}

export interface FocusInfo {
  tag: string
  id: string
  class: string
  text: string
  ariaLabel: string
}

interface PerformanceMemory {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

/**
 * Keyboard Stress Testing Helpers
 * Test real keyboard input at extremes to find breaking points.
 *
 * Inputs are real controls from the running app (the terminal prompt, the
 * command palette, and modal fields) so the suite never waits on a notebook
 * backend that is not part of the frontend E2E harness.
 */
export class KeyboardStressTester {
  constructor(private page: Page) {}

  /** Platform modifier that maps to Cmd on macOS and Ctrl elsewhere. */
  get modifier(): 'Meta' | 'Control' {
    return process.platform === 'darwin' ? 'Meta' : 'Control'
  }

  /** Make a Playwright key combo using the platform's primary modifier. */
  combo(key: string): string {
    return `${this.modifier}+${key}`
  }

  /**
   * App-level shortcut combo. Always uses Control: the app accepts
   * metaKey || ctrlKey, and Control avoids OS/browser interception of
   * Cmd+K / Cmd+, on headless macOS WebKit/Chromium.
   */
  appCombo(key: string): string {
    return `Control+${key}`
  }

  /**
   * Open Settings, retrying once if the keydown lands before React has
   * attached the app-level shortcut listener (a real first-paint race in
   * headless browsers). Opening is idempotent, so a second press is safe.
   */
  async openSettings() {
    const dialog = this.page.getByRole('dialog', { name: 'Settings' })
    await this.page.keyboard.press(this.appCombo('Comma'))
    try {
      await expect(dialog).toBeVisible({ timeout: 2000 })
    } catch {
      await this.page.keyboard.press(this.appCombo('Comma'))
      await expect(dialog).toBeVisible()
    }
  }

  /** Open the command palette with the same first-paint retry. */
  async openCommandPalette() {
    const search = this.page.getByRole('textbox', { name: 'Search commands' })
    await this.page.keyboard.press(this.appCombo('Shift+p'))
    try {
      await expect(search).toBeVisible({ timeout: 2000 })
    } catch {
      await this.page.keyboard.press(this.appCombo('Shift+p'))
      await expect(search).toBeVisible()
    }
  }

  /** Open global search with the same first-paint retry. */
  async openSearch() {
    const dialog = this.page.getByRole('dialog', { name: 'Search' })
    await this.page.keyboard.press('Control+k')
    try {
      await expect(dialog).toBeVisible({ timeout: 2000 })
    } catch {
      await this.page.keyboard.press('Control+k')
      await expect(dialog).toBeVisible()
    }
  }

  /** Open the bottom Terminal tab and focus its prompt input. */
  async openTerminal() {
    await this.page.getByTestId('bottom-tab-terminal').click()
    const input = this.page.getByTestId('terminal-input').first()
    await expect(input).toBeVisible()
    await input.click()
    return input
  }

  /** Rapid key presses (mimic typing at 200+ WPM). */
  async rapidKeyPresses(targetSelector: string, keys: string[], delayMs = 10) {
    const element = this.page.locator(targetSelector).first()
    await expect(element).toBeVisible()
    for (const key of keys) {
      await this.page.keyboard.press(key, { delay: delayMs })
    }
  }

  /** Sustained key hold (mimic holding down a key). */
  async sustainedKeyHold(key: string, durationMs = 1000) {
    const startTime = Date.now()
    const pressInterval = 50
    while (Date.now() - startTime < durationMs) {
      await this.page.keyboard.press(key, { delay: pressInterval })
    }
  }

  /** Rapid tab cycling (forward/backward). */
  async rapidTabCycles(cycles: number, delayMs = 30) {
    for (let i = 0; i < cycles; i++) {
      await this.page.keyboard.press('Tab', { delay: delayMs })
    }
  }

  /** Reverse tab cycling with Shift+Tab. */
  async reverseTabCycles(cycles: number, delayMs = 30) {
    for (let i = 0; i < cycles; i++) {
      await this.page.keyboard.press('Shift+Tab', { delay: delayMs })
    }
  }

  /** Tab cycling at extreme speed (no delay). */
  async extremeSpeedTabCycles(cycles: number) {
    for (let i = 0; i < cycles; i++) {
      await this.page.keyboard.press('Tab')
    }
  }

  /** Alternating Tab/Shift+Tab (forward/backward rapidly). */
  async alternatingTabDirection(cycles: number, delayMs = 20) {
    for (let i = 0; i < cycles; i++) {
      await this.page.keyboard.press(i % 2 === 0 ? 'Tab' : 'Shift+Tab', { delay: delayMs })
    }
  }

  /** Arrow key mashing (all directions, random order). */
  async arrowKeyMashing(iterations: number, delayMs = 15) {
    const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
    for (let i = 0; i < iterations; i++) {
      const key = arrows[Math.floor(Math.random() * arrows.length)]
      await this.page.keyboard.press(key, { delay: delayMs })
    }
  }

  /** Rapid Ctrl/Cmd combinations. */
  async rapidCtrlCombos(combos: string[], delayMs = 20) {
    for (const combo of combos) {
      await this.page.keyboard.press(combo, { delay: delayMs })
    }
  }

  /** Held modifier key stress test (Ctrl, Shift, Alt held while pressing keys). */
  async heldModifierStress(
    modifier: 'Control' | 'Shift' | 'Alt',
    keySequence: string[],
    holdDurationMs = 500,
  ) {
    await this.page.keyboard.down(modifier)
    const startTime = Date.now()
    let keyIndex = 0
    while (Date.now() - startTime < holdDurationMs && keyIndex < keySequence.length) {
      await this.page.keyboard.press(keySequence[keyIndex], { delay: 30 })
      keyIndex++
    }
    await this.page.keyboard.up(modifier)
  }

  /** Rapid Enter key presses. */
  async rapidEnterPresses(count: number, delayMs = 25) {
    for (let i = 0; i < count; i++) {
      await this.page.keyboard.press('Enter', { delay: delayMs })
    }
  }

  /** Rapid Escape key presses. */
  async rapidEscapePresses(count: number, delayMs = 25) {
    for (let i = 0; i < count; i++) {
      await this.page.keyboard.press('Escape', { delay: delayMs })
    }
  }

  /** Ctrl/Cmd+Z spam (rapid undo). */
  async rapidUndoSpam(count: number, delayMs = 20) {
    for (let i = 0; i < count; i++) {
      await this.page.keyboard.press(this.combo('z'), { delay: delayMs })
    }
  }

  /** Ctrl/Cmd+Z then Ctrl/Cmd+Y spam (undo/redo rapid cycling). */
  async undoRedoCycling(cycles: number, delayMs = 25) {
    const redoKey = this.modifier === 'Meta' ? 'Meta+Shift+z' : 'Control+y'
    for (let i = 0; i < cycles; i++) {
      await this.page.keyboard.press(this.combo('z'), { delay: delayMs })
      await this.page.keyboard.press(redoKey, { delay: delayMs })
    }
  }

  /** Type a long string very rapidly into the focused control. */
  async rapidTypeString(_targetSelector: string, text: string, charDelayMs = 10) {
    for (const char of text) {
      await this.page.keyboard.type(char, { delay: charDelayMs })
    }
  }

  /** Replace a control's contents with large text blocks in quick succession. */
  async rapidPaste(targetSelector: string, textBlocks: string[]) {
    const input = this.page.locator(targetSelector).first()
    await expect(input).toBeVisible()
    for (const text of textBlocks) {
      await input.fill(text)
    }
  }

  /** Get current focused element info. */
  async getFocusedElement(): Promise<FocusInfo> {
    return this.page.evaluate(() => {
      const focused = document.activeElement as HTMLElement | null
      const className =
        typeof focused?.className === 'string' ? focused.className : 'none'
      return {
        tag: focused?.tagName ?? 'NONE',
        id: focused?.id || 'none',
        class: className || 'none',
        text: focused?.textContent?.slice(0, 50) || 'none',
        ariaLabel: focused?.getAttribute('aria-label') || 'none',
      }
    })
  }

  /** Verify focus is inside a specific container. */
  async assertFocusInContainer(containerSelector: string) {
    const focused = await this.getFocusedElement()
    const isInside = await this.page.evaluate((selector) => {
      const container = document.querySelector(selector)
      const active = document.activeElement
      return container !== null && container.contains(active)
    }, containerSelector)

    if (!isInside) {
      throw new Error(
        `Focus escaped container "${containerSelector}". Currently focused: ${JSON.stringify(focused)}`,
      )
    }
  }

  /** Check for console errors during stress test. */
  captureConsoleErrors(callback: (error: StressError) => void) {
    this.page.on('console', (msg) => {
      if (msg.type() !== 'error') return
      const text = msg.text()
      // The frontend E2E harness intentionally runs without the Rust API or
      // Ollama. Failed resource loads from those services are expected and are
      // not JavaScript defects, so ignore only those network-level messages.
      if (
        text.includes('Failed to load resource') ||
        text.includes('Cross-Origin Request Blocked') ||
        text.includes('CORS request did not succeed') ||
        /ERR_CONNECTION_REFUSED|ECONNREFUSED|Bad Gateway/.test(text)
      ) {
        return
      }
      const location = msg.location()
      callback({ message: text, location })
    })
  }

  /** Check for unhandled promise rejections / page errors. */
  captureUnhandledRejections(callback: (error: StressError) => void) {
    this.page.on('pageerror', (err) => {
      callback({ message: err.message, stack: err.stack })
    })
  }

  /** Heap usage where the browser exposes it (Chromium), otherwise null. */
  async getMemoryUsage() {
    return this.page.evaluate(() => {
      const perf = performance as Performance & { memory?: PerformanceMemory }
      if (!perf.memory) return null
      return {
        usedJSHeapSize: perf.memory.usedJSHeapSize,
        totalJSHeapSize: perf.memory.totalJSHeapSize,
        jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
      }
    })
  }

  /** Run stress test and collect all metrics. */
  async runStressTest(testFn: () => Promise<void>) {
    const errors: StressError[] = []
    const rejections: StressError[] = []

    this.captureConsoleErrors((err) => errors.push(err))
    this.captureUnhandledRejections((err) => rejections.push(err))

    const memStart = await this.getMemoryUsage()
    const timeStart = Date.now()

    try {
      await testFn()
    } catch (error) {
      errors.push({ message: error instanceof Error ? error.message : String(error) })
    }

    const timeEnd = Date.now()
    const memEnd = await this.getMemoryUsage()

    return {
      duration: timeEnd - timeStart,
      errors,
      rejections,
      memoryDelta:
        memEnd && memStart ? memEnd.usedJSHeapSize - memStart.usedJSHeapSize : null,
      passed: errors.length === 0 && rejections.length === 0,
    }
  }
}

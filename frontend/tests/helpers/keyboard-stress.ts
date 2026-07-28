import { Page, expect } from '@playwright/test'

/**
 * Keyboard Stress Testing Helpers
 * Test real keyboard input at extremes to find breaking points
 */

export class KeyboardStressTester {
  constructor(private page: Page) {}

  /**
   * Rapid key presses (mimic typing at 200+ WPM)
   * Find: input lag, race conditions, dropped keypresses
   */
  async rapidKeyPresses(targetSelector: string, keys: string[], delayMs = 10) {
    const element = await this.page.$(targetSelector)
    if (!element) throw new Error(`Element not found: ${targetSelector}`)

    for (const key of keys) {
      await this.page.keyboard.press(key, { delay: delayMs })
      // Don't wait between presses — simulate real rapid typing
    }
  }

  /**
   * Sustained key hold (mimic holding down a key)
   * Find: stuck focus, infinite loops, memory leaks
   */
  async sustainedKeyHold(key: string, durationMs = 1000) {
    const startTime = Date.now()
    const pressInterval = 50 // Re-press key every 50ms to simulate hold

    while (Date.now() - startTime < durationMs) {
      await this.page.keyboard.press(key, { delay: pressInterval })
    }
  }

  /**
   * Rapid tab cycling (forward/backward)
   * Find: focus traps, focus loss, focus position corruption
   */
  async rapidTabCycles(cycles: number, delayMs = 30) {
    for (let i = 0; i < cycles; i++) {
      await this.page.keyboard.press('Tab', { delay: delayMs })
      await this.page.waitForTimeout(10) // minimal wait
    }
  }

  /**
   * Reverse tab cycling with Shift+Tab
   * Find: backward navigation issues, focus order reversal problems
   */
  async reverseTabCycles(cycles: number, delayMs = 30) {
    for (let i = 0; i < cycles; i++) {
      await this.page.keyboard.press('Shift+Tab', { delay: delayMs })
      await this.page.waitForTimeout(10)
    }
  }

  /**
   * Tab cycling at extreme speed (no delay)
   * Find: race conditions, missed focus updates
   */
  async extremeSpeedTabCycles(cycles: number) {
    for (let i = 0; i < cycles; i++) {
      await this.page.keyboard.press('Tab')
    }
  }

  /**
   * Alternating Tab/Shift+Tab (forward/backward rapidly)
   * Find: focus state corruption, navigation order issues
   */
  async alternatingTabDirection(cycles: number, delayMs = 20) {
    for (let i = 0; i < cycles; i++) {
      await this.page.keyboard.press(i % 2 === 0 ? 'Tab' : 'Shift+Tab', { delay: delayMs })
      await this.page.waitForTimeout(5)
    }
  }

  /**
   * Arrow key mashing (all directions, random order)
   * Find: scroll position issues, selection corruption, navigation edge cases
   */
  async arrowKeyMashing(iterations: number, delayMs = 15) {
    const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
    for (let i = 0; i < iterations; i++) {
      const key = arrows[Math.floor(Math.random() * arrows.length)]
      await this.page.keyboard.press(key, { delay: delayMs })
    }
  }

  /**
   * Rapid Ctrl/Cmd combinations
   * Find: keyboard modifier handling issues, shortcut conflicts
   */
  async rapidCtrlCombos(combos: string[], delayMs = 20) {
    for (const combo of combos) {
      await this.page.keyboard.press(combo, { delay: delayMs })
      await this.page.waitForTimeout(10)
    }
  }

  /**
   * Held modifier key stress test (Ctrl, Shift, Alt held while pressing other keys)
   * Find: modifier key state corruption, unexpected behavior
   */
  async heldModifierStress(modifier: 'Control' | 'Shift' | 'Alt', keySequence: string[], holdDurationMs = 500) {
    await this.page.keyboard.down(modifier)
    const startTime = Date.now()

    // Press keys while modifier is held
    let keyIndex = 0
    while (Date.now() - startTime < holdDurationMs && keyIndex < keySequence.length) {
      await this.page.keyboard.press(keySequence[keyIndex], { delay: 30 })
      keyIndex++
      await this.page.waitForTimeout(20)
    }

    await this.page.keyboard.up(modifier)
  }

  /**
   * Rapid Enter key presses (create cells, execute, confirm dialogs)
   * Find: double-creation, race conditions in form submission
   */
  async rapidEnterPresses(count: number, delayMs = 25) {
    for (let i = 0; i < count; i++) {
      await this.page.keyboard.press('Enter', { delay: delayMs })
      await this.page.waitForTimeout(10)
    }
  }

  /**
   * Rapid Escape key presses (close modals, cancel operations)
   * Find: modal stack corruption, focus loss, state inconsistency
   */
  async rapidEscapePresses(count: number, delayMs = 25) {
    for (let i = 0; i < count; i++) {
      await this.page.keyboard.press('Escape', { delay: delayMs })
      await this.page.waitForTimeout(10)
    }
  }

  /**
   * Ctrl/Cmd+Z spam (rapid undo)
   * Find: undo buffer issues, state corruption, memory leaks
   */
  async rapidUndoSpam(count: number, delayMs = 20) {
    const undoKey = process.platform === 'darwin' ? 'Meta+z' : 'Control+z'
    for (let i = 0; i < count; i++) {
      await this.page.keyboard.press(undoKey, { delay: delayMs })
      await this.page.waitForTimeout(15)
    }
  }

  /**
   * Ctrl/Cmd+Z then Ctrl/Cmd+Y spam (undo/redo rapid cycling)
   * Find: undo/redo state divergence, corruption
   */
  async undoRedoCycling(cycles: number, delayMs = 25) {
    const undoKey = process.platform === 'darwin' ? 'Meta+z' : 'Control+z'
    const redoKey = process.platform === 'darwin' ? 'Meta+Shift+z' : 'Control+y'

    for (let i = 0; i < cycles; i++) {
      await this.page.keyboard.press(undoKey, { delay: delayMs })
      await this.page.waitForTimeout(20)
      await this.page.keyboard.press(redoKey, { delay: delayMs })
      await this.page.waitForTimeout(20)
    }
  }

  /**
   * Type a long string very rapidly
   * Find: input buffer overflow, text corruption, character dropping
   */
  async rapidTypeString(targetSelector: string, text: string, charDelayMs = 10) {
    const element = await this.page.$(targetSelector)
    if (!element) throw new Error(`Element not found: ${targetSelector}`)

    for (const char of text) {
      await this.page.keyboard.type(char, { delay: charDelayMs })
    }
  }

  /**
   * Paste large text blocks rapidly
   * Find: paste handling, memory issues, buffer overflow
   */
  async rapidPaste(targetSelector: string, textBlocks: string[], delayMs = 50) {
    const element = await this.page.$(targetSelector)
    if (!element) throw new Error(`Element not found: ${targetSelector}`)

    for (const text of textBlocks) {
      // Use clipboard API (works in Playwright)
      await this.page.evaluate(([selector, content]) => {
        const el = document.querySelector(selector) as HTMLElement
        if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
          el.value = content
          el.dispatchEvent(new Event('input', { bubbles: true }))
          el.dispatchEvent(new Event('change', { bubbles: true }))
        }
      }, [targetSelector, text])
      await this.page.waitForTimeout(delayMs)
    }
  }

  /**
   * Get current focused element info
   * Verify: focus didn't get lost, focus moved to expected element
   */
  async getFocusedElement() {
    return this.page.evaluate(() => {
      const focused = document.activeElement
      return {
        tag: focused?.tagName,
        id: (focused as any)?.id || 'none',
        class: (focused as any)?.className || 'none',
        text: focused?.textContent?.slice(0, 50) || 'none',
        ariaLabel: (focused as any)?.getAttribute('aria-label') || 'none',
      }
    })
  }

  /**
   * Verify focus is inside a specific container
   */
  async assertFocusInContainer(containerSelector: string) {
    const focused = await this.getFocusedElement()
    const isInside = await this.page.evaluate((selector) => {
      const container = document.querySelector(selector)
      const focused = document.activeElement
      return container?.contains(focused as Node) || false
    }, containerSelector)

    if (!isInside) {
      throw new Error(
        `Focus escaped container "${containerSelector}". Currently focused: ${JSON.stringify(focused)}`
      )
    }
  }

  /**
   * Monitor focus changes during stress test
   * Track: focus path, unexpected shifts, traps
   */
  async monitorFocusChanges(durationMs: number, callback: (changes: any[]) => void) {
    const changes: any[] = []
    let lastFocused = await this.getFocusedElement()

    const checkInterval = setInterval(async () => {
      const current = await this.getFocusedElement()
      if (JSON.stringify(current) !== JSON.stringify(lastFocused)) {
        changes.push({ from: lastFocused, to: current, timestamp: Date.now() })
        lastFocused = current
      }
    }, 50)

    await this.page.waitForTimeout(durationMs)
    clearInterval(checkInterval)
    callback(changes)
  }

  /**
   * Check for console errors during stress test
   */
  async captureConsoleErrors(callback: (error: any) => void) {
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        callback({ message: msg.text(), location: msg.location() })
      }
    })
  }

  /**
   * Check for unhandled promise rejections
   */
  async captureUnhandledRejections(callback: (error: any) => void) {
    this.page.on('pageerror', (err) => {
      callback({ message: err.message, stack: err.stack })
    })
  }

  /**
   * Stress test with memory monitoring
   */
  async getMemoryUsage() {
    return this.page.evaluate(() => {
      if ((performance as any).memory) {
        return {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
        }
      }
      return null
    })
  }

  /**
   * Run stress test and collect all metrics
   */
  async runStressTest(testFn: () => Promise<void>) {
    const errors: any[] = []
    const rejections: any[] = []

    this.captureConsoleErrors((err) => errors.push(err))
    this.captureUnhandledRejections((err) => rejections.push(err))

    const memStart = await this.getMemoryUsage()
    const timeStart = Date.now()

    try {
      await testFn()
    } catch (e) {
      errors.push(e)
    }

    const timeEnd = Date.now()
    const memEnd = await this.getMemoryUsage()

    return {
      duration: timeEnd - timeStart,
      errors,
      rejections,
      memoryDelta: memEnd && memStart ? memEnd.usedJSHeapSize - memStart.usedJSHeapSize : null,
      passed: errors.length === 0 && rejections.length === 0,
    }
  }
}

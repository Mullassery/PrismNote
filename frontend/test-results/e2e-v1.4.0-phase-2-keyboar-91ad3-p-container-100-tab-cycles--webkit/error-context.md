# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/v1.4.0-phase-2-keyboard-stress/keyboard-stress-tabs.spec.ts >> Keyboard Stress: Tab Navigation >> [STRESS-006] Focus shouldn't escape the app container (100 tab cycles)
- Location: tests/e2e/v1.4.0-phase-2-keyboard-stress/keyboard-stress-tabs.spec.ts:171:3

# Error details

```
Error: page.goto: Could not connect to the server.
Call log:
  - navigating to "http://localhost:5173/", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test'
  2   | import { KeyboardStressTester } from '../../helpers/keyboard-stress'
  3   | 
  4   | /**
  5   |  * Keyboard Stress Tests: Tab Navigation
  6   |  *
  7   |  * GOAL: Find where tab cycling breaks the app
  8   |  * EXTREMES TESTED:
  9   |  * - Rapid forward/backward cycling
  10  |  * - Extreme speed (no delays)
  11  |  * - Sustained holds
  12  |  * - Focus escape/corruption
  13  |  * - Memory issues
  14  |  */
  15  | 
  16  | test.describe('Keyboard Stress: Tab Navigation', () => {
  17  |   let page: Page
  18  |   let stress: KeyboardStressTester
  19  | 
  20  |   test.beforeEach(async ({ page: testPage }) => {
  21  |     page = testPage
  22  |     stress = new KeyboardStressTester(page)
> 23  |     await page.goto('/')
      |                ^ Error: page.goto: Could not connect to the server.
  24  |     await page.waitForLoadState('networkidle')
  25  |   })
  26  | 
  27  |   test('[STRESS-001] Rapid tab forward 100x - no crashes', async () => {
  28  |     const errors: any[] = []
  29  |     stress.captureConsoleErrors((err) => errors.push(err))
  30  |     stress.captureUnhandledRejections((err) => errors.push(err))
  31  | 
  32  |     // Start with keyboard focus in the app (click notebook area)
  33  |     await page.click('[data-testid="notebook-container"]')
  34  |     await page.waitForTimeout(100)
  35  | 
  36  |     const memStart = await stress.getMemoryUsage()
  37  | 
  38  |     // Rapid tab 100 times
  39  |     await stress.rapidTabCycles(100, 15) // 15ms between presses = 1.5s total
  40  | 
  41  |     const memEnd = await stress.getMemoryUsage()
  42  | 
  43  |     // Verify:
  44  |     const focused = await stress.getFocusedElement()
  45  |     expect(focused).toBeDefined()
  46  |     expect(focused.tag).toBeTruthy()
  47  | 
  48  |     // No console errors
  49  |     if (errors.length > 0) {
  50  |       console.log('Errors during rapid tab:', errors)
  51  |     }
  52  |     expect(errors).toHaveLength(0)
  53  | 
  54  |     // Memory didn't explode (allow 5MB growth for normal operation)
  55  |     if (memStart && memEnd) {
  56  |       const memGrowth = (memEnd.usedJSHeapSize - memStart.usedJSHeapSize) / 1024 / 1024 // in MB
  57  |       console.log(`Memory growth: ${memGrowth.toFixed(2)} MB`)
  58  |       expect(memGrowth).toBeLessThan(10) // 10MB is reasonable
  59  |     }
  60  |   })
  61  | 
  62  |   test('[STRESS-002] Extreme speed tab (no delay) 200x - find race conditions', async () => {
  63  |     const errors: any[] = []
  64  |     stress.captureConsoleErrors((err) => errors.push(err))
  65  | 
  66  |     await page.click('[data-testid="notebook-container"]')
  67  |     await page.waitForTimeout(100)
  68  | 
  69  |     const focusLog: any[] = []
  70  |     let lastFocus = await stress.getFocusedElement()
  71  |     focusLog.push({ step: 0, ...lastFocus })
  72  | 
  73  |     // Tab at absolute maximum speed (no artificial delay)
  74  |     for (let i = 0; i < 200; i++) {
  75  |       await page.keyboard.press('Tab')
  76  |       if (i % 20 === 0) {
  77  |         const current = await stress.getFocusedElement()
  78  |         focusLog.push({ step: i, ...current })
  79  |       }
  80  |     }
  81  | 
  82  |     const finalFocus = await stress.getFocusedElement()
  83  |     expect(finalFocus).toBeDefined()
  84  | 
  85  |     // Did focus stay within the app?
  86  |     expect(finalFocus.id || finalFocus.class).not.toBe('none')
  87  | 
  88  |     console.log('Focus progression:', focusLog)
  89  |     console.log('Errors:', errors.length > 0 ? errors : 'NONE')
  90  |   })
  91  | 
  92  |   test('[STRESS-003] Reverse tab (Shift+Tab) 100x - check backward navigation', async () => {
  93  |     const errors: any[] = []
  94  |     stress.captureConsoleErrors((err) => errors.push(err))
  95  |     stress.captureUnhandledRejections((err) => errors.push(err))
  96  | 
  97  |     await page.click('[data-testid="notebook-container"]')
  98  |     await page.waitForTimeout(100)
  99  | 
  100 |     const memStart = await stress.getMemoryUsage()
  101 | 
  102 |     // Rapid Shift+Tab 100 times
  103 |     await stress.reverseTabCycles(100, 15)
  104 | 
  105 |     const memEnd = await stress.getMemoryUsage()
  106 | 
  107 |     const focused = await stress.getFocusedElement()
  108 |     expect(focused).toBeDefined()
  109 | 
  110 |     expect(errors).toHaveLength(0)
  111 | 
  112 |     if (memStart && memEnd) {
  113 |       const memGrowth = (memEnd.usedJSHeapSize - memStart.usedJSHeapSize) / 1024 / 1024
  114 |       console.log(`Reverse tab memory growth: ${memGrowth.toFixed(2)} MB`)
  115 |       expect(memGrowth).toBeLessThan(10)
  116 |     }
  117 |   })
  118 | 
  119 |   test('[STRESS-004] Alternating Tab/Shift+Tab 150x - check navigation order corruption', async () => {
  120 |     const errors: any[] = []
  121 |     const focusChanges: any[] = []
  122 | 
  123 |     stress.captureConsoleErrors((err) => errors.push(err))
```
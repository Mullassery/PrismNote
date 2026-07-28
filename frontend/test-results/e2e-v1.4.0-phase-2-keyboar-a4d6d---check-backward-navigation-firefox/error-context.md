# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/v1.4.0-phase-2-keyboard-stress/keyboard-stress-tabs.spec.ts >> Keyboard Stress: Tab Navigation >> [STRESS-003] Reverse tab (Shift+Tab) 100x - check backward navigation
- Location: tests/e2e/v1.4.0-phase-2-keyboard-stress/keyboard-stress-tabs.spec.ts:92:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('[data-testid="notebook-container"]')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]: "[plugin:vite:import-analysis] Failed to resolve import \"../lib/sqlExecutor\" from \"src/components/Cell.tsx\". Does the file exist?"
  - generic [ref=e5]: /Users/georgimullassery/prismnote/frontend/src/components/Cell.tsx:14:74
  - generic [ref=e6]: "12 | import { parseTraceback } from \"../lib/pyerror\"; 13 | import { LANGUAGES, getMonacoMode } from \"../lib/languages\"; 14 | import { executeSqlQuery, validateSqlQuery } from \"../lib/sqlExecutor\"; | ^ 15 | import SqlConnectionPicker from \"./SqlConnectionPicker\"; 16 | import SqlResultsView from \"./SqlResultsView\";"
  - generic [ref=e7]: at TransformPluginContext._formatLog (file:///Users/georgimullassery/prismnote/frontend/node_modules/vite/dist/node/chunks/node.js:30602:39) at TransformPluginContext.error (file:///Users/georgimullassery/prismnote/frontend/node_modules/vite/dist/node/chunks/node.js:30599:14) at normalizeUrl (file:///Users/georgimullassery/prismnote/frontend/node_modules/vite/dist/node/chunks/node.js:27842:18) at async file:///Users/georgimullassery/prismnote/frontend/node_modules/vite/dist/node/chunks/node.js:27905:30 at async Promise.all (index 13) at async TransformPluginContext.transform (file:///Users/georgimullassery/prismnote/frontend/node_modules/vite/dist/node/chunks/node.js:27873:4) at async EnvironmentPluginContainer.transform (file:///Users/georgimullassery/prismnote/frontend/node_modules/vite/dist/node/chunks/node.js:30387:14) at async loadAndTransform (file:///Users/georgimullassery/prismnote/frontend/node_modules/vite/dist/node/chunks/node.js:24646:26)
  - generic [ref=e8]:
    - text: Click outside, press Esc key, or fix the code to dismiss.
    - text: You can also disable this overlay by setting
    - code [ref=e9]: server.hmr.overlay
    - text: to
    - code [ref=e10]: "false"
    - text: in
    - code [ref=e11]: vite.config.ts
    - text: .
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
  23  |     await page.goto('/')
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
> 97  |     await page.click('[data-testid="notebook-container"]')
      |                ^ Error: page.click: Test timeout of 60000ms exceeded.
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
  124 | 
  125 |     await page.click('[data-testid="notebook-container"]')
  126 |     await page.waitForTimeout(100)
  127 | 
  128 |     // Alternate forward/backward rapidly
  129 |     for (let i = 0; i < 150; i++) {
  130 |       await page.keyboard.press(i % 2 === 0 ? 'Tab' : 'Shift+Tab', { delay: 10 })
  131 |       if (i % 30 === 0) {
  132 |         focusChanges.push(await stress.getFocusedElement())
  133 |       }
  134 |     }
  135 | 
  136 |     const finalFocus = await stress.getFocusedElement()
  137 |     expect(finalFocus).toBeDefined()
  138 | 
  139 |     // Focus should be somewhere in the app
  140 |     expect(finalFocus.tag).toBeTruthy()
  141 | 
  142 |     console.log('Focus changes:', focusChanges)
  143 |     expect(errors).toHaveLength(0)
  144 |   })
  145 | 
  146 |   test('[STRESS-005] Sustained Tab hold (2 seconds) - check for stuck focus', async () => {
  147 |     const errors: any[] = []
  148 |     stress.captureConsoleErrors((err) => errors.push(err))
  149 | 
  150 |     await page.click('[data-testid="notebook-container"]')
  151 |     await page.waitForTimeout(100)
  152 | 
  153 |     const focusBefore = await stress.getFocusedElement()
  154 | 
  155 |     // Hold Tab for 2 seconds (re-press every 50ms to simulate hold)
  156 |     await stress.sustainedKeyHold('Tab', 2000)
  157 | 
  158 |     const focusAfter = await stress.getFocusedElement()
  159 | 
  160 |     // Focus should have moved (Tab was held down)
  161 |     expect(focusAfter).toBeDefined()
  162 |     expect(focusAfter.tag).toBeTruthy()
  163 | 
  164 |     console.log('Focus before hold:', focusBefore)
  165 |     console.log('Focus after hold:', focusAfter)
  166 |     console.log('Errors:', errors)
  167 | 
  168 |     expect(errors).toHaveLength(0)
  169 |   })
  170 | 
  171 |   test('[STRESS-006] Focus shouldn\'t escape the app container (100 tab cycles)', async () => {
  172 |     const escapeEvents: any[] = []
  173 |     stress.captureConsoleErrors((err) => escapeEvents.push(err))
  174 | 
  175 |     await page.click('[data-testid="notebook-container"]')
  176 | 
  177 |     for (let i = 0; i < 100; i++) {
  178 |       await page.keyboard.press('Tab')
  179 |       const focused = await stress.getFocusedElement()
  180 | 
  181 |       // If focus is on "body" or "html", it escaped!
  182 |       if (focused.tag === 'HTML' || focused.tag === 'BODY') {
  183 |         escapeEvents.push({
  184 |           iteration: i,
  185 |           focused,
  186 |           message: 'Focus escaped to document level',
  187 |         })
  188 |       }
  189 |     }
  190 | 
  191 |     if (escapeEvents.length > 0) {
  192 |       console.log('FOCUS ESCAPE DETECTED:', escapeEvents)
  193 |     }
  194 |     expect(escapeEvents).toHaveLength(0) // Should NOT escape
  195 |   })
  196 | 
  197 |   test('[STRESS-007] Tab through all major UI sections - verify coverage', async () => {
```
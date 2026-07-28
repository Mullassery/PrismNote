# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/v1.4.0-phase-2-keyboard-stress/keyboard-stress-tabs.spec.ts >> Keyboard Stress: Tab Navigation >> [STRESS-007] Tab through all major UI sections - verify coverage
- Location: tests/e2e/v1.4.0-phase-2-keyboard-stress/keyboard-stress-tabs.spec.ts:197:3

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
  198 |     const focusSequence: string[] = []
  199 |     const expectedSections = ['notebook', 'sidebar', 'terminal', 'settings', 'deploy']
  200 | 
> 201 |     await page.click('[data-testid="notebook-container"]')
      |                ^ Error: page.click: Test timeout of 60000ms exceeded.
  202 | 
  203 |     // Tab 50 times and collect unique focus targets
  204 |     for (let i = 0; i < 50; i++) {
  205 |       await page.keyboard.press('Tab', { delay: 20 })
  206 |       const focused = await stress.getFocusedElement()
  207 |       focusSequence.push(`${focused.tag}#${focused.id || focused.class}`)
  208 |     }
  209 | 
  210 |     // Count unique focus points
  211 |     const uniqueFocus = new Set(focusSequence)
  212 |     console.log(`Unique focus points: ${uniqueFocus.size}`)
  213 |     console.log('Focus sequence (sample):', focusSequence.slice(0, 20))
  214 | 
  215 |     // Should have visited multiple sections (not stuck on one)
  216 |     expect(uniqueFocus.size).toBeGreaterThan(3)
  217 |   })
  218 | 
  219 |   test('[STRESS-008] Tab after rapid modal open/close - verify focus restoration', async () => {
  220 |     await page.click('[data-testid="notebook-container"]')
  221 | 
  222 |     // Open and close settings modal 10 times rapidly
  223 |     for (let i = 0; i < 10; i++) {
  224 |       await page.keyboard.press('Comma') // Settings shortcut
  225 |       await page.waitForTimeout(50)
  226 |       await page.keyboard.press('Escape') // Close modal
  227 |       await page.waitForTimeout(50)
  228 |     }
  229 | 
  230 |     // Now try tabbing — should work and focus should be restored
  231 |     const focusBefore = await stress.getFocusedElement()
  232 |     await stress.rapidTabCycles(20, 20)
  233 |     const focusAfter = await stress.getFocusedElement()
  234 | 
  235 |     expect(focusAfter).toBeDefined()
  236 |     expect(focusAfter.tag).toBeTruthy()
  237 | 
  238 |     console.log('Focus restored properly after modal cycles')
  239 |   })
  240 | 
  241 |   test('[STRESS-009] Check for focus trap in modals - can you Tab out?', async () => {
  242 |     // Open command palette (should create a focus trap)
  243 |     await page.keyboard.press('Meta+k') // Cmd+K (or Ctrl+K on Linux)
  244 |     await page.waitForTimeout(200)
  245 | 
  246 |     const modalOpen = await page.$('[role="dialog"]')
  247 |     expect(modalOpen).toBeTruthy() // Modal should be open
  248 | 
  249 |     // Tab 30 times inside modal
  250 |     await stress.rapidTabCycles(30, 20)
  251 | 
  252 |     // Focus should still be inside modal (no escape)
  253 |     try {
  254 |       await stress.assertFocusInContainer('[role="dialog"]')
  255 |       console.log('✓ Focus trap working correctly (focus stayed in modal)')
  256 |     } catch (e) {
  257 |       console.log('✗ Focus trap broken (focus escaped modal):', e.message)
  258 |       throw e
  259 |     }
  260 | 
  261 |     // Close modal
  262 |     await page.keyboard.press('Escape')
  263 |     await page.waitForTimeout(100)
  264 |   })
  265 | 
  266 |   test('[STRESS-010] Stress test with memory monitoring - detect leaks', async ({ page: testPage }) => {
  267 |     const memorySnapshots: number[] = []
  268 | 
  269 |     // Warm up
  270 |     await page.click('[data-testid="notebook-container"]')
  271 |     await page.waitForTimeout(200)
  272 | 
  273 |     // Tab cycle with memory monitoring
  274 |     for (let cycle = 0; cycle < 5; cycle++) {
  275 |       const mem = await stress.getMemoryUsage()
  276 |       if (mem) memorySnapshots.push(mem.usedJSHeapSize)
  277 | 
  278 |       // 50 rapid tabs per cycle
  279 |       await stress.rapidTabCycles(50, 10)
  280 | 
  281 |       await page.waitForTimeout(100)
  282 |     }
  283 | 
  284 |     // Analyze memory trend
  285 |     console.log('Memory snapshots (MB):', memorySnapshots.map((m) => (m / 1024 / 1024).toFixed(2)))
  286 | 
  287 |     if (memorySnapshots.length >= 2) {
  288 |       const firstMem = memorySnapshots[0]
  289 |       const lastMem = memorySnapshots[memorySnapshots.length - 1]
  290 |       const growthPercent = ((lastMem - firstMem) / firstMem) * 100
  291 | 
  292 |       console.log(`Memory growth: ${growthPercent.toFixed(1)}%`)
  293 | 
  294 |       // Should not grow more than 30%
  295 |       expect(growthPercent).toBeLessThan(30)
  296 |     }
  297 |   })
  298 | })
  299 | 
```
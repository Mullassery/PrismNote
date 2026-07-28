# Keyboard Stress Testing Guide - PrismNote v1.4.0

## Overview

Keyboard stress testing finds the exact breaking points in the application by simulating extreme keyboard input scenarios that real users might never hit, but that reveal underlying architectural issues.

## Why Stress Test Keyboards?

1. **Real-world extremes**: Users type fast, spam keys, hold modifiers, use rapid shortcuts
2. **Race conditions**: Rapid input exposes timing bugs invisible in normal testing
3. **Memory leaks**: Sustained keyboard activity reveals memory cleanup issues
4. **Focus corruption**: Tab cycling exposes focus management bugs
5. **State inconsistency**: Undo/redo spam reveals state machine issues

## Test Categories

### 1. Tab Navigation Stress (keyboard-stress-tabs.spec.ts)
**Goal:** Find focus management issues

**Tests:**
- [x] Rapid tab forward 100x (15ms between presses)
- [x] Extreme speed tab 200x (no delay) — race conditions
- [x] Reverse tab (Shift+Tab) 100x
- [x] Alternating Tab/Shift+Tab 150x
- [x] Sustained Tab hold (2 seconds)
- [x] Focus escape detection (should not reach HTML/BODY)
- [x] Tab through all UI sections
- [x] Focus restoration after modal cycles
- [x] Focus trap verification (in modals)
- [x] Memory leak detection (cycling)

**Expected Breaking Points:**
- Focus escapes to document level
- Focus gets stuck in infinite loop
- Memory grows linearly (leak)
- Focus traps don't work properly
- Tab order is random/inconsistent

**Metrics:**
- Console errors: 0
- Unhandled rejections: 0
- Focus escapes: 0
- Memory growth: < 10MB per 100 presses

### 2. Enter & Escape Key Stress (keyboard-stress-enter-escape.spec.ts)
**Goal:** Find modal management and form submission issues

**Tests:**
- [x] Rapid Enter 50x (cell creation)
- [x] Rapid Escape 50x (modal closing)
- [x] Tab+Enter in modal 30x (form submission)
- [x] Open modal while closing (race condition)
- [x] Enter in text input vs form submission
- [x] Escape in nested context
- [x] Undo/Redo cycling 20x
- [x] Enter with modifiers (Shift/Ctrl+Enter)
- [x] Modal open/close cycles (memory monitoring)
- [x] Memory leak during modal cycling

**Expected Breaking Points:**
- Duplicate cell creation
- Modal stack corruption
- Forms submit multiple times
- Undo/redo state diverges
- Modal doesn't close properly
- Focus doesn't restore after modal

**Metrics:**
- All modals close when Escape pressed
- Cells created once per Enter press
- Form doesn't submit multiple times
- Memory stable (< 25% growth)

### 3. Arrow Keys & Text Input (keyboard-stress-arrow-keys.spec.ts)
**Goal:** Find text editing and navigation issues

**Tests:**
- [x] Arrow key mashing 100x random
- [x] Rapid vertical arrows 100x
- [x] Rapid horizontal arrows 100x
- [x] Type 1KB text rapidly (1ms per char)
- [x] Paste 5 large blocks rapidly
- [x] Type while scrolling
- [x] Ctrl/Meta+Arrow word jumping 60x
- [x] Shift+Arrow selection 100x
- [x] Home/End navigation
- [x] Page Up/Page Down 40x
- [x] Delete/Backspace spam 40x
- [x] Type/Select/Delete cycle 10x
- [x] 5KB text paste then navigate
- [x] Modifier key combinations 50x

**Expected Breaking Points:**
- Text gets corrupted or characters dropped
- Scroll position jumps unexpectedly
- Selection gets stuck or corrupted
- Memory spikes with large pastes
- Delete doesn't work properly
- Cursor position wrong after navigation

**Metrics:**
- Text integrity maintained
- No character dropping
- Scroll position reasonable
- Memory < 15MB for 1KB paste

### 4. Panel Navigation Stress (keyboard-stress-panels.spec.ts)
**Goal:** Test keyboard functionality in each major panel

**Panels Tested:**
- Notebook (cells, execution)
- File Explorer (tree navigation)
- Terminal (command execution)
- Command Palette (search, execution)
- Settings (form fields)
- Data Explorer (table navigation)

**Cross-Panel Tests:**
- Rapid tab across panels
- Shortcuts from different panels
- Panel visibility toggling
- Panel switching + keyboard interaction
- Memory during panel switching

**Metrics:**
- Each panel responds to Tab
- Each panel responds to Arrow keys
- Shortcuts work from any panel
- Panel switching doesn't leak memory

## Test Execution Patterns

### Pattern 1: Rapid Presses
```typescript
for (let i = 0; i < 100; i++) {
  await page.keyboard.press('Tab', { delay: 15 })
  await page.waitForTimeout(10)
}
```
**Finds:** Race conditions, missed state updates

### Pattern 2: Extreme Speed (No Delay)
```typescript
for (let i = 0; i < 200; i++) {
  await page.keyboard.press('Tab')
}
```
**Finds:** Missing debounce, race conditions

### Pattern 3: Sustained Hold
```typescript
await stress.sustainedKeyHold('Tab', 2000)
```
**Finds:** Stuck focus, infinite loops

### Pattern 4: Random Mashing
```typescript
const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
for (let i = 0; i < 100; i++) {
  const key = arrows[Math.floor(Math.random() * 4)]
  await page.keyboard.press(key, { delay: 15 })
}
```
**Finds:** Scroll position issues, selection corruption

## Metrics to Track

### 1. **Console Errors**
```typescript
const errors: any[] = []
stress.captureConsoleErrors((err) => errors.push(err))
// ... test ...
expect(errors).toHaveLength(0)
```

### 2. **Unhandled Rejections**
```typescript
stress.captureUnhandledRejections((err) => rejections.push(err))
expect(rejections).toHaveLength(0)
```

### 3. **Memory Growth**
```typescript
const memStart = await stress.getMemoryUsage()
// ... test ...
const memEnd = await stress.getMemoryUsage()
const growth = (memEnd.usedJSHeapSize - memStart.usedJSHeapSize) / 1024 / 1024
expect(growth).toBeLessThan(10) // MB
```

### 4. **Focus Management**
```typescript
const focused = await stress.getFocusedElement()
expect(focused.tag).not.toBe('HTML') // Shouldn't escape
```

### 5. **Modal Stack**
```typescript
const modalsOpen = await page.locator('[role="dialog"]').count()
expect(modalsOpen).toBe(0) // Should close
```

## Running Tests

### Run all keyboard stress tests
```bash
cd frontend
npm run test:e2e -- v1.4.0-phase-2-keyboard-stress
```

### Run specific test file
```bash
npm run test:e2e -- keyboard-stress-tabs.spec.ts
```

### Run with browser visible
```bash
npm run test:e2e:ui -- v1.4.0-phase-2-keyboard-stress
```

### Run on multiple browsers
```bash
npm run test:e2e -- v1.4.0-phase-2-keyboard-stress --project=chromium --project=firefox --project=webkit
```

### Generate HTML report
```bash
npm run test:e2e -- v1.4.0-phase-2-keyboard-stress
npx playwright show-report
```

## Interpreting Results

### ✅ All Tests Pass
- App is robust to keyboard extremes
- No memory leaks
- No focus corruption
- Ready for user testing

### ⚠️ Some Tests Fail
1. **Tab Cycling Fails** → Focus management issue
   - Fix: Add focus event handlers, verify tab order
   
2. **Enter Presses Fail** → Form submission issue
   - Fix: Add debounce, check state before submit
   
3. **Memory Grows** → Memory leak
   - Fix: Remove event listeners, clean up state in useEffect cleanup
   
4. **Escape Doesn't Close** → Modal management issue
   - Fix: Check modal stack, verify Escape handler

5. **Text Corrupted** → Input handling issue
   - Fix: Check debounce, verify state updates

### 🔴 Crash or Hang
1. **Browser Crashes** → Severe bug
   - Collect error logs, reduce test intensity
   
2. **Tests Hang** → Infinite loop or deadlock
   - Add timeout, check for race conditions

## Key Breaking Points to Investigate

### 1. Focus Management
- [ ] Tab cycling properly?
- [ ] Shift+Tab goes backward?
- [ ] Focus trapped in modal?
- [ ] Focus restored after modal close?
- [ ] Focus escapes to document?

### 2. Modal Stack
- [ ] Multiple modals stack correctly?
- [ ] Escape closes top modal first?
- [ ] Escape closes all on rapid press?
- [ ] Modal state isn't corrupted?

### 3. Cell Management
- [ ] Rapid Shift+Enter creates cells?
- [ ] Cells don't duplicate?
- [ ] Undo/redo works after creation?
- [ ] Rapid delete doesn't crash?

### 4. Text Input
- [ ] Long text doesn't drop characters?
- [ ] Paste works at extreme speed?
- [ ] Selection stable during editing?
- [ ] Delete/Backspace works reliably?

### 5. Memory
- [ ] Tab cycling doesn't leak?
- [ ] Modal cycles don't leak?
- [ ] Text input doesn't leak?
- [ ] Growth < 30% during test?

## Fixing Bugs Found

### Step 1: Reproduce
Create minimal test that triggers the issue consistently

### Step 2: Trace
- Check browser DevTools (timing, state)
- Look at Redux state changes
- Monitor network requests

### Step 3: Fix
- Add debounce if race condition
- Clean up listeners in useEffect
- Fix state management
- Add guards for invalid state

### Step 4: Test
- Verify fix with stress test
- Run full suite
- Test in browser manually

## Advanced Stress Scenarios

### Scenario 1: Speed Demon
User with 200+ WPM typing speed
```typescript
// Type 1000 characters in 5 seconds
await stress.rapidTypeString(selector, longText, 5)
```

### Scenario 2: Keyboard Autorepeater
User with key autorepeat enabled
```typescript
// Hold Tab for 3 seconds
await stress.sustainedKeyHold('Tab', 3000)
```

### Scenario 3: Accessibility Power User
User relying entirely on keyboard navigation
```typescript
// Tab 300 times without clicking
await stress.rapidTabCycles(300, 15)
```

### Scenario 4: Power User Shortcuts
User rapidly firing keyboard shortcuts
```typescript
// Rapid Cmd+Z, Cmd+Shift+Z, Cmd+K
for (let i = 0; i < 50; i++) {
  await page.keyboard.press(undoKey)
  await page.keyboard.press(redoKey)
  await page.keyboard.press(paletteKey)
}
```

### Scenario 5: Desktop to Mobile
User with low-latency keyboard (e.g., gaming keyboard)
```typescript
// No delay between presses
for (let i = 0; i < 200; i++) {
  await page.keyboard.press('Tab')
}
```

## Success Criteria for Phase v1.4.0

### MUST PASS
- [x] All 10 tab cycling tests pass
- [x] All 10 Enter/Escape tests pass
- [x] All 14 arrow key tests pass
- [x] All 20 panel tests pass
- [ ] Zero console errors
- [ ] Zero unhandled rejections
- [ ] Zero focus escapes
- [ ] Memory growth < 30% in any test

### SHOULD PASS
- [ ] All tests pass on Chromium, Firefox, Safari
- [ ] Tests complete in < 2 minutes total
- [ ] No flaky tests (0 retries)
- [ ] HTML report shows all green

### NICE TO HAVE
- [ ] Performance benchmarks (e.g., "Tab took 45ms avg")
- [ ] Focus path visualization
- [ ] Memory profile report

## Next Phases

After Phase 2 (Keyboard Stress) passes:
- **Phase 3:** UI Stability (rapid tab switching, panel collapse/expand)
- **Phase 4:** Code Execution (cell creation/deletion, output rendering)
- **Phase 5:** Accessibility (WCAG compliance, screen reader support)

---

**Remember:** Stress tests are about finding issues before users do. Every failure is valuable data.

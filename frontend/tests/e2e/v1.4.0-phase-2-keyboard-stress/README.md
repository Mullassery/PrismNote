# Keyboard Stress Tests - Phase 2

**Goal:** Find exactly where the app breaks under keyboard input extremes.

## Test Files

### 1. `keyboard-stress-tabs.spec.ts` (10 tests)
Tab navigation stress testing - find focus traps, corruption, memory leaks.

**Extremes Tested:**
- Rapid tab forward 100x (15ms delay)
- Extreme speed tab 200x (no delay) — race conditions
- Reverse tab (Shift+Tab) 100x
- Alternating Tab/Shift+Tab 150x
- Sustained Tab hold (2 seconds)
- Focus escape detection
- Tab through all UI sections
- Focus restoration after modal cycles
- Focus trap verification
- Memory leak detection (5 cycles × 50 presses each)

**Breaking Points to Find:**
- [ ] Does focus ever escape to `<html>` or `<body>`?
- [ ] Does focus get stuck (not move on keypress)?
- [ ] Does memory grow linearly with tab cycles?
- [ ] Are focus traps properly implemented in modals?
- [ ] Does focus order match expected tab order?

### 2. `keyboard-stress-enter-escape.spec.ts` (10 tests)
Enter/Escape key stress - modals, forms, state corruption.

**Extremes Tested:**
- Rapid Enter 50x (cell creation)
- Rapid Escape 50x (modal closing)
- Tab+Enter in modal 30x (form submission)
- Rapid Escape during modal opening (race condition)
- Enter in text input (insertion vs form submission)
- Escape in nested context
- Undo/Redo spam (20x cycles)
- Enter with modifiers (Shift+Enter, Ctrl+Enter)
- Modal open/close cycles with memory monitoring

**Breaking Points to Find:**
- [ ] Does app create duplicate cells or objects?
- [ ] Does modal stack get corrupted when closing?
- [ ] Do forms submit multiple times?
- [ ] Does undo/redo state diverge?
- [ ] Does focus restoration work after modals?

### 3. `keyboard-stress-arrow-keys.spec.ts` (14 tests)
Arrow keys, text input, extreme typing/pasting.

**Extremes Tested:**
- Arrow key mashing 100x random
- Rapid vertical arrows 100x (scroll position)
- Rapid horizontal arrows 100x
- Type 1KB text rapidly (1ms per char)
- Paste 5 large blocks rapidly
- Type while scrolling
- Ctrl/Meta+Arrow word jumping 60x
- Shift+Arrow selection 100x
- Home/End rapid navigation
- Page Up/Page Down 40x
- Delete/Backspace spam 40x
- Type/Select/Delete cycle 10x
- 5KB text paste then navigate
- Modifier key combinations 50x

**Breaking Points to Find:**
- [ ] Does text get corrupted or dropped?
- [ ] Does scroll position jump unexpectedly?
- [ ] Does selection get stuck?
- [ ] Memory growth with large pastes?
- [ ] Do delete/backspace work reliably?

## Running the Tests

### All keyboard stress tests
```bash
npm run test:e2e v1.4.0-phase-2-keyboard-stress
```

### Single test file
```bash
npm run test:e2e keyboard-stress-tabs
npm run test:e2e keyboard-stress-enter-escape
npm run test:e2e keyboard-stress-arrow-keys
```

### Debug mode (watch browser)
```bash
npm run test:e2e v1.4.0-phase-2-keyboard-stress --ui
```

### Generate HTML report
```bash
npm run test:e2e v1.4.0-phase-2-keyboard-stress
npx playwright show-report
```

## Key Metrics

Track these for each test run:

1. **Pass Rate** — All tests should pass (0 crashes)
2. **Console Errors** — No JavaScript errors logged
3. **Unhandled Rejections** — No promise rejections
4. **Memory Growth** — Should be <10-15MB per test
5. **Focus Escapes** — Should be 0
6. **Modal Count** — Should be 0 after Escape
7. **Text Integrity** — No character dropping

## Stress Test Pattern

```typescript
// Every test follows this pattern:
const errors: any[] = []
stress.captureConsoleErrors((err) => errors.push(err))
stress.captureUnhandledRejections((err) => errors.push(err))

// Do extreme action
await stress.rapidTabCycles(100, 15)

// Verify no crashes
expect(errors).toHaveLength(0)
expect(focused).toBeDefined()
```

## Known Issues to Track

Create a GitHub issue for each breaking point found:
- [ ] Tab focus trap issue
- [ ] Modal stack corruption
- [ ] Text input buffer overflow
- [ ] Memory leak in focus restoration
- etc.

## Browser Compatibility

Tests run on:
- ✓ Chromium (primary)
- ✓ Firefox (modifier key handling)
- ✓ Safari/WebKit (focus management)

## Next Steps (Phase 3)

After stress tests pass:
1. **UI Stability Tests** — Rapid tab switching, panel collapse/expand
2. **Code Execution Tests** — Cell creation/deletion, output rendering
3. **Accessibility Tests** — Screen reader, WCAG compliance

---

**Remember:** The goal is to FIND where things break, then fix them. Every crash is valuable data.

# PrismNote Roadmap (v1.3 → v2.0+)

**Modern Data Science Notebook — Rust + React, SQL/Spark Execution, 8 Cloud Warehouses**

---

## Current Status (v1.3.0)

✅ Production-ready for:
- Multi-cell notebooks with Python/SQL/Markdown
- Chart visualization (Vega-Lite)
- Cloud warehouse connections (8 providers)
- File system integration
- Search + command palette
- Basic AI assistance

❌ Known Issues:
- UI breaks on rapid tab switching
- Keyboard navigation incomplete
- No accessibility (WCAG 2.1) testing
- Code execution not browser-tested
- Panel collapse/expand flaky

---

## v1.4.0 — UI Stability & Testing (Next Release, 4 weeks)

**Goal:** Comprehensive UI testing via keyboard + browser execution.

### Phase 1: Testing Infrastructure (Week 1)
- [ ] Expand Playwright config (Firefox, Safari + Chromium)
- [ ] Create test fixtures (sample notebooks, code snippets)
- [ ] Build keyboard navigation utilities
- [ ] Build code execution utilities
- [ ] Build verification helpers (output capture, state checking)

**Deliverables:**
- `tests/fixtures/notebooks.ts` — 10 sample notebooks
- `tests/fixtures/code-samples.ts` — 30 code snippets
- `tests/helpers/keyboard.ts` — keyboard navigation helpers
- `tests/helpers/execution.ts` — code execution utilities

### Phase 2: Keyboard Navigation (Week 2)
**34 tests across 5 categories**

- [ ] **Navigation-tabs.spec.ts** (8 tests)
  - Tab cycling (forward/backward)
  - Tab persistence after execution
  - No focus traps
  
- [ ] **Navigation-cells.spec.ts** (10 tests)
  - Arrow keys move between cells
  - Ctrl/Cmd+Home/End jump to first/last
  - Enter creates new cell
  - Shift+Enter executes current
  - Backspace in empty cell deletes
  - Cell reordering (Ctrl/Cmd+Up/Down)
  
- [ ] **Navigation-sidebars.spec.ts** (5 tests)
  - Sidebar tab switching
  - Tree item navigation
  - Expand/collapse
  
- [ ] **Navigation-modals.spec.ts** (5 tests)
  - Settings dialog keyboard
  - Escape closes
  - Focus trap works
  - Focus return on close
  
- [ ] **Search-palette.spec.ts** (6 tests)
  - Cmd/Ctrl+K opens
  - Type filters
  - Arrow navigation
  - Enter executes

**Success Criteria:** All 34 tests pass, no focus traps, all UI elements keyboard-accessible

### Phase 3: UI Stability (Week 2-3)
**27 tests across 4 categories**

- [ ] **Stability-tabs.spec.ts** (10 tests)
  - Click each tab → renders without crash
  - Rapid tab switching (10 cycles)
  - Tab switching + scroll
  - State preserved after execution

- [ ] **Stability-panels.spec.ts** (5 tests)
  - Collapse/expand smooth
  - Scroll position preserved
  - Other panels don't shift
  - Rapid collapse/expand

- [ ] **Stability-resize.spec.ts** (6 tests)
  - Window resize responsive
  - Sidebar collapses on mobile
  - Monaco editor resizes
  - No horizontal scrollbar
  - Charts responsive

- [ ] **Stability-data.spec.ts** (6 tests)
  - Large DataFrame (10K rows)
  - Virtualization working
  - Scroll performance (60fps)
  - Chart rendering
  - Syntax highlighting

**Success Criteria:** All 27 tests pass, no crashes, no layout shifts (CLS < 0.1)

### Phase 4: Code Execution in Browser (Week 3-4)
**43 tests across 9 categories**

- [ ] **Execution-basic.spec.ts** (6 tests)
  - Create Python cell
  - Click execute
  - Output appears
  - Status icon shows ✓
  - Execution time displayed

- [ ] **Execution-state.spec.ts** (3 tests)
  - Variables persist across cells
  - Modification updates state
  - Clear all resets state

- [ ] **Execution-imports.spec.ts** (4 tests)
  - Import pandas
  - Import numpy
  - Import matplotlib
  - Import sklearn (if installed)

- [ ] **Execution-dataframe.spec.ts** (6 tests)
  - Create DataFrame
  - `.head()` renders table
  - Data Explorer lists it
  - Click DataFrame → preview
  - Scroll DataFrame
  - Export DataFrame

- [ ] **Execution-charts.spec.ts** (6 tests)
  - Vega-Lite spec renders
  - Chart interactive (hover)
  - Resize responsive
  - Multiple charts on page
  - Chart updates on re-execute

- [ ] **Execution-errors.spec.ts** (6 tests)
  - SyntaxError displayed
  - NameError with line number
  - ZeroDivisionError visible
  - Status icon shows ✗
  - Error doesn't crash
  - Other cells still executable

- [ ] **Execution-long-running.spec.ts** (3 tests)
  - UI responsive during wait
  - Can click tabs while executing
  - Stop button works

- [ ] **Execution-output-types.spec.ts** (6 tests)
  - Print output
  - Return value
  - Markdown output
  - Image output
  - HTML output (XSS safe)
  - Multiple print statements

- [ ] **Execution-order.spec.ts** (3 tests)
  - Execute out of order
  - Variables available correctly
  - Lineage shows dependency graph

**Success Criteria:** All 43 tests pass, 50+ code execution scenarios verified

---

## v1.5.0 — Accessibility & Performance (4-6 weeks after v1.4)

### Accessibility (WCAG 2.1 AA)
- [ ] Screen reader support (11 tests)
- [ ] Color contrast verification (3 tests)
- [ ] Focus indicators (3 tests)

### Cell Management
- [ ] Cell lifecycle (7 tests: create, delete, undo, duplicate, clear)
- [ ] Cell types (5 tests: Python, SQL, Markdown, Raw, switch type)
- [ ] Drag & drop (5 tests: reorder, insert, preserve state)

### File Operations
- [ ] File management (7 tests: create, save, open, delete, rename)
- [ ] File persistence (2 tests: refresh page, export)

### Performance
- [ ] Rendering (5 tests: tab switch < 300ms, cell creation < 100ms)
- [ ] Memory (3 tests: no leaks after 100 cells/executions)

**Total:** 51 new tests

---

## v2.0.0 — Production Hardening (8-10 weeks after v1.5)

### Testing Maturity
- [ ] E2E test coverage > 80% of UI code paths
- [ ] Automated regression testing (CI)
- [ ] Performance benchmarking (target: tab < 300ms)
- [ ] Load testing (1000 cells)

### Stability
- [ ] Zero flaky tests (no retries)
- [ ] Graceful error handling
- [ ] Memory leak detection & fixes
- [ ] Browser compatibility (Chrome, Firefox, Safari)

### Documentation
- [ ] Test architecture guide
- [ ] Contributing to tests guide
- [ ] UI stability runbook

---

## Test Summary

| Phase | Category | Tests | Timeline |
|-------|----------|-------|----------|
| v1.4 Phase 1 | Setup | - | Week 1 |
| v1.4 Phase 2 | Keyboard | 34 | Week 2 |
| v1.4 Phase 3 | UI Stability | 27 | Weeks 2-3 |
| v1.4 Phase 4 | Execution | 43 | Weeks 3-4 |
| v1.5 | Cells, Files, A11y, Perf | 51 | 4-6 weeks |
| v2.0 | Maturity & Hardening | - | 8-10 weeks |
| **TOTAL** | **155+ tests** | **26+ weeks** |

---

## Related Documents

- [TESTING_PLAN_UI_KEYBOARD.md](./TESTING_PLAN_UI_KEYBOARD.md) — Detailed test plan (149 tests, 26 days)
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — Frontend architecture
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Development setup

---

## Success Metrics (v2.0 Release)

- ✅ 155+ tests passing (0 flaky)
- ✅ Tab switch < 300ms
- ✅ No keyboard traps
- ✅ WCAG 2.1 AA compliant
- ✅ Code execution verified (50+ scenarios)
- ✅ 80%+ UI code coverage
- ✅ Zero known crashes on tab switch

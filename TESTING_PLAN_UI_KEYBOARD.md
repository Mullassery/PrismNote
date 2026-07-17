# PrismNote UI Testing Plan (Keyboard + Browser E2E)

**Goal:** Comprehensive UI stability testing via browser automation + keyboard navigation + actual code execution.

---

## Current State Assessment

**Existing Tests:**
- ✅ Security/AI tab tests (286 lines)
- ✅ Playwright configured (chromium)
- ✅ HTML reporting enabled
- ❌ No keyboard navigation tests
- ❌ No actual code execution tests
- ❌ No cell interaction tests
- ❌ No tab/panel switching stability tests

**Problem Areas:**
- UI breaks on tab switching
- Keyboard navigation not tested
- Code execution not verified in browser
- Panel collapse/expand not tested
- Cell creation/deletion not tested

---

## Test Categories

### 1. KEYBOARD NAVIGATION (Tier 1 — Critical)
**Goal:** Verify all UI elements are keyboard-accessible and don't break.

#### 1.1 Main Panel Navigation
```
Tab order flow:
Notebook | Code | Results | Terminal | Files | AI | Settings | Deploy
  ↓        ↓      ↓         ↓         ↓      ↓     ↓         ↓
```

**Tests:**
- `test/keyboard-nav-tabs.spec.ts`
  - [ ] Tab key cycles through all 8 tabs left-to-right
  - [ ] Shift+Tab cycles right-to-left
  - [ ] Enter/Space activates current tab
  - [ ] No focus trap (can always tab out)
  - [ ] Tab indicator visible on each tab
  - [ ] Tab persistence after code execution

#### 1.2 Notebook Navigation
```
Cell | Cell | Cell ...
 ↓     ↓     ↓
Lines within cell (arrow keys)
 ↓
Content (Monaco editor focus)
```

**Tests:**
- `test/keyboard-nav-cells.spec.ts`
  - [ ] Up/Down arrow moves between cells
  - [ ] Ctrl+Home goes to first cell
  - [ ] Ctrl+End goes to last cell
  - [ ] Enter creates new cell below
  - [ ] Shift+Enter executes current cell
  - [ ] Ctrl+Enter executes all cells
  - [ ] Backspace in empty cell deletes cell
  - [ ] Cmd/Ctrl+Up/Down moves cell position
  - [ ] Tab within cell is captured (not navigation)
  - [ ] Escape exits cell edit mode

#### 1.3 Sidebar Navigation
```
Data Explorer | Files | Lineage | ...
     ↓           ↓        ↓
```

**Tests:**
- `test/keyboard-nav-sidebars.spec.ts`
  - [ ] Sidebar tabs keyboard accessible
  - [ ] Expand/collapse via Enter/Space
  - [ ] Arrow keys navigate tree items
  - [ ] Shift+Arrow selects multiple items
  - [ ] No keyboard traps in expanders

#### 1.4 Dialog/Modal Navigation
**Tests:**
- `test/keyboard-nav-modals.spec.ts`
  - [ ] Settings dialog opens with Tab
  - [ ] Escape closes dialog
  - [ ] Tab cycles through dialog controls
  - [ ] Tab wraps (doesn't escape dialog)
  - [ ] Focus returns to opener on close
  - [ ] No rogue focus jumps

#### 1.5 Search & Command Palette
**Tests:**
- `test/keyboard-nav-search.spec.ts`
  - [ ] Cmd/Ctrl+K opens command palette
  - [ ] Type filters commands
  - [ ] Arrow keys navigate results
  - [ ] Enter executes selected command
  - [ ] Escape closes without executing
  - [ ] Focus returns to editor

---

### 2. UI ELEMENT STABILITY (Tier 1 — Critical)
**Goal:** Verify UI doesn't break when switching between tabs/panels.

#### 2.1 Tab Switching Stability
**Tests:**
- `test/ui-stability-tabs.spec.ts`
  - [ ] Click Notebook tab → renders
  - [ ] Click Code tab → no crash, content loads
  - [ ] Click Results tab → chart/table renders
  - [ ] Click Terminal tab → no flicker
  - [ ] Click Files tab → file tree loads
  - [ ] Click AI tab → model selector visible
  - [ ] Click Settings tab → inputs preserved
  - [ ] Rapid tab switching (10 cycles) → no crash
  - [ ] Tab switching + scroll → no layout shift
  - [ ] Tab switching after code execution → state preserved

#### 2.2 Panel Collapse/Expand
**Tests:**
- `test/ui-stability-panels.spec.ts`
  - [ ] Click collapse button → panel collapses smoothly
  - [ ] Content still in DOM (not removed)
  - [ ] Expand again → content restored
  - [ ] Rapid collapse/expand → no memory leak
  - [ ] Scroll position preserved after expand
  - [ ] Other panels don't shift unexpectedly

#### 2.3 Window Resize Stability
**Tests:**
- `test/ui-stability-resize.spec.ts`
  - [ ] Resize window horizontally → layout responsive
  - [ ] Resize vertically → scrollbars appear/disappear correctly
  - [ ] Sidebar collapses on mobile width
  - [ ] Monaco editor resizes without losing content
  - [ ] Charts/tables responsive
  - [ ] No horizontal scrollbar at any width
  - [ ] Content readable at small widths

#### 2.4 Data Display Stability
**Tests:**
- `test/ui-stability-data.spec.ts`
  - [ ] Large DataFrame (10K rows) renders without crash
  - [ ] Virtualization working (not rendering all rows)
  - [ ] Scroll performance acceptable (60fps)
  - [ ] Charts load without flash/flicker
  - [ ] Images in results display correctly
  - [ ] Code syntax highlighting renders

---

### 3. CODE EXECUTION IN BROWSER (Tier 1 — Critical)
**Goal:** Execute actual code via UI and verify results appear.

#### 3.1 Basic Cell Execution
**Tests:**
- `test/execution-basic.spec.ts`
  - [ ] Create Python cell with `print("Hello")`
  - [ ] Click execute button
  - [ ] Output appears in Results tab
  - [ ] Execution time displayed
  - [ ] Status icon shows ✓ (success)
  - [ ] No error messages

#### 3.2 Variable State Across Cells
**Tests:**
- `test/execution-state.spec.ts`
  - [ ] Cell 1: `x = 5`
  - [ ] Cell 2: `print(x)` → outputs `5`
  - [ ] Cell 1 modified to `x = 10`
  - [ ] Cell 2 re-execute → outputs `10`
  - [ ] Clear all cells
  - [ ] Cell 2 execute → NameError (x undefined)

#### 3.3 Import/Library Execution
**Tests:**
- `test/execution-imports.spec.ts`
  - [ ] `import pandas` → no error
  - [ ] `import numpy` → no error
  - [ ] `import matplotlib` → no error
  - [ ] `import sklearn` → no error (if installed)
  - [ ] Library already imported check → not re-imported

#### 3.4 DataFrame Operations
**Tests:**
- `test/execution-dataframe.spec.ts`
  - [ ] Create DataFrame with `pd.DataFrame(...)`
  - [ ] Execute `.head()` → table appears
  - [ ] Click Data Explorer → DataFrame listed
  - [ ] Click DataFrame → preview opens
  - [ ] Scroll DataFrame → no lag
  - [ ] Export DataFrame → download works

#### 3.5 Chart/Visualization
**Tests:**
- `test/execution-charts.spec.ts`
  - [ ] Create Vega-Lite spec in cell
  - [ ] Execute → chart renders
  - [ ] Chart interactive (hover tooltip)
  - [ ] Resize chart window → chart responsive
  - [ ] Multiple charts on same page → all render
  - [ ] Chart updates on re-execution

#### 3.6 Error Handling
**Tests:**
- `test/execution-errors.spec.ts`
  - [ ] SyntaxError cell → error displayed clearly
  - [ ] NameError cell → error with line number
  - [ ] ZeroDivisionError → error visible
  - [ ] Status icon shows ✗ (error)
  - [ ] Error doesn't crash notebook
  - [ ] Other cells still executable

#### 3.7 Long-Running Execution
**Tests:**
- `test/execution-long-running.spec.ts`
  - [ ] Cell with `time.sleep(5)` → UI responsive during wait
  - [ ] Can click other tabs while executing
  - [ ] Stop button appears during execution
  - [ ] Click stop → execution halts
  - [ ] Execution time accurate

#### 3.8 Output Types
**Tests:**
- `test/execution-output-types.spec.ts`
  - [ ] Print output → appears in Results
  - [ ] Return value → displayed
  - [ ] Markdown output → rendered
  - [ ] Image output → displayed
  - [ ] HTML output → rendered safely (XSS protected)
  - [ ] Multiple print statements → all collected

#### 3.9 Execution Order
**Tests:**
- `test/execution-order.spec.ts`
  - [ ] Execute cell 3, then cell 1, then cell 2
  - [ ] Variables from cell 3 available in cell 1
  - [ ] Results show correct execution order
  - [ ] Lineage viewer shows dependency graph

---

### 4. CELL MANAGEMENT (Tier 2 — Important)
**Goal:** Verify cell creation, editing, deletion work correctly.

#### 4.1 Cell Lifecycle
**Tests:**
- `test/cell-lifecycle.spec.ts`
  - [ ] Insert cell above → correct position
  - [ ] Insert cell below → correct position
  - [ ] Delete cell → confirm dialog
  - [ ] Undo delete → cell restored
  - [ ] Duplicate cell → copy created with new ID
  - [ ] Clear cell → content cleared, cell remains

#### 4.2 Cell Types
**Tests:**
- `test/cell-types.spec.ts`
  - [ ] Python code cell → editable in Monaco
  - [ ] SQL cell → syntax highlighting for SQL
  - [ ] Markdown cell → preview + edit modes
  - [ ] Raw cell → no execution
  - [ ] Switch cell type → content preserved or warned

#### 4.3 Cell Drag & Drop
**Tests:**
- `test/cell-drag-drop.spec.ts`
  - [ ] Drag cell to new position → order changes
  - [ ] Drop between cells → inserted correctly
  - [ ] Drag to top → becomes first cell
  - [ ] Drag to bottom → becomes last cell
  - [ ] State preserved after drag

---

### 5. FILE OPERATIONS (Tier 2 — Important)
**Goal:** Test file creation, saving, opening.

#### 5.1 File Management
**Tests:**
- `test/file-operations.spec.ts`
  - [ ] Create new notebook → blank notebook
  - [ ] Save notebook → file saved locally
  - [ ] Close notebook → prompt if unsaved
  - [ ] Open notebook → content restored
  - [ ] File list shows in Files panel
  - [ ] Delete file → removed from filesystem
  - [ ] Rename file → filename updated

#### 5.2 File Persistence
**Tests:**
- `test/file-persistence.spec.ts`
  - [ ] Create cell, save
  - [ ] Refresh page → cell content still there
  - [ ] Modify cell, save
  - [ ] Check file → contains modifications
  - [ ] Export notebook → download works

---

### 6. ACCESSIBILITY (Tier 2 — Important)
**Goal:** Verify WCAG 2.1 AA compliance.

#### 6.1 Screen Reader Support
**Tests:**
- `test/a11y-screen-reader.spec.ts`
  - [ ] Tab has accessible name (aria-label or text)
  - [ ] Button has accessible name
  - [ ] Results table has headers (th elements)
  - [ ] Alert messages announced via aria-live
  - [ ] Errors have aria-live="assertive"

#### 6.2 Color Contrast
**Tests:**
- `test/a11y-contrast.spec.ts`
  - [ ] Text vs background >= 4.5:1 (normal text)
  - [ ] UI components >= 3:1
  - [ ] Buttons distinguishable without color alone

#### 6.3 Focus Indicators
**Tests:**
- `test/a11y-focus.spec.ts`
  - [ ] All interactive elements have visible focus
  - [ ] Focus indicator sufficient contrast (3:1)
  - [ ] Focus order logical (tabindex >= 0)

---

### 7. PERFORMANCE (Tier 2 — Important)
**Goal:** Verify UI doesn't lag or slow down.

#### 7.1 Rendering Performance
**Tests:**
- `test/performance-rendering.spec.ts`
  - [ ] Tab switch < 300ms
  - [ ] Cell creation < 100ms
  - [ ] Execution results appear < 500ms
  - [ ] Scrolling smooth (60fps)
  - [ ] No layout shifts (CLS < 0.1)

#### 7.2 Memory Usage
**Tests:**
- `test/performance-memory.spec.ts`
  - [ ] Create 100 cells → memory reasonable
  - [ ] Execute 100 times → no memory leak
  - [ ] Close tab → memory released

---

## Test File Structure

```
frontend/tests/
├── fixtures/
│   ├── notebooks.ts           # Sample notebooks
│   ├── code-samples.ts        # Code snippets
│   └── helpers.ts             # Utility functions
├── keyboard/
│   ├── navigation-tabs.spec.ts
│   ├── navigation-cells.spec.ts
│   ├── navigation-modals.spec.ts
│   └── search-palette.spec.ts
├── ui/
│   ├── stability-tabs.spec.ts
│   ├── stability-panels.spec.ts
│   ├── stability-resize.spec.ts
│   └── stability-data.spec.ts
├── execution/
│   ├── basic.spec.ts
│   ├── state.spec.ts
│   ├── imports.spec.ts
│   ├── dataframe.spec.ts
│   ├── charts.spec.ts
│   ├── errors.spec.ts
│   ├── long-running.spec.ts
│   ├── output-types.spec.ts
│   └── order.spec.ts
├── cells/
│   ├── lifecycle.spec.ts
│   ├── types.spec.ts
│   └── drag-drop.spec.ts
├── files/
│   ├── operations.spec.ts
│   └── persistence.spec.ts
├── a11y/
│   ├── screen-reader.spec.ts
│   ├── contrast.spec.ts
│   └── focus.spec.ts
├── performance/
│   ├── rendering.spec.ts
│   └── memory.spec.ts
└── ai-security.spec.ts        # Existing tests
```

---

## Test Execution Strategy

### Phase 1: Setup (Week 1)
- ✅ Fixtures (sample notebooks, code snippets)
- ✅ Helper functions (click cell, execute, verify output)
- ✅ Keyboard utilities (press key, verify focus)
- ✅ Execution utilities (run code, capture output)

### Phase 2: Keyboard Navigation (Week 2)
- `test/keyboard/navigation-tabs.spec.ts` (8 tests)
- `test/keyboard/navigation-cells.spec.ts` (10 tests)
- `test/keyboard/navigation-sidebars.spec.ts` (5 tests)
- `test/keyboard/navigation-modals.spec.ts` (5 tests)
- `test/keyboard/search-palette.spec.ts` (6 tests)

**Total:** 34 tests

### Phase 3: UI Stability (Week 3)
- `test/ui/stability-tabs.spec.ts` (10 tests)
- `test/ui/stability-panels.spec.ts` (5 tests)
- `test/ui/stability-resize.spec.ts` (6 tests)
- `test/ui/stability-data.spec.ts` (6 tests)

**Total:** 27 tests

### Phase 4: Code Execution (Week 4-5)
- `test/execution/basic.spec.ts` (6 tests)
- `test/execution/state.spec.ts` (3 tests)
- `test/execution/imports.spec.ts` (4 tests)
- `test/execution/dataframe.spec.ts` (6 tests)
- `test/execution/charts.spec.ts` (6 tests)
- `test/execution/errors.spec.ts` (6 tests)
- `test/execution/long-running.spec.ts` (3 tests)
- `test/execution/output-types.spec.ts` (6 tests)
- `test/execution/order.spec.ts` (3 tests)

**Total:** 43 tests

### Phase 5: Cell Management & Files (Week 6)
- `test/cells/lifecycle.spec.ts` (7 tests)
- `test/cells/types.spec.ts` (5 tests)
- `test/cells/drag-drop.spec.ts` (5 tests)
- `test/files/operations.spec.ts` (7 tests)
- `test/files/persistence.spec.ts` (2 tests)

**Total:** 26 tests

### Phase 6: Accessibility & Performance (Week 7)
- `test/a11y/screen-reader.spec.ts` (5 tests)
- `test/a11y/contrast.spec.ts` (3 tests)
- `test/a11y/focus.spec.ts` (3 tests)
- `test/performance/rendering.spec.ts` (5 tests)
- `test/performance/memory.spec.ts` (3 tests)

**Total:** 19 tests

---

## Total Test Coverage

| Category | Tests | Effort |
|----------|-------|--------|
| Keyboard Navigation | 34 | 5 days |
| UI Stability | 27 | 4 days |
| Code Execution | 43 | 8 days |
| Cell Management | 17 | 3 days |
| File Operations | 9 | 2 days |
| Accessibility | 11 | 2 days |
| Performance | 8 | 2 days |
| **TOTAL** | **149** | **26 days** |

---

## Success Criteria

- ✅ All 149 tests passing
- ✅ No flaky tests (no retries needed)
- ✅ Coverage > 80% of UI code paths
- ✅ Keyboard navigation fully accessible (WCAG 2.1 AA)
- ✅ Code execution in browser verified (50+ test cases)
- ✅ No UI crashes on tab switching
- ✅ Performance metrics met (tab switch < 300ms)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Tests flaky due to timing | Use explicit waits (waitForSelector, waitForLoadState) |
| Backend unavailable during tests | Mock backend responses (intercept network) |
| Large dataset slow in tests | Use smaller test data, mock virtualization |
| Keyboard tests hard to write | Create helpers (keyboardNav.ts, focusUtils.ts) |
| Execution backend not in test env | Docker compose with minimal Python kernel |

---

## Notes

- **Why browser tests?** Unit tests don't catch layout shifts, keyboard traps, or execution bugs.
- **Why keyboard?** Makes UI accessible + reveals focus traps + tests common workflows.
- **Why execution?** Code execution is core feature; must test end-to-end in browser.
- **Timeline:** 26 days = 1 sprint per phase, staggered release of test suites.

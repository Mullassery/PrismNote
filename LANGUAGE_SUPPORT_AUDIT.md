# First-Class Language Support Audit & Roadmap

## Current State

### What's Implemented (Python-Only)
```
✅ Python execution via Jupyter kernel
✅ Python syntax highlighting (Monaco editor)
✅ Python error traceback parsing
✅ Python variable inspection (listVariables API)
✅ Python kernel interrupt/restart
✅ Python output rendering (text, HTML, images)

❌ SQL execution
❌ R execution
❌ Language selection UI
❌ Language-specific syntax highlighting
❌ Language-specific error parsing
❌ Multi-language kernel management
```

### Current Architecture Limitations

**Cell Storage:**
```typescript
interface Cell {
  id: string
  cell_type: 'code' | 'markdown' | 'raw'  // No language metadata
  source: string | string[]
  execution_count: number | null
  outputs: Output[]
}
```

**Execution:**
```
Cell.tsx → executeCell() → /api/cells/{id}/execute
  └─ Python kernel only (hardcoded)
```

**UI:**
```
Monaco Editor → language="python" (hardcoded)
```

---

## Definition: "First-Class Support"

Each language should have:

1. **Cell Execution** — Execute code, capture output, handle errors
2. **Syntax Highlighting** — Correct highlighting in editor
3. **Language Detection** — Auto-detect or explicit selection
4. **Error Messages** — Parse & display errors in user's language
5. **Output Rendering** — Tables, plots, HTML, etc.
6. **Runtime State** — Variable inspection, kernel control
7. **Autocompletion** (Bonus) — IntelliSense for the language
8. **Documentation** — Examples, docs, language-specific features

---

## Language-Specific Requirements

### SQL
**Current Gap:** No execution support

**Requirements:**
- [ ] SQL cell type recognition
- [ ] Query execution against connected databases
- [ ] Result set rendering (DataFrameView, pagination)
- [ ] Connection selection UI
- [ ] Query timeout handling
- [ ] Parameterized queries (e.g., `SELECT * FROM table WHERE id = ?`)
- [ ] Multi-statement support
- [ ] Query performance hints

**Execution Flow:**
```
SQL Cell (type='sql') 
  → User selects connection 
  → /api/databases/:id/query 
  → Table results → DataFrameView
```

**Complexity:** Medium (uses existing database query infrastructure)

### Python
**Current Gap:** Hardcoded in UI, limited error handling

**Improvements:**
- [ ] Explicit cell type: `cell_type='code', language='python'`
- [ ] Better error traceback parsing (line numbers, tracebacks)
- [ ] Autocompletion via Pylance/Jedi
- [ ] Python-specific output rendering (matplotlib, plotly, pandas)
- [ ] Virtual environment support
- [ ] Package installation in notebook (`pip install ...`)
- [ ] Debugging support (breakpoints, step through)

**Execution Flow:**
```
Python Cell (type='code', language='python')
  → Jupyter kernel (already implemented)
  → Capture stdout/stderr + outputs
  → Parse errors with full traceback
  → Render output
```

**Complexity:** Low-to-Medium (already working, needs refinement)

### R
**Current Gap:** No kernel, no UI support

**Requirements:**
- [ ] R cell type recognition
- [ ] R kernel (IRkernel or similar)
- [ ] R syntax highlighting
- [ ] R error traceback parsing
- [ ] R output rendering (plots, tables, HTML)
- [ ] Package management (library loading)
- [ ] Variable inspection for R objects
- [ ] Plotting support (ggplot2, base plot)

**Execution Flow:**
```
R Cell (type='code', language='r')
  → R kernel (new infrastructure)
  → Capture output + graphics
  → Parse R errors
  → Render output
```

**Complexity:** High (requires new kernel, new infrastructure)

---

## Implementation Roadmap

### Phase 1: Core Infrastructure (2 weeks)

**Goal:** Support multiple languages in data model & UI

1. **Update cell data model**
   ```typescript
   interface Cell {
     id: string
     cell_type: 'code' | 'markdown' | 'raw'
     language: 'python' | 'sql' | 'r' | 'javascript'  // NEW
     source: string | string[]
     execution_count: number | null
     outputs: Output[]
     // Language-specific metadata
     sqlConnection?: string  // For SQL cells
   }
   ```

2. **Create language registry**
   ```typescript
   // lib/languages.ts
   export const LANGUAGES = {
     python: {
       name: 'Python',
       icon: 'Python icon',
       kernelType: 'python',
       defaultCell: '# Python code\nprint("Hello")',
     },
     sql: {
       name: 'SQL',
       icon: 'Database icon',
       kernelType: 'sql',
       defaultCell: '-- SQL query\nSELECT * FROM table LIMIT 10',
     },
     r: {
       name: 'R',
       icon: 'R icon',
       kernelType: 'r',
       defaultCell: '# R code\nprint("Hello")',
     },
   }
   ```

3. **Update Cell.tsx UI**
   - [ ] Language selector dropdown in cell header
   - [ ] Dynamic Monaco language mode based on `cell.language`
   - [ ] Cell type indicator (Python/SQL/R/Markdown)
   - [ ] Default cell creation with language selection

4. **Update execution API**
   - [ ] Pass `language` to `/api/cells/{id}/execute`
   - [ ] Backend routes to correct kernel/query handler

**Files to Create/Modify:**
- `frontend/src/lib/languages.ts` (new)
- `frontend/src/components/Cell.tsx` (modify)
- `frontend/src/hooks/useNotebookRedux.ts` (modify cell schema)
- `crates/server/src/handlers/cells.rs` (modify execution)

---

### Phase 2: SQL Support (1.5 weeks)

**Goal:** Execute SQL queries against connected databases

1. **SQL Cell Execution**
   - [ ] POST `/api/databases/{id}/query` integration
   - [ ] Connection picker in SQL cells
   - [ ] Query timeout handling (30s default)
   - [ ] Result set pagination

2. **SQL Result Rendering**
   - [ ] Reuse existing DataFrameView component
   - [ ] Show row count + column types
   - [ ] Allow exporting to CSV/JSON

3. **SQL Error Handling**
   - [ ] Parse database-specific errors
   - [ ] Show line numbers + hints
   - [ ] Suggest common fixes (syntax, missing tables)

4. **UI Components**
   - [ ] Connection selector (dropdown)
   - [ ] Query timeout input
   - [ ] Execute button (SQL-specific icon)

**Files to Create/Modify:**
- `frontend/src/components/SqlCell.tsx` (new)
- `frontend/src/components/SqlConnectionPicker.tsx` (new)
- `frontend/src/lib/sqlExecutor.ts` (new)
- `frontend/src/components/Cell.tsx` (add SQL branch)

---

### Phase 3: Python Refinement (1 week)

**Goal:** Better Python error handling, autocompletion, output rendering

1. **Enhanced Error Parsing**
   - [ ] Full traceback display
   - [ ] Clickable stack frames
   - [ ] Suggest fixes for common errors

2. **Output Rendering**
   - [ ] Matplotlib/seaborn plots
   - [ ] Plotly interactive plots
   - [ ] Pandas DataFrames as tables
   - [ ] LaTeX math rendering

3. **Autocompletion** (Optional MVP)
   - [ ] Basic method completion via static analysis
   - [ ] Jedi integration for smarter completion

4. **Python-Specific Features**
   - [ ] `%time` magic command
   - [ ] `%%timeit` timing
   - [ ] `%matplotlib inline` (already works via kernel)

**Files to Create/Modify:**
- `frontend/src/lib/pythonExecutor.ts` (new)
- `frontend/src/lib/errorParser.ts` (enhance)
- `frontend/src/components/PlotOutput.tsx` (new)

---

### Phase 4: R Support (3-4 weeks)

**Goal:** Full R kernel integration

1. **R Kernel Setup**
   - [ ] Install IRkernel in Rust backend
   - [ ] Implement R kernel transport (similar to Python)
   - [ ] Handle R's graphics device (PNG output)

2. **R Execution**
   - [ ] Send R code to kernel
   - [ ] Capture output, plots, errors
   - [ ] Handle R-specific output (plots as PNG/SVG)

3. **R Output Rendering**
   - [ ] Display plots (ggplot2, base R)
   - [ ] DataFrames as tables
   - [ ] HTML output (Shiny, markdown)

4. **R-Specific Features**
   - [ ] Variable inspection (environments, objects)
   - [ ] Package loading hints
   - [ ] Common function snippets

5. **R Error Handling**
   - [ ] Parse R error messages
   - [ ] Suggest package installation for missing functions

**Files to Create/Modify:**
- `crates/server/src/kernels/r_kernel.rs` (new)
- `frontend/src/lib/rExecutor.ts` (new)
- `frontend/src/components/RCell.tsx` (new)
- Rust backend: R kernel transport layer

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Python** | 100% of current features | Execute, errors, outputs |
| **SQL** | Query execution + results | Run/display 100-row query in <1s |
| **R** | Basic execution + plots | Execute code, render plots |
| **Language selector** | All cells have language | Dropdown visible + functional |
| **Test coverage** | 50+ tests | E2E for each language |
| **Documentation** | User guide + examples | 5+ examples per language |
| **Performance** | <3s query time | SQL queries execute fast |

---

## Implementation Order (Recommended)

### Week 1-2: Phase 1 (Core Infrastructure)
- Cell schema update
- Language registry
- Cell.tsx UI changes
- Execution API updates

**Deliverable:** All cells have language selector; Python still works

### Week 3-4: Phase 2 (SQL Support)
- SQL cell type recognition
- Database query execution
- Result rendering
- Error handling

**Deliverable:** Users can write `SELECT` queries and see results

### Week 5: Phase 3 (Python Refinement)
- Better error messages
- Enhanced output rendering
- Optional: autocompletion

**Deliverable:** Python cells show better errors, render plots

### Week 6-9: Phase 4 (R Support)
- R kernel setup
- R execution infrastructure
- Output rendering
- Error handling

**Deliverable:** Users can write R code alongside Python/SQL

---

## Effort Estimate

| Phase | Duration | Complexity | Effort |
|-------|----------|-----------|--------|
| Phase 1 | 2 weeks | Medium | 2 engineers |
| Phase 2 | 1.5 weeks | Medium | 1 engineer |
| Phase 3 | 1 week | Low | 1 engineer |
| Phase 4 | 3-4 weeks | High | 2 engineers |
| **Total** | **7-8 weeks** | Mixed | **6 engineer-weeks** |

---

## Integration with Existing Features

### Data Explorer
- SQL cells auto-populate from selected table
- Preview queries before running

### Schema Explorer  
- Click table → Generate `SELECT *` SQL cell
- Show related tables in schema

### Plots Panel
- SQL query results → generate chart recommendations
- Python plots → auto-add to Plots panel
- R ggplot2 plots → seamless rendering

### AI Assistance
- "Explain this SQL query"
- "Generate Python code for this task"
- "Convert SQL to R equivalent"

---

## Known Challenges

### R Kernel Setup
- **Challenge:** No standard R kernel for web notebooks
- **Solution:** Use IRkernel + custom transport layer
- **Risk:** Compatibility across R versions

### SQL Connection Management
- **Challenge:** Multiple connections, per-cell selection
- **Solution:** Add connection picker UI, cache selection
- **Risk:** User confusion with connection scope

### Multi-Language Kernel State
- **Challenge:** Variables from Python available in R?
- **Solution:** Phase 1: isolated kernels; Phase 2: bridge via shared memory

### Performance
- **Challenge:** 3+ kernels running simultaneously
- **Solution:** Lazy kernel startup, timeout cleanup
- **Risk:** Memory usage on large notebooks

---

## Next Steps

1. **Review & Approve** — Confirm this roadmap matches your vision
2. **Prioritize** — Start with Phase 1 (core infrastructure)?
3. **Assign** — Who will own each phase?
4. **Begin** — Phase 1 implementation starts immediately after approval

---

**Recommendation:** Start with **Phase 1 + Phase 2** (SQL support) as a first MVP. R support can follow after getting user feedback on Python/SQL integration.


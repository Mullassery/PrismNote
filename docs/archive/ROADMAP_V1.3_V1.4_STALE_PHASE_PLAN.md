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

## v1.4.5 — Data Exploration Phase 1: Schema Discovery (Parallel with v1.5, 6-8 weeks)

**Goal:** Intelligent database discovery — help users understand schema structure 20x faster than writing SQL queries.

### Phase 1: Foundation (Weeks 1-2)
**Critical gaps addressed:** Schema browser, metadata visibility, FK inference, data profiling

#### 1.1 Schema Browser Panel [P0, 1-2 weeks]
- [ ] New component: `SchemaExplorer.tsx`
- [ ] Tree view: Schemas → Tables → Columns
- [ ] Click to expand/collapse hierarchy
- [ ] Search/filter tables by name
- [ ] Icon indicators: PK, FK, indexed
- [ ] Display data types and nullability
- [ ] Integration with DataExplorer (click to view data)

**Deliverables:**
- `frontend/src/components/SchemaExplorer.tsx` — Tree browser UI
- `frontend/src/lib/schemaParser.ts` — Parse INFORMATION_SCHEMA
- `frontend/src/hooks/useSchemaCache.ts` — Memoized schema queries
- Sidebar integration (switch between FileExplorer and SchemaExplorer)

**Success Criteria:**
- Navigate 1000-table schema in <2 seconds
- Search finds table in <500ms
- Schema tree is collapsible, searchable, responsive

---

#### 1.2 Table Metadata Panel [P0, 2 weeks]
- [ ] Right-panel showing rich metadata when table selected
- [ ] Display: row count, size on disk, primary key, foreign keys, indexes
- [ ] Show last modified date (if available)
- [ ] Sample data preview (first 10 rows inline)
- [ ] Column-level stats: nullability %, distinctness
- [ ] Links to related tables (via FKs)

**Deliverables:**
- `frontend/src/components/TableMetadataPanel.tsx` — Metadata display
- `frontend/src/hooks/useTableStats.ts` — Query system tables
- Integration with schema browser (click table → show metadata)

**Success Criteria:**
- Metadata loads in <1 second for tables up to 10M rows
- Shows all constraint types (PK, FK, CHECK, NOT NULL)
- Sample data renders correctly with truncation for long values

---

#### 1.3 FK Inference (Smart Relationship Detection) [P1, 1-2 weeks]
- [ ] Algorithm: detect probable foreign keys based on naming conventions
- [ ] Patterns:
  - `{singular_table_name}_id` → FK to `{table}.id`
  - `{table_name_singular}_pk` → likely PK marker
  - UUID patterns: `{name}_uuid`
- [ ] Show inferred relationships in schema browser (dotted lines vs solid)
- [ ] Display cardinality (1:1, 1:N, M:N) when possible
- [ ] User can toggle inferred vs explicit FKs

**Deliverables:**
- `frontend/src/lib/relationshipInference.ts` — FK detection algorithm
- `frontend/src/hooks/useRelationshipInference.ts` — Run & cache inference
- Visual indicators in schema browser (dotted vs solid connector lines)

**Success Criteria:**
- Inference accuracy >90% (minimal false positives)
- Handles 1000+ table schemas without performance degradation
- User can filter to show only explicit FKs if desired

---

#### 1.4 Data Profiling (Quick Stats) [P1, 2-3 weeks]
- [ ] One-click "Profile" button in metadata panel
- [ ] Shows for selected column:
  - Null count & %
  - Distinct count & cardinality ratio
  - Min/Max (numeric columns)
  - Length stats (string columns)
  - Top 10 values (categorical)
- [ ] Async execution with progress indicator
- [ ] Caching (avoid re-profiling same column)
- [ ] Sampling for very large tables (>100M rows)

**Deliverables:**
- `frontend/src/components/DataProfilePanel.tsx` — Profiling UI
- `frontend/src/hooks/useDataProfiler.ts` — Query execution + caching
- Integration with table metadata panel (profile button per column)

**Success Criteria:**
- Profile completes in <3 seconds for 10M row tables
- Accurate null/distinct counts
- Graceful handling of timeout (tables >500M rows sampled)

---

### Phase 1 Deliverables Summary

```
Components Created:
  ✓ SchemaExplorer.tsx
  ✓ TableMetadataPanel.tsx
  ✓ DataProfilePanel.tsx

Hooks Created:
  ✓ useSchemaCache.ts
  ✓ useTableStats.ts
  ✓ useRelationshipInference.ts
  ✓ useDataProfiler.ts

Utilities Created:
  ✓ schemaParser.ts
  ✓ relationshipInference.ts

UI Changes:
  ✓ Sidebar: Add SchemaExplorer toggle
  ✓ RightPanel: Add TableMetadataPanel
  ✓ BottomPanel: Add DataProfilePanel (or inline)

Tests (Playwright):
  ✓ schema-explorer.spec.ts (8 tests)
  ✓ table-metadata.spec.ts (6 tests)
  ✓ data-profiler.spec.ts (5 tests)
```

---

### Phase 1 Success Metrics

- ✅ Users discover new table in <5 min (vs 20+ min with SQL)
- ✅ FK inference accuracy >90%
- ✅ Data profiling on 10M row table <3 seconds
- ✅ Schema browser handles 1000+ tables responsively
- ✅ Adoption: >60% of users interact with schema browser in first week

---

## v1.5.0 — Data Exploration Phase 2 + Accessibility (Weeks 8-12)

### ✅ Data Exploration Phase 2.1: Relationship Map / ER Diagram [COMPLETE]

**Status:** ✅ Production Ready (20 days dev + 3 buffer, actual: 17 days)

Deliverables:
- **RelationshipMap.tsx** (450 lines) — Interactive cytoscape-based ER diagram
- **LayoutControls.tsx** (150 lines) — Toolbar with layout/zoom controls
- **LegendPanel.tsx** (180 lines) — Symbol explanation overlay
- **graphBuilder.ts** (250 lines) — Schema to cytoscape graph conversion
- **graphOptimizer.ts** (210 lines) — Performance optimization utilities
- **relationship-map.spec.ts** (21 E2E tests via Playwright)

Features:
- ✅ Four layout algorithms (force-directed, hierarchical, circular, grid)
- ✅ Node coloring by table type (Fact=orange, Dimension=blue, Bridge=purple)
- ✅ Relationship rendering (Explicit=solid, Inferred=dashed)
- ✅ Cardinality inference (1:1, 1:N, M:N)
- ✅ Pan/zoom (60 FPS, mouse wheel + buttons)
- ✅ Node/edge selection & neighbor highlighting
- ✅ Export as PNG (up to 4000×4000px)
- ✅ Legend & edge detail panels
- ✅ Node position caching (localStorage)
- ✅ Graph filtering for 100+ table schemas

Performance:
- Render <1s for 100 tables (target: 2s)
- Pan/zoom at 58-60 FPS (target: 60 FPS)
- Bundle size: 320KB gzipped (target: <500KB)

Tests: 21 E2E tests, all passing

See: [PHASE_2_1_COMPLETION_SUMMARY.md](./PHASE_2_1_COMPLETION_SUMMARY.md)

---

### Data Exploration Phase 2.2+: Advanced Intelligence Layer [P1, Planned for v1.6+]

#### 2.2 Query Intelligence Panel [P1, 3-4 weeks]
- [ ] Real-time SQL hints as user types in notebook
- [ ] Join suggestions, unused columns, missing joins
- [ ] Cost estimation (Snowflake, BigQuery)
- [ ] SQL anti-patterns: "Avoid SELECT * when using <5 columns"

**Implementation:**
- `frontend/src/components/QueryIntelligencePanel.tsx`
- `frontend/src/lib/queryAnalyzer.ts` — SQL parsing + hint logic
- Integration with Monaco editor (show hints in gutter)

**Success Criteria:**
- Hints appear within 1 second of typing
- <10% false positive rate

---

#### 2.3 Dimensional Modeling Detection [P2, 2-3 weeks]
- [ ] Automated analysis: classify fact vs dimension tables
- [ ] Label tables in schema browser
- [ ] Report: "Detected star schema: sales (fact), customer/product/date (dims)"

**Success Criteria:**
- Classification accuracy >80%
- Shows confidence scores

---

#### 2.4 Schema Audit Insights [P2, 2-3 weeks]
- [ ] Automated checks: missing PKs, high nullability, wide tables, naming inconsistencies
- [ ] Display as sidebar badge with expandable details
- [ ] User can dismiss individual issues

---

#### 2.5 AI-Assisted Schema Explanation [P2, 1-2 weeks]
- [ ] Right-click table → "Explain this table"
- [ ] Right-click schema → "Explain this schema"
- [ ] Generate sample queries
- [ ] Reuse existing AgentPanel infrastructure

**Success Criteria:**
- Explanations <200 words, accurate
- Generated queries syntactically correct

---

### UI Stability & Accessibility (Parallel with Phase 2)

#### Accessibility (WCAG 2.1 AA)
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

**Total:** 51 new tests (UI stability) + data exploration Phase 2 features

### v1.5 Success Metrics
- ✅ Users report 30% faster database onboarding
- ✅ >60% adoption of schema explorer + metadata features
- ✅ WCAG 2.1 AA compliance verified
- ✅ Zero UI flakiness in keyboard navigation

---

## v2.0.0 — Data Exploration Phase 3 + Production Hardening (Weeks 16-24)

### Data Exploration Phase 3: Refinement & Ecosystem [P3]

#### 3.1 Query Lineage & Dependency Tracking [NICE-TO-HAVE]
- [ ] Visualize data flow through notebooks
- [ ] Lineage graph: orders → customer_segment_feature → reporting_query
- [ ] Impact analysis: "If I change this table, what breaks?"
- **Complexity:** High; **Value:** Medium (defer if needed)

---

#### 3.2 Advanced Visual Query Builder [DEFER]
- Drag-to-join interface for query construction
- Lower priority; SQL-first users may ignore

---

#### 3.3 External Integrations
- [ ] dbt docs integration (link to existing dbt documentation)
- [ ] "Open in Data Catalog" buttons (Collibra, Alation, DataHub)
- [ ] GitHub wiki links (store schema documentation)

---

### Production Hardening & v2.0 Release

#### Testing Maturity
- [ ] E2E test coverage > 80% of UI code paths
- [ ] Automated regression testing (CI)
- [ ] Performance benchmarking (schema browser < 2s for 1000 tables)
- [ ] Load testing (profile 100M+ row tables)

#### Stability
- [ ] Zero flaky tests (no retries)
- [ ] Graceful error handling (invalid FK patterns, missing INFORMATION_SCHEMA)
- [ ] Memory optimization (schema cache, query result paging)
- [ ] Browser compatibility (Chrome, Firefox, Safari)

#### Documentation
- [ ] Data exploration user guide
- [ ] Contributing to data features guide
- [ ] Schema browser architecture doc
- [ ] Test architecture guide
- [ ] UI stability runbook

---

## Roadmap Summary

### Testing & Stability Parallel Track

| Phase | Category | Tests | Timeline |
|-------|----------|-------|----------|
| v1.4 Phase 1 | Setup | - | Week 1 |
| v1.4 Phase 2 | Keyboard | 34 | Week 2 |
| v1.4 Phase 3 | UI Stability | 27 | Weeks 2-3 |
| v1.4 Phase 4 | Execution | 43 | Weeks 3-4 |
| v1.5 | Cells, Files, A11y, Perf | 51 | Weeks 8-12 |
| v2.0 | Maturity & Hardening | - | Weeks 16-24 |
| **TOTAL UI TESTS** | **155+ tests** | **26+ weeks** |

---

### Data Exploration & Intelligence Parallel Track

| Phase | Feature Set | Effort | Timeline | Value |
|-------|-------------|--------|----------|-------|
| **v1.4.5 Phase 1** | Schema browser, metadata, FK inference, profiling | 6-8 weeks | Weeks 1-8 | **CRITICAL** |
| **v1.5 Phase 2** | ER diagram, query intelligence, dimensional modeling, audit, AI explanation | 8-10 weeks | Weeks 8-18 | **HIGH** |
| **v2.0 Phase 3** | Query lineage, integrations, ecosystem polish | 4-6 weeks | Weeks 18-24 | **MEDIUM** |
| **v2.0 Production** | Hardening, testing, documentation | 6-8 weeks | Weeks 16-24 | **CRITICAL** |
| **TOTAL DATA FEATURES** | 3 phases | 18-24 weeks | Parallel | **Competitive advantage** |

---

### Recommended Execution Strategy

**Parallel Tracks:** UI Stability (v1.4-v2.0) + Data Exploration (v1.4.5-v2.0)

**Why parallel?**
- Different teams can own each track (UI Engineering vs Data Intelligence)
- Feedback loop: stability fixes completed by week 4, data features start week 1
- Both ship in v2.0 (month 6) with significant impact

**Gate for Phase 2 (ER Diagram, Query Intelligence):**
- Phase 1 (schema browser) adoption >60% after 2 weeks
- FK inference accuracy >90% verified
- User feedback positive on discoverability improvements

---

## Related Documents

- [Data Exploration & Database Intelligence Gap Analysis](DATA_EXPLORATION_GAP_ANALYSIS.md) — Full analysis of competitive gaps
- [TESTING_PLAN_UI_KEYBOARD.md](./TESTING_PLAN_UI_KEYBOARD.md) — Detailed test plan (149 tests, 26 days)
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — Frontend architecture
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Development setup

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

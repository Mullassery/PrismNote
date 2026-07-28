# Phase 2.1: ER Diagram / Relationship Map (v1.5.0)

## Vision

Transform schema understanding from text-based (tree browser) to visual (interactive diagram). Users should see:
- All tables as draggable nodes
- Relationships as edges with cardinality notation (1:1, 1:N, M:N)
- Breadth-first highlighting when clicking a table
- Smooth pan/zoom across complex schemas (50+ tables)
- Click edge → see join predicate (customer_id → customers.id)

**Success:** Users understand complex star schemas in <2 minutes instead of 20+ minutes.

---

## Technology Decisions

### Graph Library Selection

| Library | Pros | Cons | Best For |
|---------|------|------|----------|
| **cytoscape.js** | Mature (10yr), powerful layouts, many plugins, great docs | Heavier bundle (~300KB), steeper learning curve | Complex graphs, production systems |
| **react-force-graph** | Lightweight (~50KB), D3-based, built for React | Limited layout algorithms, fewer plugins | Simple force-directed layouts |
| **vis-network** | Good balance, many layout options, active community | Moderate bundle size (~200KB), older API | Educational, moderate complexity |
| **sigma.js** | WebGL-accelerated, handles 10K+ nodes | Newer library, less documentation | Ultra-large graphs |

**Decision: cytoscape.js**
- Reason: Production-grade stability, extensive layout algorithms (force-directed, hierarchical, circular), best for financial/enterprise use cases where schema clarity = revenue
- Bundle impact: Acceptable at 300KB gzipped (users download once, cached)
- Learning curve: Manageable; wrapping in React component handles complexity

### React Integration

Use **cytoscape.js** with **react-cytoscapejs** wrapper for tight React integration:
```ts
npm install cytoscape react-cytoscapejs cytoscape-cose-bilkent
```

- `cytoscape`: Core graph library
- `react-cytoscapejs`: React component wrapper
- `cytoscape-cose-bilkent`: Layout plugin (better than default COSe for ERDs)

---

## Architecture

### State Management

**Zustand store extension** (`useSchemaCache.ts` → new `RelationshipMapState`):

```ts
interface RelationshipMapState {
  // Derived from Phase 1 schema data
  nodes: CytoscapeNode[]        // { id, label, type: 'table|view', ...}
  edges: CytoscapeEdge[]        // { source, target, type: 'explicit|inferred', cardinality }
  
  // UI state
  selectedNode: string | null   // Node ID
  highlightedNodes: Set<string> // BFS neighbors
  layoutMode: 'force-directed' | 'hierarchical' | 'circular' | 'grid'
  zoomLevel: number
  
  // Actions
  selectNode(nodeId: string): void
  clearSelection(): void
  applyLayout(mode: LayoutMode): void
  exportImage(): void
}
```

**Derivation flow:**
```
useSchemaCache.schemas (Phase 1 data)
    ↓
buildRelationshipGraph() (pure function)
    ↓
{ nodes, edges } (cytoscape-compatible format)
    ↓
RelationshipMapState store
    ↓
<RelationshipMap /> component
```

### Component Hierarchy

```
<RelationshipMap />
  ├─ <LayoutControls />       (Layout algorithm selector + zoom)
  ├─ <CytoscapeWrapper />     (Graph canvas + interaction handlers)
  ├─ <EdgeDetailPanel />      (Shows cardinality, join predicate when edge clicked)
  └─ <LegendPanel />          (Explain symbols: solid vs dotted, 1:N notation)
```

### Integration with Phase 1

**No breaking changes** — builds on top of existing:
- `useSchemaCache.schemas[connId]` — table/column data
- `useSchemaCache.tableDetails[key]` — constraints (PK/FK)
- `relationshipInference.inferRelationships()` — FK detection

**New data flow:**
```
TableMetadataPanel (Phase 1)
    ↓ (user clicks table)
    ↓ setSelectedTable()
    ↓
RelationshipMap (Phase 2.1)
    ↓ (shows table + related tables)
    ↓ (highlights neighbors)
```

---

## Implementation Roadmap (4-6 weeks)

### Week 1: Foundations (5 days)

#### 1.1 Cytoscape Integration & Styling (2 days)

Create `frontend/src/components/RelationshipMap.tsx`:
```tsx
interface RelationshipMapProps {
  connId: string
  schemaName?: string
  selectedTableId?: string  // Optional: highlight a specific table
  onTableClick?: (tableName: string) => void  // Back to metadata panel
}

export default function RelationshipMap(props: RelationshipMapProps) {
  const schemaCache = useSchemaCache()
  const [cy, setCy] = useState<cytoscape.Core | null>(null)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('force-directed')
  
  // Build graph from schema cache
  const { nodes, edges } = useMemo(() => buildRelationshipGraph(...), [schemaCache])
  
  // Cytoscape stylesheet (node colors, edge styles, selection highlight)
  const stylesheet = [
    { selector: 'node', style: { ... } },
    { selector: 'node[type="dimension"]', style: { backgroundColor: '#60a5fa' } },
    { selector: 'node[type="fact"]', style: { backgroundColor: '#f97316' } },
    { selector: 'edge', style: { ... } },
    { selector: 'edge[cardinality="1:N"]', style: { lineStyle: 'solid' } },
    { selector: 'edge[cardinality="M:N"]', style: { lineStyle: 'dashed' } },
    { selector: 'node:selected', style: { borderWidth: 3, borderColor: '#3b82f6' } },
    { selector: '.highlighted', style: { backgroundColor: '#fbbf24' } },  // BFS neighbors
  ]
  
  return (
    <div className="flex flex-col h-full w-full gap-2 p-2">
      <LayoutControls mode={layoutMode} onModeChange={handleLayoutChange} />
      <div ref={containerRef} className="flex-1 border pn-bd rounded-lg" />
    </div>
  )
}
```

**Deliverables:**
- `frontend/src/components/RelationshipMap.tsx` — 250 lines
- `frontend/src/lib/graphBuilder.ts` — `buildRelationshipGraph()` function (pure)
- Cytoscape stylesheet (node colors: dimension=blue, fact=orange, etc.)
- Basic pan/zoom working

#### 1.2 Graph Builder (buildRelationshipGraph) (2 days)

Create `frontend/src/lib/graphBuilder.ts`:

```ts
export interface CytoscapeNode {
  data: {
    id: string                    // "{connId}.{schema}.{table}"
    label: string                 // "orders"
    type: 'table' | 'view'
    rowCount?: number
    classification?: 'fact' | 'dimension' | 'bridge'
  }
  position?: { x: number; y: number }  // Will be set by layout
}

export interface CytoscapeEdge {
  data: {
    id: string                    // "{fromTable}→{toTable}"
    source: string                // Node ID
    target: string                // Node ID
    cardinality: '1:1' | '1:N' | 'M:N'
    type: 'explicit' | 'inferred'
    joinPredicate: string         // "customer_id = customers.id"
    confidence?: 'high' | 'medium'  // For inferred FKs
  }
}

export function buildRelationshipGraph(
  schema: ConnectionSchema,      // From useSchemaCache.schemas[connId]
  tableDetails: Record<string, TableDetail>,  // From useSchemaCache.tableDetails
  inferredFks: InferredRelationship[]
): { nodes: CytoscapeNode[]; edges: CytoscapeEdge[] } {
  // 1. Build nodes from tables
  // 2. Build edges from explicit FKs + inferred FKs
  // 3. Add cardinality inference (1:1 vs 1:N based on uniqueness)
  // 4. Filter out small tables (system/temp tables)
  // 5. Return nodes + edges
}
```

**Algorithm:**
1. **Nodes:** One per table (skip views for first iteration)
2. **Edges:** 
   - For each constraint of type FOREIGN_KEY → explicit edge
   - For each inferred FK → inferred edge (dotted line)
   - Cardinality: 1:1 if PK→PK, 1:N if PK→non-unique, M:N if join table
3. **Filter:** Remove system tables (information_schema, pg_catalog), temp tables
4. **Return:** Cytoscape-compatible node/edge format

#### 1.3 Layout Controls (1 day)

Create `frontend/src/components/LayoutControls.tsx`:

```tsx
interface LayoutControlsProps {
  mode: LayoutMode
  onModeChange: (mode: LayoutMode) => void
  onZoom: (factor: number) => void
  onExport: () => void
}

export default function LayoutControls(props: LayoutControlsProps) {
  // Dropdown: "Force-Directed" | "Hierarchical" | "Circular" | "Grid"
  // Buttons: Fit view, Zoom in, Zoom out, Export as PNG
}
```

**Layouts to support:**
- **Force-directed:** Default; good for most schemas (COSe-Bilkent plugin)
- **Hierarchical:** Facts at top, dimensions below (Dagre plugin)
- **Circular:** Star schema centered (manual positioning)
- **Grid:** Compact 2D grid (Breadth-first)

---

### Week 2: Interactions & Details (5 days)

#### 2.1 Node/Edge Selection & Highlighting (2 days)

Add to RelationshipMap:

```ts
const handleNodeClick = (evt: cytoscape.EventObject) => {
  const node = evt.target as cytoscape.NodeSingular
  
  // 1. Select this node
  clearSelection()
  node.select()
  
  // 2. Highlight neighbors (BFS 1 hop)
  const neighbors = node.closedNeighborhood()
  neighbors.addClass('highlighted')
  
  // 3. Show node details panel
  setSelectedNode(node.id())
  onTableClick?.(node.data('label'))
}

const handleEdgeClick = (evt: cytoscape.EventObject) => {
  const edge = evt.target as cytoscape.EdgeSingular
  
  // 1. Show edge details (cardinality, join predicate)
  setSelectedEdge({
    from: edge.source().data('label'),
    to: edge.target().data('label'),
    joinPredicate: edge.data('joinPredicate'),
    cardinality: edge.data('cardinality'),
    type: edge.data('type'),
  })
}
```

#### 2.2 Edge Detail Panel (2 days)

Create `frontend/src/components/EdgeDetailPanel.tsx`:

```tsx
interface EdgeDetail {
  from: string
  to: string
  joinPredicate: string     // "customer_id = customers.id"
  cardinality: string       // "1:N"
  type: 'explicit' | 'inferred'
  confidence?: 'high' | 'medium'
}

export default function EdgeDetailPanel({ edge, onClose }: Props) {
  return (
    <div className="p-4 pn-surface border pn-bd rounded-lg">
      <h3 className="font-semibold mb-2">{edge.from} → {edge.to}</h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="pn-muted">Relationship:</span>
          <span className="font-mono">{edge.joinPredicate}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="pn-muted">Cardinality:</span>
          <span className="font-semibold">{edge.cardinality}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="pn-muted">Type:</span>
          <span className={edge.type === 'explicit' ? 'text-green-400' : 'text-yellow-400'}>
            {edge.type === 'explicit' ? '🔗 Explicit' : '🔹 Inferred'}
          </span>
        </div>
        
        {edge.confidence && (
          <div className="flex justify-between">
            <span className="pn-muted">Confidence:</span>
            <span>{edge.confidence}</span>
          </div>
        )}
      </div>
      
      <button onClick={onClose} className="mt-4 px-3 py-1 rounded bg-blue-600 text-white text-xs">
        Close
      </button>
    </div>
  )
}
```

#### 2.3 Legend Panel (1 day)

Create `frontend/src/components/LegendPanel.tsx`:

Shows meaning of:
- Node colors (blue = dimension, orange = fact, gray = bridge, white = unknown)
- Edge styles (solid = explicit FK, dashed = inferred FK)
- Cardinality notation (1:1, 1:N, M:N)

---

### Week 3: Integration & Polish (4 days)

#### 3.1 Wire into App.tsx (1 day)

Add new right-panel route:
- Existing: `tableMetaOpen && <TableMetadataPanel />`
- New: `relationshipMapOpen && <RelationshipMap />`
- New state: `[relationshipMapOpen, setRelationshipMapOpen]`
- New rail button: "Relationship Map" icon (next to "Schema Browser")

Can open from:
- Rail button (standalone)
- Click "View relationships" in TableMetadataPanel

#### 3.2 Export as Image/SVG (1 day)

Add to LayoutControls:

```ts
const exportAsImage = async () => {
  const png = cy.png({ full: true, maxWidth: 4000, maxHeight: 4000 })
  const link = document.createElement('a')
  link.href = png
  link.download = `schema-${connId}-${Date.now()}.png`
  link.click()
}
```

#### 3.3 Zooming & Panning (1 day)

Built-in cytoscape features:
- Mouse wheel: zoom in/out
- Mouse drag: pan
- Double-click: fit all
- Touch: multi-touch zoom (mobile)

#### 3.4 Performance Optimization (1 day)

- Lazy-load edges for 100+ table schemas (virtual scrolling not needed for cytoscape)
- Memoize graph building with `useMemo`
- Debounce layout changes (avoid re-layout spam)
- Cache node positions (localStorage)

---

### Week 4: Testing & Documentation (3 days)

#### 4.1 Playwright Tests (2 days)

Create `frontend/tests/e2e/relationship-map.spec.ts`:

```ts
test('renders all tables as nodes', async ({ browser }) => {
  // 1. Navigate to relationship map
  // 2. Assert: node count = table count
  // 3. Assert: all nodes labeled correctly
})

test('shows explicit FKs as solid edges', async ({ browser }) => {
  // 1. Find explicit FK edge
  // 2. Assert: edge style = solid
  // 3. Assert: type badge shows "🔗"
})

test('shows inferred FKs as dashed edges', async ({ browser }) => {
  // 1. Find inferred FK edge (e.g., order_user_id)
  // 2. Assert: edge style = dashed
  // 3. Assert: type badge shows "🔹"
})

test('highlights neighbors on node click', async ({ browser }) => {
  // 1. Click table node
  // 2. Assert: neighbors have "highlighted" class
  // 3. Assert: edge preview panel opens
})

test('pan and zoom work', async ({ browser }) => {
  // 1. Perform pan (drag)
  // 2. Zoom in/out (mouse wheel)
  // 3. Assert: graph still visible, not broken
})

test('layout change switches algorithm', async ({ browser }) => {
  // 1. Select "Hierarchical" from dropdown
  // 2. Assert: node positions change
  // 3. Verify tree structure (no overlaps)
})

test('export creates image', async ({ browser }) => {
  // 1. Click "Export" button
  // 2. Assert: download triggered
  // 3. Verify PNG is valid
})

test('handles large schemas (100+ tables)', async ({ browser }) => {
  // 1. Load schema with 100 tables
  // 2. Measure render time (<2 seconds)
  // 3. Assert: pan/zoom still responsive
})
```

**Target:** 8-10 Playwright tests, all green

#### 4.2 Documentation (1 day)

- Update ROADMAP.md with completion status
- Add to PrismNote docs: "ER Diagram User Guide"
  - How to open relationship map
  - Layout modes explained
  - How to read cardinality notation
  - Exporting schemas for documentation
- Architecture doc: cytoscape integration

---

## Success Criteria

| Metric | Target | How to verify |
|--------|--------|---------------|
| **Render time** | <2s for 100 tables | Profile in DevTools |
| **Pan/zoom responsiveness** | 60 FPS | Smooth interaction, no jank |
| **FK inference accuracy** | >90% | Cross-check with DBeaver ERDs |
| **Cardinality detection** | >80% | Manual spot-checks on known schemas |
| **User adoption** | >70% after v1.5 launch | Analytics/usage tracking |
| **Test coverage** | 8-10 tests passing | Playwright suite |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Cytoscape bundle too large | Tree-shake unused features; consider dynamic import if >500KB |
| Complex schema (1000+ tables) slow | Pre-filter to 200 tables; add virtual viewport plugin if needed |
| Cardinality inference fails | Show "?" cardinality; let user manually correct via UI |
| Touch/mobile panning awkward | Detect touch events; use pinch-to-zoom built into cytoscape |

---

## Files to Create

```
frontend/src/components/
  ├─ RelationshipMap.tsx         (250 lines)
  ├─ LayoutControls.tsx          (150 lines)
  ├─ EdgeDetailPanel.tsx         (120 lines)
  └─ LegendPanel.tsx             (100 lines)

frontend/src/lib/
  └─ graphBuilder.ts             (250 lines)

frontend/tests/e2e/
  └─ relationship-map.spec.ts    (300 lines, 8-10 tests)

frontend/docs/
  └─ ER_DIAGRAM_USER_GUIDE.md    (user documentation)
```

---

## Timeline & Effort Estimate

| Week | Task | Days | Cumulative |
|------|------|------|-----------|
| 1 | Cytoscape setup, graph builder, layouts | 5 | 5 |
| 2 | Node/edge interaction, detail panels | 5 | 10 |
| 3 | Integration, export, optimization | 4 | 14 |
| 4 | Tests, documentation, polish | 3 | 17 |
| | **Subtotal** | **17 days** | |
| Buffer | Unforeseen issues | **3 days** | **20 days** |
| | **Total (4-5 weeks)** | **20 days** | |

---

## Next Steps

1. **Dependency approval:** Review cytoscape.js + react-cytoscapejs additions
2. **Design review:** Confirm node/edge styling, color scheme
3. **Begin Week 1:** Start with RelationshipMap.tsx + graphBuilder.ts

# Databricks-Inspired Features Implementation Status

**Date**: July 13, 2026  
**Status**: 3 of 7 features completed

---

## ✅ COMPLETED FEATURES

### 1. Help > Keyboard Shortcuts Modal
**File**: `frontend/src/components/KeyboardShortcutsModal.tsx`  
**Integration**: MenuBar.tsx → Help menu  
**Features**:
- Organized shortcuts by category (File, Edit, Run, View, Preferences)
- Searchable/filterable shortcuts
- Platform-aware display (⌘ for Mac, Ctrl for Windows)
- Modern modal UI with keyboard focus

**How to use**: Menu > Help > Keyboard Shortcuts (or Cmd+Shift+P → "Keyboard Shortcuts")

---

### 2. Cell Collapse/Expand
**File**: `frontend/src/components/Cell.tsx`  
**Features**:
- Collapse button (chevron) in cell header
- Preview of first line when collapsed
- Smooth toggle with animation
- State per-cell (not persisted - UI only)

**How to use**: Click the chevron icon (⌄) in the cell header to toggle

---

### 3. Live Table of Contents
**File**: `frontend/src/components/TableOfContents.tsx`  
**Integration**: BottomPanel → Contents tab  
**Features**:
- Auto-parses markdown headers (# through ######)
- Shows hierarchical structure with proper indentation
- Click to scroll to cell
- Visible in BottomPanel → Contents tab

**How to use**: 
1. Add markdown cells with headers: `# Section`, `## Subsection`, etc.
2. Open BottomPanel (Terminal icon in left rail)
3. Click "Contents" tab
4. Click any header to jump to that cell

---

## 📋 REMAINING FEATURES (Implementation Guide)

### 4. Execution Minimap (NOT YET IMPLEMENTED)
**Complexity**: Medium (4-5 hours)  
**Priority**: High

**What it does**: 
- Right-side colored dots showing execution status of each cell
- Colors: ⚪ static, 🟡 queued, 🔵 running, 🟢 success, 🔴 error
- Hover shows execution time
- Click to jump to cell

**Implementation steps**:
1. Create `ExecutionMinimap.tsx` component
2. Track cell execution state in `useNotebook.ts`:
   ```typescript
   cell.metadata.execution_state = 'running' | 'success' | 'error'
   cell.metadata.execution_time_ms = number
   ```
3. Add minimap to right side of Notebook.tsx
4. Update Cell.tsx to track timing:
   ```typescript
   const startTime = Date.now()
   // ... execute ...
   const elapsed = Date.now() - startTime
   updateCell(idx, { metadata: { execution_time_ms: elapsed } })
   ```

**Files to modify**:
- Create: `frontend/src/components/ExecutionMinimap.tsx`
- Modify: `frontend/src/components/Notebook.tsx` (add minimap column)
- Modify: `frontend/src/components/Cell.tsx` (track timing)
- Modify: `frontend/src/hooks/useNotebook.ts` (execution state tracking)

---

### 5. Drag-to-Reorder Cells (NOT YET IMPLEMENTED)
**Complexity**: Medium (5-6 hours)  
**Priority**: Medium

**What it does**:
- Drag cell by grip handle to reorder
- Visual drop indicator shows where cell will land
- Works with collapsed cells
- Preserves cell state/outputs

**Implementation steps**:

**Option A: HTML5 Drag & Drop (native, simple)**
```typescript
// In Notebook.tsx
const [draggedIdx, setDraggedIdx] = useState<number | null>(null)

const handleDrop = (e: DragEvent, targetIdx: number) => {
  e.preventDefault()
  if (draggedIdx === null) return
  moveCell(draggedIdx, targetIdx)
  setDraggedIdx(null)
}

// In Cell.tsx header
<button
  draggable
  onDragStart={() => setDraggedIdx(idx)}
  className="drag-handle"
  title="Drag to reorder"
>
  <GripHorizontal size={14} />
</button>
```

**Option B: react-beautiful-dnd library (recommended)**
```bash
npm install react-beautiful-dnd
```
Wrap cells with `<Droppable>` and `<Draggable>` components

**Files to modify**:
- Modify: `frontend/src/components/Notebook.tsx` (add drag handlers)
- Modify: `frontend/src/components/Cell.tsx` (add drag handle UI)
- Optional: add `react-beautiful-dnd` dependency

---

### 6. Display Function (NOT YET IMPLEMENTED)
**Complexity**: High (6-8 hours)  
**Priority**: High (critical for data science workflow)

**What it does**:
- User writes: `display(df)` in a code cell
- Automatically renders interactive table with stats inline
- Shows DataFrame shape, dtypes, null counts, summary stats

**Implementation steps**:

**Step 1: Add to Python kernel (backend)**
```python
# Create file: python/prismnote/display.py

def display(obj):
    """Display a DataFrame with interactive stats."""
    import pandas as pd
    import json
    from IPython.display import display as ipython_display
    
    if isinstance(obj, pd.DataFrame):
        output = {
            'columns': obj.columns.tolist(),
            'data': obj.head(200).values.tolist(),
            'shape': obj.shape,
            'dtypes': {col: str(dtype) for col, dtype in obj.dtypes.items()},
            'stats': {
                'null_count': obj.isnull().sum().to_dict(),
            }
        }
        
        ipython_display({
            'application/vnd.prismnote.df+json': output,
            'text/plain': repr(obj)
        }, raw=True)
    else:
        ipython_display(obj)
```

**Step 2: Inject into kernel (backend/main.rs)**
```rust
// In kernel initialization:
let setup_code = r#"
import sys
sys.path.insert(0, '/path/to/prismnote/python')
from prismnote import display
"#;
kernel.execute(setup_code).await;
```

**Step 3: Detect custom MIME type (frontend)**
```typescript
// In Output.tsx
if (output.data?.['application/vnd.prismnote.df+json']) {
  return <DataFrameView data={output.data['application/vnd.prismnote.df+json']} />
}
```

The `DataFrameView` component already exists! Just needs MIME type detection.

**Files to modify/create**:
- Create: `python/prismnote/display.py`
- Modify: `crates/server/src/kernel/mod.rs` (add kernel setup code)
- Modify: `frontend/src/components/Output.tsx` (detect MIME type)

---

## 🚀 Implementation Priority

**If you have 1 week:**
1. ✅ Features 1-3 (already done!)
2. Add Feature 4: Execution Minimap (day 2-3)
3. Add Feature 6: Display function (day 4-5)
4. Add Feature 5: Drag-to-reorder (day 6-7)

**If you have 2 weeks:**
1. ✅ Features 1-3 (already done!)
2. Add Features 4, 5, 6 systematically
3. Add testing and polish
4. Commit to main

**Quick wins (if adding one more feature):**
- Feature 4 (Execution Minimap) gives immediate visual feedback about notebook state
- Feature 6 (Display function) unlocks Databricks-like data exploration

---

## Testing Checklist

### Feature 1: Keyboard Shortcuts
- [ ] Help > Keyboard Shortcuts opens modal
- [ ] Search filters shortcuts correctly
- [ ] Shortcuts display correct key combinations
- [ ] Modal closes with Escape key

### Feature 2: Cell Collapse
- [ ] Collapse button appears in all cells
- [ ] First line preview shows when collapsed
- [ ] Collapse state toggles smoothly
- [ ] Works with both code and markdown cells

### Feature 3: Table of Contents
- [ ] Contents tab visible in BottomPanel
- [ ] Headers extracted from markdown cells
- [ ] Proper indentation for ## and ### headers
- [ ] Click to scroll works
- [ ] Updates when notebook changes

### Feature 4: Execution Minimap (when implemented)
- [ ] Minimap appears on right side of notebook
- [ ] Status dots change color: static→running→success
- [ ] Error cells show red
- [ ] Execution time displays on hover
- [ ] Click dots to jump to cell

### Feature 5: Drag-to-Reorder (when implemented)
- [ ] Drag handle visible on cells
- [ ] Drop indicator shows during drag
- [ ] Cell reorders on drop
- [ ] Cell outputs move with cell
- [ ] Works with large notebooks

### Feature 6: Display Function (when implemented)
- [ ] `display(df)` renders table
- [ ] Shape info displays (e.g., "100 × 5")
- [ ] Column types show
- [ ] Stats display (null counts, summary)
- [ ] Works with Series and ndarray

---

## Deployment Notes

**For v1.1.0 release:**
- Ensure all 3 completed features (Shortcuts, Collapse, TOC) are tested
- Features 4-6 can be added incrementally

**Files changed so far:**
- ✅ `frontend/src/components/KeyboardShortcutsModal.tsx` (NEW)
- ✅ `frontend/src/components/MenuBar.tsx` (MODIFIED)
- ✅ `frontend/src/components/Cell.tsx` (MODIFIED)
- ✅ `frontend/src/components/Notebook.tsx` (MODIFIED)
- ✅ `frontend/src/components/TableOfContents.tsx` (NEW)
- ✅ `frontend/src/components/BottomPanel.tsx` (MODIFIED)

**Staging for next phase:**
- `frontend/src/components/ExecutionMinimap.tsx` (to create)
- `python/prismnote/display.py` (to create)
- `frontend/src/hooks/useNotebook.ts` (to modify for tracking)

---

## Git Commands

```bash
# Commit the 3 completed features
git add frontend/src/components/{KeyboardShortcutsModal,TableOfContents}.tsx
git add frontend/src/components/{MenuBar,Cell,Notebook,BottomPanel}.tsx
git commit -m "feat: Add 3 Databricks-inspired features

- Add searchable Help > Keyboard Shortcuts modal
- Add cell collapse/expand with preview
- Add live table of contents in BottomPanel

These features improve discoverability and notebook organization,
matching Databricks Notebooks UX patterns.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"

# When features 4-6 are ready
git add frontend/src/components/ExecutionMinimap.tsx
git commit -m "feat: Add execution minimap status indicator"

# etc for other features
```

---

## Next Steps

1. **Test the 3 completed features** in dev mode:
   ```bash
   cd frontend && npm run dev
   ```
   - Try Help > Keyboard Shortcuts
   - Try collapsing a cell
   - Add markdown headers and check Contents tab

2. **Choose which feature to add next**:
   - Feature 4 (Minimap) if visual feedback is priority
   - Feature 6 (Display) if data exploration is priority  
   - Feature 5 (Drag) if notebook organization is priority

3. **Implement incrementally** - each feature is self-contained

---

**Authored by**: Claude Code Design Team  
**Status**: 43% Complete (3/7 Databricks Features)  
**Estimated completion**: v1.1.0 (Q3 2026)

# PrismNote UI Component Specifications v2.0

Detailed specifications for all UI components, layouts, and interactions.

---

## Table of Contents

1. [Core Components](#core-components)
2. [Layout Patterns](#layout-patterns)
3. [Workspace Organization](#workspace-organization)
4. [AI Components](#ai-components)
5. [Data Components](#data-components)
6. [Interaction Patterns](#interaction-patterns)

---

## Core Components

### Button Component

**Props:**
```typescript
<Button
  variant: 'primary' | 'secondary' | 'tertiary' | 'danger'
  size: 'sm' | 'md' | 'lg'
  state: 'default' | 'hover' | 'pressed' | 'disabled' | 'loading'
  icon?: React.ReactNode
  label: string
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
/>
```

**Visual Specs:**

| Variant | Background | Text | Border | Hover Bg |
|---------|-----------|------|--------|----------|
| Primary | `BLUE_500` | White | None | `BLUE_600` |
| Secondary | `BG_TERTIARY` | `TEXT_PRIMARY` | `1px BORDER` | `BG_SECONDARY` |
| Tertiary | Transparent | `TEXT_PRIMARY` | None | `BG_TERTIARY` |
| Danger | `RED_500` | White | None | `RED_600` |

**Sizes:**
- SM: 28px height, 12px padding, 13px font
- MD: 32px height, 12px padding, 14px font
- LG: 40px height, 16px padding, 14px font

**Icon + Label:**
- Gap: 8px
- Icon size: height - 8px

---

### Input Field

**Props:**
```typescript
<Input
  type: 'text' | 'email' | 'number' | 'password' | 'search'
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
  icon?: React.ReactNode
  clearable?: boolean
  density: 'compact' | 'standard' | 'spacious'
/>
```

**Visual Specs:**

| State | Border | Bg | Text |
|-------|--------|----|----|
| Default | `1px BORDER` | `BG_TERTIARY` | `TEXT_PRIMARY` |
| Focused | `2px BLUE_500` | `BG_PRIMARY` | `TEXT_PRIMARY` |
| Filled | `1px BORDER` | `BG_TERTIARY` | `TEXT_PRIMARY` |
| Error | `2px RED_500` | `BG_TERTIARY` | `RED_500` text |
| Disabled | `1px BORDER` | `BG_SECONDARY` | `TEXT_TERTIARY` (opacity 0.5) |

**Density:**
- Compact: 32px height
- Standard: 40px height
- Spacious: 48px height

**Features:**
- Floating label (animated)
- Error message below (red text, 12px)
- Prefix icon (left, 4px padding)
- Suffix icon (right, 4px padding)
- Clear button (X icon, appears when filled)

---

### Dropdown / Select

**Props:**
```typescript
<Select
  options: Array<{value, label, icon?, disabled?}>
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchable?: boolean
  clearable?: boolean
  disabled?: boolean
  multiple?: false
/>
```

**Behavior:**
- Click to open popover
- Search highlights matching items
- Arrow keys navigate
- Enter selects
- Escape closes
- Click outside closes

**Visual:**
- Trigger: Same as input field
- Popover: Elevation 3, `BG_SURFACE`, max-height 400px
- Items: 32px height, hover `BG_SECONDARY`
- Divider: 1px `BORDER`, 4px vertical margin

---

### Card

**Props:**
```typescript
<Card
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
  elevation?: 0 | 1 | 2
  clickable?: boolean
  selected?: boolean
/>
```

**Visual:**
- Background: `BG_SURFACE`
- Border: `1px BORDER`
- Radius: 6px
- Padding: 16px
- Elevation: 0 (hover: 1)
- Selected: Blue left border (2px)

---

### Tabs

**Props:**
```typescript
<Tabs
  tabs: Array<{label, id, icon?, count?}>
  activeTab: string
  onChange: (id: string) => void
  closeable?: boolean
  reorderable?: boolean
/>
```

**Visual:**
- Height: 44px
- Tab width: min 120px, max 300px
- Active: Blue bottom border (2px)
- Icon: 16x16px, 6px margin-right
- Badge: Right side, small circle with count

**Interactions:**
- Middle-click to close
- Drag to reorder
- Right-click for context menu (close, close others, close all)
- Keyboard: Cmd+Shift+[ (previous), Cmd+Shift+] (next)

---

### Sidebar / Panel

**Props:**
```typescript
<Sidebar
  width?: number (default 240)
  collapsible?: boolean
  collapsed?: boolean
  onCollapse?: () => void
  sections: Array<{title, items, collapsible?}>
/>
```

**Visual:**
- Width: 240px (expanded), 60px (collapsed)
- Background: `BG_PRIMARY`
- Border: Right `1px BORDER`
- Items: 32px height, hover `BG_SECONDARY`
- Section header: 24px height, `TEXT_TERTIARY`, caps, 12px font

**Interactions:**
- Click icon to collapse/expand (smooth transition)
- Hover to show labels when collapsed
- Cmd+B to toggle visibility
- Cmd+[ to collapse
- Cmd+] to expand

---

## Layout Patterns

### Single Column (Default)

```
┌────────────────────────────────────┐
│ Breadcrumb | Title          Tools  │ 40px
├────────────────────────────────────┤
│                                    │
│                                    │
│         Main Content               │
│         (max-width: 900px)         │
│                                    │
│                                    │
├────────────────────────────────────┤
│ Status bar                         │ 28px
└────────────────────────────────────┘
```

---

### Split View

```
┌───────────────────────┬───────────────────────┐
│ Breadcrumb | Tools    │                       │ 40px
├───────────────────────┼───────────────────────┤
│                       │                       │
│    Pane A (50%)       │    Pane B (50%)       │
│                       │                       │
├───────────────────────┴───────────────────────┤
│ Status bar                                    │ 28px
└───────────────────────────────────────────────┘
```

**Interactions:**
- Cmd+\ to toggle split
- Cmd+1/2/3 to switch panes
- Drag middle divider to resize
- Middle-click pane tab to close

---

### Three-Column (Data View)

```
┌─────────┬──────────────────┬──────────────┐
│  Schema │   Query Editor   │   Results    │
│ Explorer│                  │              │
│         │  SELECT ...      │ ┌──────────┐ │
│         │  FROM ...        │ │ col1 col2│ │
│         │                  │ │ val  val │ │
│         │  ⚡ 234ms        │ └──────────┘ │
│         │                  │              │
└─────────┴──────────────────┴──────────────┘
```

**Proportions:**
- Left (Explorer): 200-280px
- Middle (Editor): 1fr
- Right (Results): 1fr
- All resizable

---

## Workspace Organization

### Left Sidebar Structure

```
┌─ Workspace Header ─────┐
│ 🎯 My Workspace   ⚙️  │
├────────────────────────┤
│ 📝 Notes         (12)  │
│   ├─ Recent            │
│   ├─ Starred           │
│   ├─ By Tag            │
│   └─ Notebooks         │
│ 📊 Knowledge Graph     │
│   ├─ Entities          │
│   ├─ Topics            │
│   └─ Graph View        │
│ 🤖 AI Agents      (3)  │
│   ├─ Research Agent    │
│   ├─ Schema Auditor    │
│   └─ Doc Generator     │
│ 🔍 Research            │
│   ├─ Active Research   │
│   ├─ Sources           │
│   └─ Findings          │
│ 📁 Databases       (5) │
│   ├─ Production        │
│   ├─ Staging           │
│   └─ Analytics         │
│ 🏛️ Schemas            │
│   ├─ By Database       │
│   └─ By Owner          │
│ 📄 Documents       (24)│
│   ├─ Design Docs       │
│   ├─ Runbooks          │
│   └─ Architecture      │
│ 🔗 Integrations        │
│ 🔀 Git Branches        │
├────────────────────────┤
│ 🔎 Cmd+K               │
└────────────────────────┘
```

**Interactions:**
- Click section header to collapse/expand
- Pin/star to quick access
- Right-click for context menu
- Drag to reorder sections
- Show badge count for items with count

---

### Activity Rail

```
   ↑
  1  📁 Explorer (Cmd+1)
  2  🔍 Search (Cmd+Shift+F)
  3  🤖 AI (Cmd+Shift+I)
  4  📊 Databases (Cmd+2)
  5  🕸️ Graph (Cmd+3)
  6  ✓ Tasks (Cmd+Shift+T)
  7  🔔 Notifications (Cmd+Shift+N)
   |
   | ─────────────────
   |
  8  ⚙️ Settings (Cmd+,)
  9  🧩 Extensions (Cmd+Shift+X)
   ↓
```

**Styling:**
- 48px wide
- Icon 24x24px, centered
- Circle hover state (28px, `BG_SECONDARY`)
- Active indicator: Left bar (3px, `BLUE_500`)
- Tooltip appears on hover (right-aligned)

---

## AI Components

### Inline AI Actions

**Trigger:** Cmd+Shift+I on selection

```
┌─────────────────────────────────────┐
│ ✨ AI  [expand ▼]                   │
├─────────────────────────────────────┤
│ ✨ Rewrite in professional tone     │
│ ✨ Explain to a 10-year-old        │
│ ✨ Summarize in 1 paragraph        │
│ ✨ Generate SQL query               │
│ ✨ Create diagram                   │
│ ✨ Add tests                        │
│ ✨ Document with examples          │
│ 🔧 More actions                    │
└─────────────────────────────────────┘
```

**Behavior:**
- Appears near selection
- Keyboard navigation (arrow keys)
- Enter to select action
- Shows loading state
- Displays result inline
- Accept/Reject buttons (Cmd+Enter / Escape)

---

### AI Side Panel

```
┌──────────────────────┐
│ 🤖 AI Assistant      │
├──────────────────────┤
│ [📎 Context]         │
│                      │
│ You: What is this    │
│ query doing?         │
│                      │
│ AI: 💭 Thinking...   │
│                      │
│ Looking for context  │
│ from your database   │
│ schema...            │
│                      │
│ Let me analyze your  │
│ recent queries to    │
│ understand patterns  │
│                      │
│ ─────────────────    │
│ Sources: 3 items     │
│                      │
│ [📝] Recent queries  │
│ [📊] Schema info     │
│ [🔗] Related docs    │
│                      │
│ [Type message...]    │
│ [Send] (Cmd+Enter)   │
└──────────────────────┘
```

**Features:**
- Thinking trace (expandable)
- Sources with citations
- Related suggestions
- Generated artifacts button
- Message history (scrollable)
- Input with Send button

---

### Agent Workflow Display

```
╔═══════════════════════════════════╗
║ 🔍 Research Agent                 ║ Title
║ Status: Running (2/5 steps)       ║ Progress
╠═══════════════════════════════════╣
║ Step 1: Analyzing query           ║✓ Done
║  └─ Found 3 relevant sources     ║
║                                   ║
║ Step 2: Fetching documents        ║⚙️ In Progress
║  └─ 12/15 documents loaded        ║
║                                   ║
║ Step 3: Extracting insights       ║⏳ Queued
║ Step 4: Generating summary        ║⏳ Queued
║ Step 5: Creating artifacts        ║⏳ Queued
╠═══════════════════════════════════╣
║ Artifacts Generated:              ║
║ 📄 Research Summary               ║
║ 🔗 Relationship Map               ║
║ ✓ Add to note                     ║
╚═══════════════════════════════════╝
```

---

## Data Components

### Schema Tree

```
📁 Connection: Production
  📊 Database: Analytics
    📂 Schema: Public
      🏛️ Table: users (1.2M rows)
         🔑 id (INTEGER, NOT NULL) ⭐
         📝 name (VARCHAR)
         ✉️ email (VARCHAR) ⚠️
         ⏰ created_at (TIMESTAMP)
      🏛️ Table: orders (542K rows)
      📄 View: user_summary
      🔧 Function: get_user_stats()
    📂 Schema: Private
  📊 Database: Production
```

**Interactions:**
- Click row to inspect (right sidebar)
- Right-click for context menu
- Expand/collapse with arrow
- Hover to show action buttons (run query, open, etc.)
- Drag table to create relationship
- Filter by type (show only tables, views, etc.)

**Icons:**
- 🔑 Primary key
- 🔗 Foreign key
- ⚠️ Data quality warning
- 📌 Pinned/starred
- ❌ Schema issue

---

### Query Editor

```
┌─────────────────────────────────────────┐
│ [📁 public] [⚡ 234ms] [📥 Export]      │ Toolbar
├─────────────────────────────────────────┤
│ SELECT                                  │
│   u.id,                                 │
│   u.name,                               │
│   COUNT(o.id) as order_count           │
│ FROM users u                            │
│ LEFT JOIN orders o ON u.id = o.user_id │
│ GROUP BY u.id                           │
│ ORDER BY order_count DESC               │
│ LIMIT 100;                              │
│                                    Line 9│ Line indicator
│ ⏱️ Execution time: 234ms                │ Stats
│ 📊 Rows returned: 45                    │
│ 📈 Estimated cost: $0.04 (BigQuery)     │
└─────────────────────────────────────────┘
```

**Features:**
- Syntax highlighting (SQL dialect aware)
- Line numbers
- Code folding
- Multi-cursor editing (Cmd+D)
- Go to definition (Cmd+Click)
- Autocomplete (Ctrl+Space)
- Format code (Cmd+Shift+P → Format)
- Explain query (Cmd+Shift+I)

---

### Results Table

```
┌─────────────────────────────────────────────┐
│ 45 rows | 234ms | [📥 Export] [📋 Copy]     │
├────┬──────────┬──────────┬────────────────┤
│ ID │ Name     │ Orders   │ Latest Order   │
├────┼──────────┼──────────┼────────────────┤
│ 1  │ Alice    │ 12       │ 2026-07-15     │
│ 2  │ Bob      │ 8        │ 2026-07-18     │
│ 3  │ Charlie  │ 15       │ 2026-07-19     │
│ :: │ ::       │ ::       │ ::             │ Scroll indicator
│ 45 │ Zoe      │ 3        │ 2026-07-10     │
└────┴──────────┴──────────┴────────────────┘
  Showing 1-45 of 45 | [«] [»]              Pagination
```

**Features:**
- Row numbers (left)
- Sortable columns (click header)
- Resize columns (drag divider)
- Frozen columns option
- Export formats (CSV, JSON, Excel)
- Copy as TSV
- Expand row (see full values)
- Filter column (click header dropdown)

---

## Interaction Patterns

### Keyboard Shortcuts (Complete List)

```
GENERAL
Cmd+K              Command palette
Cmd+/              Help & shortcuts
Cmd+,              Settings

WORKSPACE
Cmd+1              Explorer
Cmd+2              Databases  
Cmd+3              Graph
Cmd+Shift+F        Search
Cmd+Shift+I        AI Assistant
Cmd+Shift+T        Tasks
Cmd+Shift+N        Notifications

EDITOR
Cmd+N              New note
Cmd+O              Open note
Cmd+S              Save (auto-saves)
Cmd+Shift+S        Save as...
Cmd+W              Close tab
Cmd+Shift+W        Close all tabs
Cmd+Tab            Next tab
Cmd+Shift+Tab      Previous tab

EDITING
Cmd+Z              Undo
Cmd+Shift+Z        Redo
Cmd+C              Copy
Cmd+X              Cut
Cmd+V              Paste
Cmd+A              Select all
Cmd+F              Find
Cmd+H              Find & replace
Cmd+Shift+I        AI actions
Cmd+D              Multi-cursor (next match)
Cmd+I              Format selection

CODE/QUERY
Cmd+Enter          Execute query/cell
Cmd+Shift+Enter    Execute & move next
Shift+Enter        New line
Tab/Shift+Tab      Indent/dedent
Cmd+]              Fold region
Cmd+[              Unfold region

NAVIGATION
Cmd+P              Go to file
Cmd+Shift+P        Go to symbol
Cmd+G              Go to line
Cmd+E              Switch editor
Cmd+B              Toggle sidebar
Cmd+J              Toggle bottom panel

VIEW
Cmd+\              Split editor
Cmd+L              Focus line
Ctrl+Shift+L       Expand line selection
```

---

### Context Menus

**On Note/Document:**
```
🔗 Open Link
✏️ Edit
📋 Copy
🗑️ Delete
───
📌 Pin to sidebar
⭐ Add to favorites
📤 Share
───
🕐 Version history
```

**On Database Table:**
```
▶️ Query this table
🔍 Inspect schema
📊 Profile data
🔑 Manage keys
───
📌 Pin to sidebar
📤 Export DDL
───
📋 Copy table name
```

**On Code Selection:**
```
✨ Rewrite...
✨ Explain...
✨ Generate SQL...
───
📋 Copy
🔗 Create link
```

---

### Search Patterns

**Global Search (Cmd+Shift+F):**

```
┌────────────────────────────────────┐
│ 🔍 Search workspace...             │
│ [All ▼] [Past 7 days ▼]            │
├────────────────────────────────────┤
│ NOTES & DOCUMENTS                  │
│ 📄 API Design (Today)              │
│ 📄 Research Summary (Yesterday)    │
│                                    │
│ DATABASES & SCHEMAS                │
│ 🏛️ users table (Production)       │
│ 📊 analytics schema                │
│                                    │
│ AI & CONVERSATIONS                 │
│ 🤖 Design Research Agent           │
│ 💬 Research conversation (#2)      │
└────────────────────────────────────┘
```

**Quick Search (Cmd+K):**

```
┌────────────────────────────────────┐
│ > Go to note...                    │
│                                    │
│ 🔄 Recent                          │
│ • Database Schemas (2h ago)        │
│ • API Documentation (Yesterday)    │
│                                    │
│ 📄 Notes                           │
│ • Architecture Design              │
│ • Migration Plan                   │
│                                    │
│ ⌘ Commands                         │
│ • New Note                         │
│ • Export As...                     │
│ • Run Query                        │
└────────────────────────────────────┘
```

---

### Modal Dialogs

**Standard Modal:**
```
╔══════════════════════════════════╗
║ Dialog Title              ✕      ║ Header
╠══════════════════════════════════╣
║                                  ║
║  Content area                    ║
║  (scrollable if needed)          ║
║                                  ║
╠══════════════════════════════════╣
║ [Cancel]              [Save]     ║ Actions
╚══════════════════════════════════╝
```

**Features:**
- Click outside to close (or Escape)
- Scrollable content area
- Footer actions (right-aligned)
- Primary action on right (blue)
- Secondary action on left (gray)

---

## Animation Specifications

### Transitions

| Interaction | Duration | Easing | Example |
|-------------|----------|--------|---------|
| Quick feedback | 75ms | ease-out | Button hover |
| Standard | 150ms | ease-out | Collapse/expand |
| Slow | 300ms | ease-in-out | Modal appear |
| Page nav | 200ms | ease-out | Tab change |

### Micro-interactions

**Button Hover:**
- Scale: 1.0 → 1.02
- Elevation: 0 → 1
- Duration: 150ms

**Collapse/Expand:**
- Max-height: animate
- Opacity: 0 → 1
- Duration: 200ms

**Modal Appear:**
- Backdrop: opacity 0 → 0.4
- Content: scale 0.95 → 1 + opacity 0 → 1
- Duration: 300ms

---

## Density Modes

### Compact Mode

```
Spacing: 75% of standard
Font size: -1px
Padding: -2px per component
Usage: Power users, large datasets
```

### Standard Mode (Default)

```
Spacing: 100% of standard
Font size: Design spec
Padding: Design spec
Usage: Most users
```

### Focus Mode

```
Spacing: 120% of standard
Font size: +2px
Padding: +2px per component
Usage: Reading, presentations
```

---

## Accessibility Checklists

### Keyboard Navigation
- [ ] Tab order makes sense
- [ ] All controls reachable via keyboard
- [ ] Tab indicator always visible
- [ ] No keyboard traps
- [ ] Escape closes modals/panels

### Screen Reader
- [ ] ARIA labels on icons
- [ ] Alt text on images
- [ ] Semantic HTML (headings, nav, main)
- [ ] Live regions for dynamic content
- [ ] Form labels associated

### Visual
- [ ] 4.5:1 contrast ratio (AA)
- [ ] Focus indicator 2px minimum
- [ ] Color not sole information method
- [ ] Motion can be disabled
- [ ] Text resizable to 200%

---

**Last Updated:** July 20, 2026  
**Version:** 2.0  
**Status:** Implementation-Ready

# PrismNote Design System v2.0

A professional knowledge operating system inspired by VSCode, DataGrip, Obsidian, Cursor, and Linear.

---

## Design Philosophy

### Core Principles

1. **Developer-First** — Keyboard shortcuts, command palette, efficiency first
2. **Information Mastery** — Reduce clutter, maximize signal, make power accessible
3. **AI-Native** — Intelligence embedded in workflows, not bolted on
4. **Institutional Trust** — Professional appearance, transparent operations, no surprises
5. **Configurable** — Users control density, density, layout, not design dictating workflow
6. **Performance Obsessed** — Every interaction should feel instantaneous
7. **Accessibility First** — Full keyboard support, screen readers, WCAG AA minimum

### Visual Inspiration

- **VSCode** — Workspace organization, command palette, activity rail
- **DataGrip** — Data-centric UI, schema exploration, query workflows
- **Linear** — Minimal design, professional feel, productivity focus
- **Cursor** — AI as copilot (not spotlight), inline assistance
- **Raycast** — Command interface, instant search
- **Arc Browser** — Innovative architecture, minimalist chrome

---

## Design Tokens

### Color Palette

#### Primary (Prism Blue - Professional)
```
50:   #F0F6FF    (hover states)
100:  #E6F0FF    (backgrounds)
200:  #CCE1FF    (subtle)
300:  #99C3FF    (medium)
400:  #6BA5FF    (interactive)
500:  #3B82F6    (primary - VSCode blue)
600:  #1F6FE8    (focus)
700:  #1661D9    (active)
800:  #0D47CB    (pressed)
900:  #0A3BB0    (darkest)
```

#### Semantic Colors
```
SUCCESS:    #10B981  (emerald-500)
WARNING:    #F59E0B  (amber-500)
DANGER:     #EF4444  (red-500)
INFO:       #06B6D4  (cyan-500)
```

#### Neutral (Dark Mode Base)
```
BG_SURFACE:      #0F0F12  (window/panel backgrounds)
BG_PRIMARY:      #1A1A1F  (main background)
BG_SECONDARY:    #25252D  (hover backgrounds)
BG_TERTIARY:     #3F3F47  (input backgrounds)
TEXT_PRIMARY:    #FAFAFA  (main text)
TEXT_SECONDARY:  #D1D1D6  (secondary text)
TEXT_TERTIARY:   #A1A1A6  (muted text)
BORDER:          #2F2F37  (borders, dividers)
```

#### Light Mode (Mirror)
```
BG_SURFACE:      #FFFFFF
BG_PRIMARY:      #F8F8FA
BG_SECONDARY:    #F3F3F7
BG_TERTIARY:     #EBEBF0
TEXT_PRIMARY:    #1A1A1F
TEXT_SECONDARY:  #525259
TEXT_TERTIARY:   #8E8E96
BORDER:          #D8D8E0
```

---

## Typography System

### Font Stack
```css
/* Headings & UI */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;

/* Code & Data */
font-family: 'Fira Code', 'Monaco', 'Courier New', monospace;
```

### Scale

| Role | Size | Weight | Line Height | Letter Spacing | Usage |
|------|------|--------|-------------|----------------|-------|
| **Display** | 32px | 600 | 1.25 | -0.02em | Page titles |
| **H1** | 28px | 600 | 1.3 | -0.01em | Section headers |
| **H2** | 24px | 600 | 1.33 | 0 | Subsection headers |
| **H3** | 20px | 600 | 1.4 | 0 | Card titles |
| **Body LG** | 16px | 400 | 1.5 | 0 | Main content |
| **Body** | 14px | 400 | 1.5 | 0 | Standard text |
| **Small** | 12px | 400 | 1.5 | 0 | Secondary text |
| **Mono** | 13px | 400 | 1.6 | 0 | Code, data |
| **Mono Small** | 11px | 400 | 1.5 | 0 | Inline code |

---

## Spacing System

```
2px   0.125rem  (micro-adjustments)
4px   0.25rem   (xs)
6px   0.375rem  (xxs)
8px   0.5rem    (sm)
12px  0.75rem   (md)
16px  1rem      (lg)
20px  1.25rem   (xl)
24px  1.5rem    (2xl)
32px  2rem      (3xl)
40px  2.5rem    (4xl)
48px  3rem      (5xl)
64px  4rem      (6xl)
```

**Grid:** 8px base grid (standard desktop UI)

---

## Shadows & Elevation

```
Elevation 0 (flat):        no shadow
Elevation 1 (hover):       0 1px 2px rgba(0,0,0,0.05)
Elevation 2 (raised):      0 4px 6px rgba(0,0,0,0.1)
Elevation 3 (popover):     0 10px 15px rgba(0,0,0,0.15)
Elevation 4 (modal):       0 20px 25px rgba(0,0,0,0.2)
Elevation 5 (notification):0 25px 50px rgba(0,0,0,0.25)
```

---

## Border & Radius

```
Border Width:
  1px  (standard)
  2px  (focus states)

Border Radius:
  4px   (sm - buttons, inputs)
  6px   (md - cards, panels)
  8px   (lg - modals)
  12px  (xl - large containers)
```

---

## Component System

### Buttons

**Sizes:**
- **SM** (28px) — Inline actions
- **MD** (32px) — Standard buttons
- **LG** (40px) — Primary CTAs

**Variants:**
- **Primary** — Blue, solid, high emphasis
- **Secondary** — Gray, ghost, medium emphasis
- **Tertiary** — Minimal, text only, low emphasis
- **Danger** — Red, for destructive actions

**States:**
- Default
- Hover (Elevation 1)
- Pressed (Elevation 0, darker)
- Disabled (opacity: 0.4)
- Loading (spinner)

### Inputs & Fields

**Types:**
- Text input
- Number input
- Select dropdown
- Multi-select
- Checkbox
- Radio
- Toggle switch
- Search field

**State:**
- Default
- Focused (blue border, elevation 1)
- Filled
- Error (red border, error message)
- Disabled

**Density:**
- Compact (32px height)
- Standard (40px height)
- Spacious (48px height)

### Cards & Panels

**Card:**
- Background: `BG_SURFACE`
- Border: `1px BORDER`
- Radius: `6px`
- Padding: `16px`
- Elevation: 0 (hover: 1)

**Panel:**
- Background: `BG_PRIMARY`
- Border: Right border only `1px BORDER`
- Elevation: 0
- Resizable edge

---

## Workspace Architecture

### Left Sidebar (240px - 320px)

**Sections:**

1. **Workspace Header**
   - Workspace name/icon
   - Settings button

2. **Navigation (Collapsible)**
   - Notes
   - Knowledge Graph
   - AI Agents
   - Research
   - Databases
   - Schemas
   - Documents
   - Integrations

3. **Quick Access**
   - Recent items (5 max)
   - Starred items
   - Pin/unpin capability

4. **Search**
   - Command palette trigger (`Cmd+K`)
   - Workspace search

**Interactions:**
- Collapse to icons only (140px)
- Pin sections
- Drag to reorder
- Keyboard navigation

### Activity Rail (48px)

**Top to Bottom:**

```
[ Explorer ]      Cmd+1
[ Search ]        Cmd+Shift+F
[ AI ]            Cmd+Shift+I
[ Databases ]     Cmd+2
[ Graph ]         Cmd+3
[ Tasks ]         Cmd+Shift+T
[ Notifications ] Cmd+Shift+N
─────────────────
[ Settings ]      Cmd+,
[ Extensions ]    Cmd+Shift+X
```

**Styling:**
- Icon: 24x24px
- Circle hover: `BG_SECONDARY`
- Active indicator: Blue accent bar left
- Tooltip on hover

### Main Content Area

**Modes:**

1. **Single Tab** (most common)
   - Full width
   - Optimal reading (650px content width)

2. **Split View** (side-by-side)
   - 50/50 or 70/30 split
   - Resizable divider

3. **Tabs** (multiple open)
   - Tab bar above content
   - Drag to reorder
   - Context menu (close, close others, etc.)

**Features:**
- Breadcrumb navigation
- Toolbar (contextual)
- Status bar (bottom)

### Right Sidebar (280px - 400px, Collapsible)

**Modes:**
- Hidden (default)
- Outline/Table of Contents
- AI Assistant
- Properties
- Related Items
- History

---

## Navigation Patterns

### Command Palette (⌘K)

**Architecture:**
```
┌─────────────────────────────────────────┐
│ > Command or search...                  │
├─────────────────────────────────────────┤
│ ⌘ Go to Note        (Cmd+O)             │
│ ⌘ Search Database   (Cmd+D)             │
│ ⌘ AI Action         (Cmd+I)             │
│ 🔧 Settings        (Cmd+,)             │
│                                         │
│ Recent:                                 │
│  • Analysis.md      (today)             │
│  • Users schema     (yesterday)         │
└─────────────────────────────────────────┘
```

**Behavior:**
- Fuzzy search across all content
- Category grouping (Notes, Databases, Actions, etc.)
- Keyboard navigation only
- Escape to close
- Recently accessed items at bottom

### Breadcrumb Navigation

```
Workspace > Database > Schema > Table > Row
```

- Click to jump to any level
- Shows current context clearly
- Collapsible on narrow screens

### Mini Map (Right Edge)

**For Documents:**
- Shows document structure
- Scroll position indicator
- Jump by clicking

---

## AI Integration Patterns

### Pattern 1: Inline AI

**Location:** Within content, where user is working

**Trigger:**
- `Cmd+Shift+I` for quick action menu
- Context menu on selection
- Automatic suggestions (subtle highlight)

**Actions:**
```
┌─ AI ─────────────────────────┐
│ ✨ Rewrite                   │
│ ✨ Explain                   │
│ ✨ Summarize                 │
│ ✨ Expand                    │
│ ✨ Generate SQL              │
│ ✨ Create Diagram            │
│ ✨ Generate Tests            │
└──────────────────────────────┘
```

**Display:**
- Inline suggestion as faded text
- Accept/reject buttons (or Tab/Escape)
- Loading state with spinner
- Error state with retry

### Pattern 2: Side Panel AI

**Location:** Right sidebar or separate pane

**Features:**
- Persistent context window
- Conversation history
- References visible
- Thinking steps shown
- Can be toggled on/off

**Interaction:**
- Type message
- AI responds with thinking trace
- Citations to sources
- Generated artifacts in separate tab

### Pattern 3: Agent Workflows

**Location:** Dedicated panel or modal

**Agents:**
- Research Agent
- Schema Auditor
- Documentation Generator
- Data Quality Inspector
- Architecture Reviewer

**Display:**
- Progress indicator
- Reasoning trace (expandable)
- Intermediate results
- Final artifacts with actions

---

## Database & Schema UX

### Schema Explorer

**Hierarchy:**
```
📁 Connection A
  📊 Database
    📂 Public Schema
      🏛️ Table: users
        🔑 id (INTEGER, PK)
        📝 name (VARCHAR)
        ⏰ created_at (TIMESTAMP)
      🏛️ Table: orders
    📂 Private Schema
  📊 Database B
```

**Interactions:**
- Click table → inspect panel (right sidebar)
- Right-click → context menu (run query, edit, etc.)
- Drag table → create relationship
- Expand to see columns
- Double-click to open in editor

### Data Profiling

**Inline Stats (Hover):**
```
users
├─ 1.2M rows
├─ 24.5 MB
├─ Last updated: 2 hours ago
└─ Health: 92% ✓
```

**Detailed View:**
- Row count
- Size
- Columns (with types, nullability)
- Primary keys
- Foreign keys
- Indexes
- Data quality score

### ER Diagram Editor

**Visual:**
- Tables as boxes
- Relationships as lines
- Cardinality labels (1:1, 1:N, M:N)
- Color coding by schema
- Draggable tables

**Toolbar:**
- Add table
- Auto-layout
- Zoom controls
- Export (PNG, SVG)
- Generate SQL DDL

---

## Knowledge Graph Redesign

### Smart Visualization

**Default: Clustered View**
```
[Research]  [Analysis]  [Design]
     ↓          ↓            ↓
  [Document] - [Entity] - [Table]
     ↑          ↑            ↑
  [Note]   [Connection]  [Schema]
```

**Features:**
- Semantic clustering (auto-group related entities)
- Semantic zoom (more detail as you zoom)
- Time-aware relationships (show relationship dates)
- Evidence backing (why is this entity connected?)

**Interactions:**
- Click node → open in main view
- Drag to explore relationships
- Filter by type/time/confidence
- AI-generated insights sidebar

---

## Search Experience

### Global Search (Cmd+Shift+F)

**Layout:**
```
┌──────────────────────────────────────┐
│ 🔍 Search across workspace...        │
│ [Filters ▼]                          │
├──────────────────────────────────────┤
│ NOTES & DOCUMENTS (3)                │
│  • Document Title - preview text...  │
│  • Another Note - preview...         │
│                                      │
│ DATABASES & SCHEMAS (5)              │
│  • users table - 1.2M rows          │
│  • orders schema - 8 tables         │
│                                      │
│ AI AGENTS & CONVERSATIONS (2)        │
│  • Research Agent (Yesterday)        │
└──────────────────────────────────────┘
```

**Features:**
- Instant previews (no click needed)
- Search filters (type, date, owner)
- Recent searches
- Saved searches
- Faceted navigation

---

## Dashboard (Redesigned)

**Purpose:** Show workspace health, recent activity, AI insights

**Widgets (Configurable):**

1. **Quick Actions**
   - New note
   - New query
   - Run agent
   - Start research

2. **Recent Work**
   - Last modified notes
   - Last executed queries
   - Recent conversations

3. **Workspace Health**
   - Databases connected
   - Schemas cataloged
   - Documents processed
   - Knowledge graph size

4. **AI Activity**
   - Recent actions
   - Generated artifacts
   - Research progress
   - Pending tasks

5. **Data Insights**
   - Table growth (trending)
   - Query performance
   - Data quality alerts
   - Schema changes

6. **Collaboration** (Enterprise)
   - Recent reviews
   - Pending approvals
   - Team activity
   - Shared workspaces

**Density:** Compact/Standard/Focus modes

---

## Accessibility Standards

### Keyboard Navigation

**Must Support:**
- Tab through all interactive elements
- Shift+Tab backward
- Enter to activate
- Space for checkboxes/toggles
- Arrow keys in lists/trees
- Escape to close dialogs
- Cmd+K for command palette
- Cmd+/ for help

### Screen Reader Support

- ARIA labels on all icons
- Semantic HTML (nav, main, section)
- Role attributes where needed
- Live regions for notifications
- Descriptive alt text for diagrams

### Visual Accessibility

- Minimum contrast: WCAG AA (4.5:1 for text)
- Focus indicator: Minimum 2px, high contrast
- Color not sole information method
- Reduced motion support (disable animations)
- Resizable text (up to 200%)

---

## Motion & Transitions

**Philosophy:** Purposeful motion, not decorative

**Standards:**
- Subtle transitions: 150ms (easing: cubic-bezier(0.4, 0, 0.2, 1))
- Fast feedback: 75ms
- Slow reveals: 300ms
- Page transitions: 200ms

**Reduce Motion Mode:**
- Disable all transitions (motion: none)
- Instant navigation
- No animations

---

## Responsive Breakpoints

**Not Mobile-First (Desktop-First)**

| Device | Width | Focus | Support Level |
|--------|-------|-------|----------------|
| Desktop XL | 1920px+ | Primary | Full UI |
| Desktop | 1440px | Primary | Full UI |
| Desktop Compact | 1280px | Secondary | All features, some reflow |
| Laptop | 1024px | Minimal | Reduced sidebars, limited |
| Tablet | 768px | None | Companion app |
| Phone | < 768px | None | Web-only view (read-only) |

**Breakpoint Strategy:**
- 1440px = standard desktop (two 720px panes)
- 1280px = collapsed sidebar (two 640px panes)
- 1024px = single pane with overlay panels
- Below: companion mobile app only

---

## Dark & Light Themes

### Dark Theme (Default)

**Base:** True dark (`#0F0F12`)  
**Benefit:** Reduces eye strain, professional appearance, OLED-friendly

### Light Theme (Secondary)

**Base:** Near-white (`#FFFFFF`)  
**Benefit:** Paper-like reading, daytime use

**Both themes:**
- Same information hierarchy
- Same component structure
- Different color values only
- User preference persisted

---

## Performance Targets

**Interaction Responsiveness:**
- Initial page load: < 1.5s (with content)
- Page navigation: < 300ms
- Search results: < 200ms (for 10,000 items)
- Scroll: 60fps (smooth, no jank)
- Inline AI suggestions: < 2s (for 100 char selection)

**Memory:**
- Idle: < 150 MB
- With 100 notes open: < 400 MB
- With large schema: < 600 MB

---

## Enterprise Features

### Collaboration

- Comments on content
- Suggestions (tracked changes)
- Reviews & approvals
- Shared workspaces
- Team knowledge repositories
- Audit logs
- Permission controls (view, edit, admin)

### Administration

- User management
- Workspace settings
- Audit logging
- Data retention policies
- Export controls

---

## Design System Deliverables

✓ Color tokens (JSON)  
✓ Typography scale (CSS)  
✓ Component specifications (Storybook)  
✓ Spacing/grid system (documentation)  
✓ Icon library (SVG)  
✓ Interaction patterns (video demos)  
✓ Accessibility checklist  
✓ Dark/light theme definitions  
✓ Animation guidelines  
✓ Responsive breakpoints  

---

**Last Updated:** July 20, 2026  
**Version:** 2.0  
**Status:** Ready for Implementation

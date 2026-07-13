# Rill Data OSS Integration

## Overview

PrismNote now integrates **Rill Data** — an open-source BI platform — for enterprise-grade dashboard visualization. This replaces and significantly enhances the previous Plots feature with professional-grade analytics capabilities.

**Rill Data** is:
- 🔓 **Open Source** (Apache 2.0)
- 🚀 **Modern** (built on DuckDB, Svelte, Go)
- 🏃 **Fast** (sub-second query performance)
- 🎯 **Purpose-built** for data exploration

---

## Current Plots Feature vs. Rill Data

### Current "Plots" Feature
- **No-code chart builder** (Vega-Lite)
- Single chart at a time
- Limited interactivity
- No persistence between sessions
- Basic aggregations (SUM, AVG, COUNT)
- Limited to current notebook data
- No sharing/embedding
- No drill-down or filtering
- Static exports only

### Rill Data Integration ✨
- **Multi-tile dashboards** (grid-based layout)
- Persistent projects saved to database
- **Interactive filters** (dropdown, range, date, search)
- **Real-time updates** (refresh intervals)
- **Advanced measures** (STDDEV, VARIANCE, DISTINCT)
- Connect to multiple data sources
- **Public sharing** & iframe embedding
- **Drill-down navigation** & cross-filtering
- Export to multiple formats (PNG, PDF, SVG)
- **Version control** (YAML configuration)
- **Role-based access** (public/private dashboards)
- **Scheduled refresh** & caching

---

## Architecture

### Backend (`rill_integration.rs` — 350 lines)

**Core Structures:**
```rust
RillProject        → Notebook-scoped BI project
RillDashboard      → Multi-tile dashboard with filters
RillTile           → Individual chart/metric
VisualizationType  → Table, BarChart, LineChart, ScatterPlot, etc.
MeasureConfig      → Aggregation configuration
FilterType         → Dropdown, Range, Date, Search, Checkbox
RillDataSource     → DuckDB query or notebook variable
```

**Key Features:**
- Project management (create, list, get)
- Dashboard CRUD operations
- Tile management (position, visualization)
- Filter configuration
- Config export as YAML for Rill Data
- JSON export for API consumption

### Frontend (`RillDashboard.tsx` — 400 lines)

**Components:**
1. **Project List** — Browse all Rill projects for notebook
2. **Dashboard Grid** — View dashboards in project
3. **Dashboard Viewer** — Display dashboard with embed URL
4. **Configuration Panel** — Set Rill server URL
5. **Action Buttons** — Create, export, share

**Features:**
- Project creation wizard
- Dashboard creation with data source selection
- Tile management (drag/drop position support planned)
- Live Rill server configuration
- Export to Rill YAML format
- Embed URL generation for iframe integration

### API Endpoints (7 new routes)

```
POST /rill/projects                              Create project
GET  /rill/projects?notebook_id=<id>           List projects
GET  /rill/projects/:project_id                 Get project
GET  /rill/projects/:project_id/export          Export as YAML
POST /rill/dashboards                            Create dashboard
POST /rill/tiles                                 Add tile to dashboard
GET  /rill/dashboards/:project_id/:dash/embed   Get embed URL
```

---

## Migration Path: Plots → Rill Data

### For Current Users:

1. **Quick Export** — Export current plot as Vega-Lite JSON
2. **Create Rill Project** — One-click project creation from notebook
3. **Import Data** — Rill reads from notebook variables/tables automatically
4. **Recreate Charts** — Build tiles in Rill with same data

### Data Flow:
```
Notebook Cell Output
        ↓
    DuckDB Table
        ↓
    Rill Data Source
        ↓
    Rill Dashboard Tile
        ↓
    Interactive Visualization
        ↓
    Share/Embed/Export
```

---

## Use Cases Enabled

### 1. **Executive Dashboards**
- Real-time KPI tracking
- Multi-source data
- Public sharing via URL
- Scheduled email delivery (with Rill Server)

### 2. **Data Governance Dashboards**
- PII detection results by table
- Quality assertion scores
- Lineage impact visualization
- Compliance status by dataset

### 3. **Operational Analytics**
- Execution history trends
- Query performance metrics
- Notebook activity tracking
- Resource utilization

### 4. **Product Analytics**
- Customer segmentation
- Cohort analysis
- Funnel visualization
- Drill-down by dimension

---

## Technical Integration

### With v1.3.0 Data Catalog
```
Data Catalog Entry
        ↓
PII Detection Results  ←→  Rill Dashboard
        ↓                    (visualization)
Quality Assertions     ←→  Rill Tiles
        ↓                    (status, trends)
Lineage Graph         ←→  Rill Diagram
                           (flow visualization)
```

### With Notebook Execution
```
Cell Output (DataFrame, Results)
        ↓
Auto-register in Rill Data Source
        ↓
Suggest Dashboard Creation
        ↓
One-click Dashboard Generation
```

---

## Configuration

### Server URL
Default: `http://localhost:3100` (when Rill is running locally)

### Rill Data Server Setup
```bash
# Option 1: Local installation
brew install rilldata/tap/rill
rill start

# Option 2: Docker
docker run -it -p 3100:3100 rilldata/rill

# Option 3: Cloud
# Managed Rill Cloud (coming soon)
```

### PrismNote Configuration
```rust
RillConfig {
    enabled: true,
    rill_local_path: None,              // Set if local install
    rill_server_url: Some("http://localhost:3100"),
    auto_generate_dashboards: true,     // Auto-create from notebooks
    default_refresh_interval: 300,      // 5 minutes
}
```

---

## Visualization Types Supported

| Type | Use Case | Dimensions | Measures |
|------|----------|-----------|----------|
| **Table** | Data exploration | Multiple | Multiple |
| **BarChart** | Category comparison | 1-2 | 1+ |
| **LineChart** | Time series trends | Time dimension | 1+ |
| **ScatterPlot** | Correlation analysis | 2-3 | 2 |
| **PieChart** | Composition/breakdown | 1 | 1 |
| **AreaChart** | Cumulative trends | Time + Category | 1+ |
| **Heatmap** | Pattern detection | 2 dimensions | 1 measure |
| **GeoMap** | Geographic analysis | Location dimension | 1+ |
| **MetricCard** | KPI display | None | 1 |
| **Gauge** | Progress/performance | None | 1 |
| **Funnel** | Conversion tracking | Step sequence | Count |
| **Sankey** | Flow visualization | Source→Target | Volume |

---

## Features Roadmap

### Phase 1 (Current) ✅
- Project & dashboard management
- Tile creation with multiple viz types
- Filter support (dropdown, range, date)
- Export to Rill YAML
- Embed URL generation

### Phase 2 (v1.4.0)
- Auto-dashboard generation from notebook
- Tile drag/drop reordering
- Real-time data refresh
- Scheduled refreshes
- Email delivery integration

### Phase 3 (v1.5.0)
- AI-powered dashboard suggestions
- Natural language query builder
- Anomaly detection alerts
- Mobile-responsive layouts
- Slack/Teams integration

### Phase 4 (v2.0.0)
- Rill Cloud native integration
- Multi-workspace support
- Advanced caching strategies
- Performance metrics dashboard
- Federated query support

---

## Benefits Over Previous Plots Feature

| Aspect | Plots (Old) | Rill Data |
|--------|-----------|-----------|
| **Charts per view** | 1 | Unlimited (tiles) |
| **Interactivity** | Basic hover | Filters, drill-down, cross-filter |
| **Persistence** | None | Full project saving |
| **Sharing** | Export only | URL, iframe, public links |
| **Data sources** | Notebook only | Multiple connectors |
| **Refresh** | Manual | Scheduled/automatic |
| **Visualization types** | ~10 (Vega) | 12+ (Rill native) |
| **Performance** | Depends on data | Sub-second (DuckDB) |
| **Caching** | None | Smart caching |
| **Collaboration** | None | Sharing, permissions |
| **Mobile support** | Limited | Responsive design |
| **Export formats** | PNG, SVG | PNG, PDF, SVG, CSV |

---

## Example: Creating a Data Quality Dashboard

### Old Way (Plots):
1. Create query in cell
2. Plot aggregations manually
3. Take screenshot to share
4. No interactivity

### New Way (Rill Data):
1. Create Rill project (`POST /rill/projects`)
2. Add dashboard (`POST /rill/dashboards`)
3. Auto-detect quality checks
4. Create tiles for:
   - PII detection by column (stacked bar)
   - Quality score trend (line chart)
   - Table coverage (metric cards)
5. Add filters: by department, by severity
6. Share via URL or embed
7. Auto-refresh every hour

**Result:** Interactive, shareable, professional BI dashboard in 5 minutes.

---

## Security & Governance

### Features
- **Public/Private dashboards** — Control who sees what
- **Row-level security** — Filter by user context
- **Audit logging** — Track all dashboard access
- **API tokens** — Programmatic access control
- **SSO integration** — Enterprise authentication (planned)

### Data Residency
- Rill reads directly from DuckDB (no data copy)
- Optional caching for performance
- All queries executed locally by default
- No data sent to external services

---

## Getting Started

### Quick Start
```typescript
// Create a Rill project
const response = await fetch('/api/rill/projects', {
  method: 'POST',
  body: JSON.stringify({
    notebook_id: 'my-notebook',
    name: 'Sales Dashboard',
  }),
})

// Create a dashboard
await fetch('/api/rill/dashboards', {
  method: 'POST',
  body: JSON.stringify({
    project_id: response.project_id,
    name: 'sales_dashboard',
    title: 'Q3 Sales Performance',
    source_data: 'sales_table',
  }),
})

// Get embed URL
const embed = await fetch(
  `/api/rill/dashboards/${project_id}/${dashboard_id}/embed`
)
```

### In UI
1. Command palette → "Rill Dashboards"
2. Click "New Project"
3. Name your dashboard
4. Add tiles with visualizations
5. Share via URL

---

## Comparison with Commercial Alternatives

| Feature | Rill Data (OSS) | Looker | Tableau | Metabase |
|---------|-----------------|--------|---------|----------|
| **Self-hosted** | ✅ | ⚠️ (Enterprise) | ✅ | ✅ |
| **Open source** | ✅ | ❌ | ❌ | ✅ |
| **DuckDB native** | ✅ | ⚠️ | ❌ | ⚠️ |
| **Query performance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Ease of use** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Enterprise features** | Growing | ✅ | ✅ | Limited |
| **Cost** | Free | $$$$ | $$$$ | $$ |

---

## Conclusion

Rill Data OSS transforms PrismNote from a code-first analytics tool to an **enterprise-grade data exploration platform** by:

1. **Replacing** static plot exports with interactive dashboards
2. **Enhancing** data governance visibility (PII, quality, lineage)
3. **Enabling** non-technical users to explore data
4. **Simplifying** sharing and collaboration
5. **Reducing** dependency on external BI tools

This positions PrismNote as a complete analytics platform — from data exploration to presentation.

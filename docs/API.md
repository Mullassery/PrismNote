# PrismNote API Reference

Complete REST API documentation for PrismNote v1.3.0+

**Base URL:** `http://localhost:8000/api`

---

## Table of Contents

1. [Data Catalog](#data-catalog)
2. [Column Lineage](#column-lineage)
3. [Governance](#governance)
4. [PII Detection](#pii-detection)
5. [Quality Assertions](#quality-assertions)
6. [Rill Data Dashboards](#rill-data-dashboards)
7. [Query Management](#query-management)
8. [Execution History](#execution-history)
9. [Cache Management](#cache-management)

---

## Data Catalog

### Register Table
**POST** `/catalog/register`

Register a new table in the data catalog.

**Request:**
```json
{
  "notebook_id": "notebook-123",
  "table_name": "sales_data",
  "source_type": "parquet",
  "row_count": 1000000,
  "columns": [
    {
      "name": "sale_id",
      "data_type": "INTEGER",
      "nullable": false,
      "description": "Unique sale identifier",
      "sample_values": ["1", "2", "3"]
    }
  ],
  "tags": ["finance", "production"]
}
```

**Response:** `201 Created`
```json
{
  "catalog_id": "cat-abc123",
  "table_name": "sales_data",
  "created_at": "2026-07-14T10:30:00Z",
  "message": "Table registered in catalog"
}
```

### List Catalog Entries
**GET** `/catalog/list?notebook_id=<id>`

List all tables in a notebook's catalog.

**Response:** `200 OK`
```json
{
  "notebook_id": "notebook-123",
  "entries": [
    {
      "catalog_id": "cat-abc123",
      "table_name": "sales_data",
      "columns": 8,
      "row_count": 1000000,
      "tags": ["finance", "production"],
      "created_at": "2026-07-14T10:30:00Z"
    }
  ],
  "message": "Catalog entries retrieved"
}
```

### Search Catalog
**GET** `/catalog/search?q=<query>`

Full-text search across table names, columns, and descriptions.

**Response:** `200 OK`
```json
{
  "query": "revenue",
  "results": [
    {
      "catalog_id": "cat-abc123",
      "table_name": "revenue_forecast",
      "relevance_score": 0.95
    }
  ],
  "message": "Search results"
}
```

---

## Column Lineage

### Add Lineage Edge
**POST** `/lineage/add`

Record a data transformation between columns.

**Request:**
```json
{
  "source_table": "raw_sales",
  "source_column": "amount_cents",
  "target_table": "processed_sales",
  "target_column": "amount_dollars",
  "operation": "divide_by_100",
  "notebook_id": "notebook-123",
  "cell_id": "cell-456"
}
```

**Response:** `201 Created`
```json
{
  "message": "Lineage edge recorded",
  "lineage_id": "lin-xyz789"
}
```

### Get Column Lineage
**GET** `/lineage/:table/:column`

Retrieve upstream and downstream lineage for a column.

**Response:** `200 OK`
```json
{
  "table": "sales_data",
  "column": "total_amount",
  "upstream": [
    {
      "table_id": "raw_sales",
      "column_name": "subtotal"
    },
    {
      "table_id": "raw_sales",
      "column_name": "tax"
    }
  ],
  "downstream": [
    {
      "table_id": "dashboards",
      "column_name": "revenue_metric"
    }
  ],
  "operations": ["sum", "round"]
}
```

---

## Governance

### Set Governance Policy
**POST** `/governance/set`

Apply governance policies and sensitivity classification to columns.

**Request:**
```json
{
  "catalog_id": "cat-abc123",
  "sensitivity": "confidential",
  "pii_categories": ["Name", "Email"],
  "tags": ["pii", "personal-data"]
}
```

**Response:** `200 OK`
```json
{
  "message": "Governance policy applied",
  "violations": []
}
```

### Get PII Columns
**GET** `/governance/pii-columns?notebook_id=<id>`

List all columns flagged as containing PII.

**Response:** `200 OK`
```json
{
  "notebook_id": "notebook-123",
  "pii_columns": [
    {
      "table": "customers",
      "column": "email",
      "pii_category": "Email",
      "sensitivity": "confidential"
    }
  ],
  "count": 1
}
```

---

## PII Detection

### Detect PII in Column
**POST** `/pii/detect`

Scan a column for personally identifiable information.

**Request:**
```json
{
  "column_name": "customer_email",
  "data_type": "varchar",
  "samples": ["john@example.com", "jane@example.com"]
}
```

**Response:** `200 OK`
```json
{
  "column_name": "customer_email",
  "pii_detected": true,
  "risk_score": 0.95,
  "matches": [
    {
      "pii_type": "Email Address",
      "confidence": 0.95,
      "sample_value": "john@example.com"
    }
  ],
  "recommendations": [
    "Enable encryption",
    "Restrict access",
    "Add audit logging"
  ]
}
```

### Batch PII Detection
**POST** `/pii/detect-batch`

Scan multiple columns for PII.

**Request:**
```json
[
  {
    "column_name": "email",
    "data_type": "varchar",
    "samples": ["user@example.com"]
  },
  {
    "column_name": "phone",
    "data_type": "varchar",
    "samples": ["555-123-4567"]
  }
]
```

**Response:** `200 OK`
```json
{
  "total_columns": 2,
  "pii_columns": 2,
  "high_risk": 1,
  "results": [...]
}
```

---

## Quality Assertions

### Create Quality Assertion
**POST** `/quality/assertion`

Define a data quality check rule.

**Request:**
```json
{
  "name": "revenue_positive",
  "assertion_type": "positive",
  "sql_rule": "SELECT COUNT(*) as failures FROM sales WHERE amount <= 0",
  "severity": "error"
}
```

**Response:** `201 Created`
```json
{
  "assertion_id": "qc-abc123",
  "name": "revenue_positive",
  "severity": "error",
  "created_at": "2026-07-14T10:30:00Z",
  "message": "Quality assertion created"
}
```

### Get Quality Score
**GET** `/quality/score?table_id=<id>`

Get overall data quality score (0-100) for a table.

**Response:** `200 OK`
```json
{
  "table_id": "sales_data",
  "overall_quality_score": 87.5,
  "passed_assertions": 7,
  "failed_assertions": 1,
  "warning_assertions": 0,
  "recommendations": [
    "Fix NULL values in email_address column",
    "Add uniqueness check on user_id"
  ]
}
```

### Run Quality Checks
**GET** `/quality/run-checks?table_id=<id>`

Execute all assertions for a table.

**Response:** `200 OK`
```json
{
  "table_id": "sales_data",
  "checks_run": 8,
  "passed": 7,
  "failed": 1,
  "duration_ms": 234,
  "results": [
    {
      "check": "NOT NULL: email_address",
      "status": "passed",
      "rows_affected": 0
    },
    {
      "check": "UNIQUE: user_id",
      "status": "failed",
      "rows_affected": 3
    }
  ]
}
```

---

## Rill Data Dashboards

### Create Project
**POST** `/rill/projects`

Create a new Rill Data project.

**Request:**
```json
{
  "notebook_id": "notebook-123",
  "name": "Sales Dashboard",
  "description": "Q3 sales performance"
}
```

**Response:** `201 Created`
```json
{
  "project_id": "rill-abc123",
  "name": "Sales Dashboard",
  "notebook_id": "notebook-123",
  "created_at": "2026-07-14T10:30:00Z",
  "message": "Rill Data project created"
}
```

### List Projects
**GET** `/rill/projects?notebook_id=<id>`

List all Rill projects for a notebook.

**Response:** `200 OK`
```json
{
  "notebook_id": "notebook-123",
  "projects": [
    {
      "project_id": "rill-abc123",
      "name": "Sales Dashboard",
      "dashboards": 2
    }
  ],
  "count": 1
}
```

### Create Dashboard
**POST** `/rill/dashboards`

Add a dashboard to a project.

**Request:**
```json
{
  "project_id": "rill-abc123",
  "name": "dashboard_q3",
  "title": "Q3 Sales Performance",
  "source_data": "sales_table",
  "description": "Revenue and KPI trends"
}
```

**Response:** `201 Created`
```json
{
  "dashboard_id": "dash-xyz789",
  "project_id": "rill-abc123",
  "name": "dashboard_q3",
  "title": "Q3 Sales Performance",
  "source_data": "sales_table",
  "tiles": [],
  "created_at": "2026-07-14T10:30:00Z",
  "message": "Rill dashboard created"
}
```

### Add Tile
**POST** `/rill/tiles`

Add a visualization tile to a dashboard.

**Request:**
```json
{
  "project_id": "rill-abc123",
  "dashboard_id": "dash-xyz789",
  "title": "Revenue Trend",
  "visualization_type": "LineChart",
  "dimensions": ["date"],
  "measures": [
    {
      "name": "Total Revenue",
      "column": "amount",
      "aggregation": "sum"
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "tile_id": "tile-abc123",
  "dashboard_id": "dash-xyz789",
  "title": "Revenue Trend",
  "visualization_type": "LineChart",
  "dimensions": ["date"],
  "message": "Tile added to dashboard"
}
```

### Get Embed URL
**GET** `/rill/dashboards/:project_id/:dashboard_id/embed`

Get URL for embedding dashboard in iframe.

**Response:** `200 OK`
```json
{
  "project_id": "rill-abc123",
  "dashboard_id": "dash-xyz789",
  "embed_url": "/rill/embed/rill-abc123/dash-xyz789",
  "iframe_url": "http://localhost:3100/explore?dashboard=dash-xyz789",
  "config": {
    "interactive": true,
    "toolbar": true,
    "theme": "dark"
  }
}
```

### Export Project
**GET** `/rill/projects/:project_id/export`

Export project as Rill YAML configuration.

**Response:** `200 OK`
```json
{
  "project_id": "rill-abc123",
  "format": "rill-yaml",
  "content": "# Rill Data project configuration exported from PrismNote\nproject_name: Sales Dashboard\n...",
  "message": "Project exported for Rill Data"
}
```

---

## Query Management

### Save Query
**POST** `/queries`

Save a frequently-used query.

**Request:**
```json
{
  "query_text": "SELECT * FROM sales WHERE date > NOW() - INTERVAL 7 DAY",
  "query_type": "sql",
  "title": "Last 7 Days Sales",
  "tags": ["daily", "sales"]
}
```

**Response:** `201 Created`
```json
{
  "query_id": "q-abc123",
  "title": "Last 7 Days Sales",
  "run_count": 0,
  "is_favorite": false
}
```

### List Saved Queries
**GET** `/queries?limit=50&offset=0`

List user's saved queries.

**Response:** `200 OK`
```json
{
  "queries": [...],
  "total": 15
}
```

### Get Favorite Queries
**GET** `/queries/favorites`

Get top favorite queries.

**Response:** `200 OK`
```json
{
  "queries": [...]
}
```

### Search Queries
**GET** `/queries/search?q=<term>&limit=20`

Search queries by title, description, or content.

**Response:** `200 OK`
```json
{
  "query": "sales",
  "results": [...]
}
```

### Toggle Favorite
**POST** `/queries/:query_id/favorite`

Mark/unmark query as favorite.

**Response:** `200 OK`
```json
{
  "query_id": "q-abc123",
  "is_favorite": true
}
```

### Delete Query
**DELETE** `/queries/:query_id`

Delete saved query.

**Response:** `204 No Content`

---

## Execution History

### Get Cell Execution History
**GET** `/notebooks/:notebook_id/cells/:cell_id/executions?limit=20`

Get execution history for a cell.

**Response:** `200 OK`
```json
{
  "executions": [
    {
      "execution_id": "ex-123",
      "cell_id": "cell-456",
      "status": "success",
      "start_time": "2026-07-14T10:30:00Z",
      "duration_ms": 234,
      "rows_affected": 1000,
      "memory_mb": 45.2
    }
  ]
}
```

### Get Notebook Execution Stats
**GET** `/notebooks/:notebook_id/execution-stats`

Get aggregate execution statistics for notebook.

**Response:** `200 OK`
```json
{
  "total_executions": 150,
  "successful": 145,
  "failed": 5,
  "avg_duration_ms": 345.5,
  "max_duration_ms": 2340,
  "avg_memory_mb": 50.2,
  "peak_memory_mb": 120.5
}
```

---

## Cache Management

### Get Cache Stats
**GET** `/cache/stats`

Get statistics about query result cache.

**Response:** `200 OK`
```json
{
  "entry_count": 245,
  "total_size_bytes": 52428800,
  "max_size_bytes": 268435456,
  "utilization_percent": 19.5
}
```

### Clear Cache
**POST** `/cache/clear`

Clear all cached query results.

**Response:** `200 OK`
```json
{
  "message": "Cache cleared",
  "entries_removed": 245
}
```

---

## Error Handling

All endpoints return errors in the following format:

**4xx / 5xx Error Response:**
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "value"
  }
}
```

**Common Status Codes:**
- `200 OK` — Success
- `201 Created` — Resource created
- `204 No Content` — Success with no response body
- `400 Bad Request` — Invalid parameters
- `401 Unauthorized` — Authentication required
- `403 Forbidden` — Access denied
- `404 Not Found` — Resource not found
- `409 Conflict` — Resource already exists
- `500 Internal Server Error` — Server error

---

## Rate Limiting

API requests are rate-limited per client:
- **Limit:** 100 requests per minute
- **Headers:**
  - `X-RateLimit-Limit`: 100
  - `X-RateLimit-Remaining`: requests remaining
  - `X-RateLimit-Reset`: Unix timestamp of limit reset

---

## Authentication

Include JWT token in Authorization header:
```
Authorization: Bearer <token>
```

Tokens are obtained via login or JWT refresh endpoint. Tokens expire after 24 hours.

---

## Pagination

List endpoints support pagination:
- `limit` — Results per page (default: 20, max: 100)
- `offset` — Starting position (default: 0)

**Example:** `/api/queries?limit=50&offset=100`

---

## See Also

- [Data Governance Guide](./governance.md)
- [Rill Data Integration](../RILL_DATA_INTEGRATION.md)
- [Release Notes](../RELEASES.md)

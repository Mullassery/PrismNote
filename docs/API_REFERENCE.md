# PrismNote API Reference

Structured API documentation for AI agents and integrations.

## Base URL

```
http://localhost:8000
```

## Authentication

No authentication required (local-first). All requests use HTTP/REST.

---

## Endpoints

### Database Operations

#### List Databases
```
GET /api/databases
```

**Response:**
```json
[
  {
    "id": "db-1",
    "name": "Production Sales",
    "db_type": "snowflake",
    "tables": ["users", "orders", "products"]
  }
]
```

---

#### Execute Query
```
POST /api/databases/:id/query
```

**Request Body:**
```json
{
  "query": "SELECT * FROM users LIMIT 10"
}
```

**Response:**
```json
{
  "columns": ["id", "name", "email"],
  "rows": [
    [1, "Alice", "alice@example.com"],
    [2, "Bob", "bob@example.com"]
  ],
  "row_count": 2,
  "executionTimeMs": 234
}
```

**Errors:**
- 400: Invalid query
- 500: Database connection error
- 408: Query timeout

---

#### Get Database Schema
```
GET /api/databases/:id/schema
```

**Response:**
```json
{
  "tables": [
    {
      "name": "users",
      "columns": [
        {
          "name": "id",
          "type": "INTEGER",
          "nullable": false
        },
        {
          "name": "email",
          "type": "VARCHAR",
          "nullable": true
        }
      ]
    }
  ]
}
```

---

### AI Operations

#### AI Chat
```
POST /api/ai/chat
```

**Request Body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "What is the sum of all sales?"
    },
    {
      "role": "assistant",
      "content": "Let me calculate that..."
    }
  ],
  "system": "You are a data analyst assistant."
}
```

**Response:**
```json
{
  "reply": "Based on the data, the total sales are $1.2M."
}
```

---

#### Get AI Config
```
GET /api/ai/config
```

**Response:**
```json
{
  "configured": true,
  "provider": "claude",
  "ollama_url": "http://localhost:11434",
  "ollama_model": null,
  "claude_model": "claude-sonnet-4-6",
  "openai_model": null,
  "claude_key_set": true,
  "openai_key_set": false,
  "tavily_key_set": true
}
```

---

#### Set AI Config
```
POST /api/ai/config
```

**Request Body:**
```json
{
  "provider": "claude",
  "claude_model": "claude-sonnet-4-6",
  "claude_api_key": "sk-ant-...",
  "tavily_api_key": "tvly-..."
}
```

**Response:**
```json
{
  "success": true
}
```

---

#### Validate Tavily Key
```
POST /api/ai/validate-tavily
```

**Request Body:**
```json
{
  "key": "tvly-abc123..."
}
```

**Response:**
```json
{
  "valid": true
}
```

---

### Quick Actions (⌘K)

#### Edit Code
```
POST /api/ai/edit
```

**Request Body:**
```json
{
  "code": "for i in range(10): print(i)",
  "instruction": "Make it a list comprehension",
  "context": "Python 3.8+"
}
```

**Response:**
```json
{
  "suggestion": "[print(i) for i in range(10)]"
}
```

---

#### Fix Error
```
POST /api/ai/fix
```

**Request Body:**
```json
{
  "code": "SELECT * FROM users WHER id = 1",
  "error": "Unexpected identifier WHER"
}
```

**Response:**
```json
{
  "suggestion": "SELECT * FROM users WHERE id = 1"
}
```

---

#### Explain Code
```
POST /api/ai/explain
```

**Request Body:**
```json
{
  "code": "df.groupby('region').agg({'sales': 'sum'}).sort_values(ascending=False)"
}
```

**Response:**
```json
{
  "suggestion": "Groups data by region, sums sales per region, and sorts descending."
}
```

---

### Notebook Operations

#### List Notebooks
```
GET /api/notebooks
```

**Response:**
```json
[
  {
    "id": "nb-1",
    "name": "Sales Analysis",
    "created": "2026-07-20",
    "modified": "2026-07-20T15:30:00Z",
    "cells": 5
  }
]
```

---

#### Get Notebook
```
GET /api/notebooks/:id
```

**Response:**
```json
{
  "id": "nb-1",
  "name": "Sales Analysis",
  "cells": [
    {
      "id": "cell-1",
      "type": "code",
      "language": "python",
      "source": "import pandas as pd",
      "outputs": []
    }
  ]
}
```

---

#### Execute Cell
```
POST /api/notebooks/:id/cells/:cellId/execute
```

**Request Body:**
```json
{
  "code": "print('Hello')"
}
```

**Response:**
```json
{
  "status": "success",
  "output": "Hello",
  "execution_time_ms": 45
}
```

---

## SQL Dialects & Compatibility

| Dialect | Version | Syntax | Notes |
|---------|---------|--------|-------|
| PostgreSQL | 12+ | Standard SQL | RETURNING, JSON support |
| MySQL | 5.7+ | Standard SQL | Backticks for identifiers |
| SQLite | 3+ | Simplified SQL | No CROSS JOIN |
| DuckDB | 0.5+ | Enhanced SQL | JSON, Arrow support |
| Snowflake | Current | ANSI SQL | ILIKE, object identifiers |
| BigQuery | Current | Simplified SQL | EXCEPT/INTERSECT |
| T-SQL | 2016+ | SQL Server | SELECT INTO, XML |
| Oracle | 12c+ | Oracle SQL | MERGE, hierarchical |
| Redshift | Current | Postgres variant | UNLOAD, Redshift functions |
| Databricks | Current | Spark SQL | Delta Lake, Apache Spark |

---

## Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response |
| 400 | Bad request | Check request format |
| 401 | Unauthorized | Add API key in Settings |
| 404 | Not found | Verify resource ID |
| 408 | Timeout | Increase timeout in Settings |
| 500 | Server error | Check server logs |
| 503 | Service unavailable | Service restarting |

---

## Rate Limiting

**No hard limit**, but recommended:
- Max 100 queries/minute
- Max 10 parallel queries
- Web search: Limited by Tavily quota
- AI calls: Limited by provider (Claude, OpenAI)

---

## Data Formats

### Query Results
```json
{
  "columns": ["col_name"],
  "rows": [[value]],
  "row_count": 1,
  "executionTimeMs": 100
}
```

### Error Response
```json
{
  "error": "Connection refused",
  "message": "Database not reachable",
  "code": "DB_ERROR_CONNECTION"
}
```

### Cell Output
```json
{
  "type": "stdout|stderr|result|error",
  "content": "...",
  "timestamp": "2026-07-20T15:30:00Z"
}
```

---

## Headers

All requests should include:

```
Content-Type: application/json
Accept: application/json
```

Optional:
```
X-Request-ID: unique-id-for-tracking
```

---

## Pagination

Not currently supported. Use LIMIT in SQL queries.

---

## Versioning

All APIs are v1 (no versioning suffix). Breaking changes increment major version.

Current version: **1.6.0**

---

## Async Operations

All endpoints are synchronous. Long-running operations (queries) are subject to timeout setting.

---

## WebSocket Support

Status: Planned for v1.7 (real-time collaboration)

---

## Examples for AI Agents

### Example: Query and Process
```python
# 1. List databases
databases = requests.get('http://localhost:8000/api/databases').json()

# 2. Execute query
result = requests.post(
  'http://localhost:8000/api/databases/db-1/query',
  json={'query': 'SELECT * FROM sales'}
).json()

# 3. Process results
for row in result['rows']:
  print(row)
```

### Example: Ask AI
```python
response = requests.post(
  'http://localhost:8000/api/ai/chat',
  json={
    'messages': [{'role': 'user', 'content': 'Analyze this data'}],
    'system': 'You are helpful.'
  }
).json()

print(response['reply'])
```

---

## Troubleshooting

**Connection refused:**
- Check PrismNote is running: `prismnote`
- Verify port: `lsof -i :8000`

**Query timeout:**
- Check query complexity
- Increase timeout in Settings
- Add LIMIT to preview first

**API key errors:**
- Verify key in Settings (⌘,)
- Test key: POST `/api/ai/validate-tavily`

**Missing database:**
- List available: GET `/api/databases`
- Check connection settings
- Verify database is running

---

Last updated: July 20, 2026

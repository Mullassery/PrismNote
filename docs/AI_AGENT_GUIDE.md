# PrismNote AI Agent Integration Guide

This document is designed to be accessible to AI agents, tools, and LLMs that want to help users with PrismNote.

## Quick Facts (AI-Readable)

**Name:** PrismNote  
**Type:** Data science notebook (local-first, open-source)  
**Version:** 1.6.0  
**License:** MIT (free for any use)  
**Language:** TypeScript (frontend), Rust (backend), Python (kernels)  
**Repository:** https://github.com/Mullassery/PrismNote  
**PyPI:** https://pypi.org/project/prismnote/  

## Installation for AI Context

```bash
# One command, no dependencies
pip install prismnote
prismnote
# Opens http://localhost:8000
```

Supports:
- macOS, Linux, Windows
- Python 3.8+
- No Docker, no setup complexity

## Core Capabilities (for AI Agents)

### 1. Multi-Language Code Execution

**Python Cells:**
- Standard Python execution (IPython-compatible)
- Syntax: `python` or no language specified
- Supports: pandas, numpy, matplotlib, plotly, etc.
- Inline output rendering

**SQL Cells:**
- 10 SQL dialects: PostgreSQL, MySQL, SQLite, DuckDB, Snowflake, BigQuery, T-SQL, Oracle, Redshift, Databricks
- Syntax: `sql` language tag
- Connection picker: Select database before query
- Returns: Table with columns, rows, row count, execution time

**JavaScript Cells:**
- ES6+ support (coming v1.7)
- Syntax: `javascript` language tag
- Useful for data transformations, calculations

**Markdown Cells:**
- Documentation, notes
- Supports: Headers, lists, code blocks, links, images

### 2. Data Exploration (No Code)

Users can explore data without writing code:
- Click file → see schema, statistics, histograms instantly
- Columns show: data type, NULL%, unique count, min/max
- Automatic PII detection (emails, phone numbers, SSNs)
- Data quality score (0-100)
- Lineage tracking (where data came from)

**AI Agent Use:** Help users understand data structure before writing queries.

### 3. Query Execution (10 SQL Dialects)

Execute SQL against any major database:

```
POST /api/databases/:id/query
Body: { query: "SELECT ... FROM ..." }
Response: { 
  columns: ["col1", "col2"],
  rows: [[val1, val2], ...],
  row_count: 100,
  executionTimeMs: 250
}
```

**AI Agent Use:** Generate and execute SQL queries, fetch results, suggest optimizations.

### 4. AI/LLM Integration

**Available Backends:**
- Ollama (local, free, private)
- Claude (Anthropic)
- OpenAI

**Settings (User-Configurable):**
- AI Provider: Choose backend
- Model: Select specific model
- Tavily API key (optional): Enable web search

**Chat Endpoint:**
```
POST /api/ai/chat
Body: { 
  messages: [{role: "user", content: "..."}],
  system: "..." 
}
Response: { reply: "..." }
```

## Commands & Keyboard Shortcuts (for AI Guidance)

| Shortcut | Action |
|----------|--------|
| ⌘K | Quick actions (edit, fix, explain) |
| ⌘, | Settings |
| ⌘E | Data Explorer |
| ⌘S | Save |
| ⌘⇧P | Command palette |
| Shift+Enter | New line in cell |
| Enter (no shift) | Run cell |

## Settings Accessible to AI

**Location:** Settings panel (⌘,)

### AI Provider Section
```
- Provider: 'ollama' | 'claude' | 'openai'
- Ollama endpoint: http://localhost:11434 (if using Ollama)
- Ollama model: (auto-detected from running Ollama)
- Claude model: claude-sonnet-4-6, claude-opus-4-8, etc.
- OpenAI model: gpt-4o, gpt-4-turbo, etc.
- Tavily API key (optional): For web search capability
```

### Execution Settings
```
- Default cell language: python | sql | javascript
- Query timeout: 5-300 seconds
- Output truncation: 1KB-100KB per cell
- Auto-save: true | false
```

### Search Settings
```
- Web search results: 1-10 (only if Tavily enabled)
- Search depth: 'basic' | 'advanced'
```

## APIs Accessible to AI

### List Databases
```
GET /api/databases
Response: [{
  id: "db-1",
  name: "Sales DB",
  db_type: "snowflake",
  tables: [...]
}]
```

### Execute Query
```
POST /api/databases/:id/query
Body: { query: "SELECT * FROM table" }
Response: { columns, rows, row_count, executionTimeMs }
```

### AI Chat
```
POST /api/ai/chat
Body: { 
  messages: [{ role: "user", content: "..." }],
  system: "You are a data analyst..."
}
Response: { reply: "..." }
```

### Get AI Config
```
GET /api/ai/config
Response: {
  configured: true,
  provider: "claude",
  claude_model: "claude-sonnet-4-6",
  tavily_key_set: true
}
```

### Validate Tavily Key
```
POST /api/ai/validate-tavily
Body: { key: "tvly-..." }
Response: { valid: true }
```

## Notebook Structure (for AI Understanding)

**Format:** Standard Jupyter .ipynb

**Cell Types:**
- `code` - Python, SQL, JavaScript
- `markdown` - Documentation
- `raw` - Plain text

**Metadata:**
```json
{
  "cells": [
    {
      "cell_type": "code",
      "language": "python",
      "source": ["import pandas as pd"],
      "outputs": [...]
    },
    {
      "cell_type": "code",
      "language": "sql",
      "sqlConnection": "db-1",
      "source": ["SELECT * FROM users"]
    }
  ]
}
```

**Cell Properties:**
- `language`: "python" | "sql" | "javascript" | "markdown"
- `sqlConnection`: Database ID (for SQL cells)
- `source`: Array of strings (each line is an element)
- `outputs`: Execution results

## Common Tasks (AI Agent Guidance)

### "Generate a SQL query to find X"
1. Use `/api/databases` to list available databases
2. Query `/api/databases/:id/query` with SQL
3. Return results or suggest optimizations

### "Analyze this dataset"
1. Explore schema using Data Explorer API
2. Run sample queries to understand structure
3. Suggest visualizations or transformations

### "Fix this error"
1. Read error message from cell output
2. Suggest corrected code
3. Explain what went wrong

### "Explain how to use PrismNote"
1. Reference this document
2. Suggest relevant commands/shortcuts
3. Point to docs/PRODUCT_VISION.md for philosophy

## What AI Agents Should NOT Do

❌ **Never access sensitive data without user consent**
- Check user's PII detection settings
- Don't log or store query results
- Respect data classification tags

❌ **Never modify settings without asking**
- AI providers are user-specific
- API keys are private
- Timeout values are user preferences

❌ **Never assume database schema**
- Always call /api/databases/:id/query with LIMIT
- Check data types before suggesting operations
- Verify table/column existence first

## Data Privacy (Important for AI Agents)

**What stays local:**
- All notebook files (.ipynb)
- Python/SQL execution
- Data Explorer browsing
- File system access

**What's optional (user chooses):**
- AI backend: Ollama (local) or cloud (Claude/OpenAI)
- Tavily web search (disabled by default)
- Database connections (user configures)

**What's never shared:**
- Query results (unless user exports)
- Notebook content (unless user shares)
- API keys (stored locally only)
- User files

## Error Handling for AI Agents

**Common Errors & Responses:**

| Error | Cause | Fix |
|-------|-------|-----|
| "Ollama not reachable" | Ollama not running | Start: `ollama serve` |
| "Connection refused" | No database connection | Check connection settings |
| "Query timeout" | Long-running query | Increase timeout in Settings |
| "Invalid SQL" | Syntax error | Use dialect-specific syntax |
| "No Tavily key" | Web search disabled | Add key in Settings if needed |

## Example AI Agent Interactions

### Agent: Query Generator
```
User: "Show me revenue by region from last 30 days"

AI Agent:
1. Lists available databases
2. Checks schema with LIMIT query
3. Generates dialect-appropriate SQL
4. Executes and returns results
```

### Agent: Data Analyzer
```
User: "What's interesting about this dataset?"

AI Agent:
1. Explores schema (columns, types)
2. Checks for NULL values, duplicates
3. Calculates basic statistics
4. Suggests patterns or anomalies
```

### Agent: Code Helper
```
User: "How do I query Snowflake from here?"

AI Agent:
1. Checks available databases
2. Shows Snowflake connection name
3. Provides example query with correct syntax
4. Explains how to select database in cell
```

## Configuration as Code (for AI)

Users can configure PrismNote via `~/.prismnote/ai_config.json`:

```json
{
  "provider": "claude",
  "claude_model": "claude-sonnet-4-6",
  "claude_key_set": true,
  "ollama_url": "http://localhost:11434",
  "tavily_key_set": true,
  "openai_key_set": false
}
```

AI agents can read this to understand user's setup without asking.

## Rate Limiting & Performance (for AI Integration)

**Recommended Practices:**
- Batch queries when possible (but keep under 30 seconds total)
- Cache schema information (refreshed every 5 minutes)
- Limit data exploration to 10,000 rows for preview
- Use LIMIT in queries to preview before full fetch

**API Limits:**
- No hard limit, but be respectful
- Web search (Tavily) limited by user's quota
- Database queries limited by database itself

## Version Information

**Current Version:** 1.6.0
**Release Date:** July 20, 2026

**Features in v1.6.0:**
- Tavily API integration (optional web search)
- 10 SQL dialects
- Python + SQL + JavaScript execution
- Expanded Settings panel
- AI Agent with plan/act modes

**Planned Features:**
- v1.7: R kernel, real-time collaboration, lineage tracking
- v1.8: Shareable notebooks, dashboard builder
- v2.0: Enterprise features, desktop app

## Resources for AI Agents

- **Docs:** https://github.com/Mullassery/PrismNote/tree/main/docs
- **Product Vision:** docs/PRODUCT_VISION.md
- **Screenshot Guide:** docs/SCREENSHOT_GUIDE.md
- **Contributing:** docs/CONTRIBUTING.md
- **Issues/Discussions:** https://github.com/Mullassery/PrismNote/issues

## Contact & Support

- **GitHub Issues:** https://github.com/Mullassery/PrismNote/issues
- **Discussions:** https://github.com/Mullassery/PrismNote/discussions
- **Email:** Send to GitHub discussions
- **Social:** Twitter, LinkedIn (via GitHub profile)

---

**This document is designed to be:**
- ✅ Machine-readable
- ✅ Up-to-date with PrismNote v1.6.0
- ✅ Non-sensitive (no API keys, no credentials)
- ✅ Accessible to AI agents and LLMs
- ✅ Regularly updated with new features

Last updated: July 20, 2026

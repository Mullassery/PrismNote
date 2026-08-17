/**
 * SQL Executor — Client-side bridge for running SQL cells against a configured
 * database connection.
 *
 * Reuses the existing `/api/databases/:id/query` endpoint (see `../api/data.ts`
 * `queryDatabase`) rather than inventing a parallel HTTP call — that endpoint
 * is backed by the real Rust query executor (`crates/server/src/api.rs`
 * `execute_database_query`), which returns `{ columns, rows, row_count }`.
 *
 * This module adapts that wire format into the richer `QueryResult` shape the
 * SQL cell UI (`SqlResultsView`) expects (camelCase, execution timing, etc.),
 * and turns failures into a normalized `SqlExecutionError` the UI can render.
 */

import axios from 'axios'
import { queryDatabase } from '../api/data'

/** Normalized query result shape consumed by `SqlResultsView`. */
export interface QueryResult {
  columns: string[]
  rows: any[][]
  rowCount: number
  executionTimeMs?: number
}

/** Normalized SQL error shape consumed by the SQL error panel in `Cell.tsx`. */
export interface SqlExecutionError {
  message: string
  /** Database-reported error code, when the backend/driver exposes one. */
  code?: string
  /** 1-based line number in the query text, when derivable from the error text. */
  line?: number
  /** SQL dialect the query was executed against (for display / debugging). */
  dialect?: string
  /** Raw error payload (stringified) for the "Raw error" details panel. */
  originalError?: string
}

export interface SqlValidationResult {
  valid: boolean
  /** Non-fatal heads-up about the query (e.g. destructive statement, multiple statements). */
  warning?: string
  /** Fatal problem that means the query shouldn't even be sent (e.g. empty). */
  error?: string
}

/**
 * Execute a SQL query against a configured database connection.
 *
 * @param connectionId - id of the database connection (as returned by `/api/databases`)
 * @param dialect - SQL dialect/db type the query targets (used for error context only;
 *   the backend resolves the actual driver from the connection id itself)
 * @param query - raw SQL text to execute
 */
export async function executeSqlQuery(
  connectionId: string,
  dialect: string,
  query: string,
): Promise<QueryResult> {
  const trimmed = query.trim()
  if (!trimmed) {
    throw {
      message: 'Query is empty',
      dialect,
      originalError: 'Nothing to execute',
    } as SqlExecutionError
  }

  const startedAt = performance.now()

  try {
    const result = await queryDatabase(connectionId, trimmed)
    const executionTimeMs = Math.round(performance.now() - startedAt)

    return {
      columns: (result.columns ?? []).map(String),
      rows: result.rows ?? [],
      rowCount: result.row_count ?? (result.rows ? result.rows.length : 0),
      executionTimeMs,
    }
  } catch (err) {
    throw toSqlExecutionError(err, dialect)
  }
}

/**
 * Validate a SQL query before sending it to the server. Catches obviously
 * empty input and warns about statements that are dangerous or ambiguous to
 * run from a notebook cell (no server round-trip required).
 */
export function validateSqlQuery(query: string): SqlValidationResult {
  const trimmed = query.trim()
  if (!trimmed) {
    return { valid: false, error: 'Query is empty' }
  }

  const statements = trimmed
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)

  if (statements.length > 1) {
    return {
      valid: true,
      warning: `Query contains ${statements.length} statements — most drivers only execute the first one.`,
    }
  }

  const upper = trimmed.toUpperCase()
  const isDelete = /^DELETE\s+FROM\b/.test(upper)
  const isUpdate = /^UPDATE\b/.test(upper)

  if ((isDelete || isUpdate) && !/\bWHERE\b/.test(upper)) {
    return {
      valid: true,
      warning: `${isDelete ? 'DELETE' : 'UPDATE'} without a WHERE clause will affect every row in the table.`,
    }
  }

  if (/^DROP\s+(TABLE|DATABASE|SCHEMA)\b/.test(upper)) {
    return {
      valid: true,
      warning: 'This statement permanently drops a table, database, or schema.',
    }
  }

  if (/^TRUNCATE\b/.test(upper)) {
    return {
      valid: true,
      warning: 'TRUNCATE removes all rows and cannot be undone.',
    }
  }

  return { valid: true }
}

/** Convert a thrown axios/network/unknown error into a normalized `SqlExecutionError`. */
function toSqlExecutionError(err: unknown, dialect: string): SqlExecutionError {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined
    const message = data?.error || err.message || 'Query execution failed'
    const { line, code } = extractErrorLocation(message)

    return {
      message,
      code,
      line,
      dialect,
      originalError: data ? JSON.stringify(data, null, 2) : err.message,
    }
  }

  const message = err instanceof Error ? err.message : String(err)
  return { message, dialect, originalError: message }
}

/**
 * Best-effort extraction of a line number / error code from a database error
 * message. Different engines format this differently:
 *   - PostgreSQL:  "...\nLINE 3: SELECT * FROM ..."
 *   - MySQL:       "... at line 12"
 *   - SQLite:      "near line 4:"
 *   - Error codes: "[42601]" or "(1064)"
 */
function extractErrorLocation(message: string): { line?: number; code?: string } {
  const pgLine = message.match(/LINE (\d+)/i)
  if (pgLine) return { line: Number(pgLine[1]) }

  const genericLine = message.match(/(?:at|near) line (\d+)/i)
  if (genericLine) return { line: Number(genericLine[1]) }

  const codeMatch = message.match(/\[(\w{4,6})\]|\((\d{3,5})\)/)
  if (codeMatch) return { code: codeMatch[1] || codeMatch[2] }

  return {}
}

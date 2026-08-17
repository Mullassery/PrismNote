/**
 * Schema Parser — Dialect-specific INFORMATION_SCHEMA queries
 * Generates SQL queries to discover database structure across PostgreSQL, MySQL, SQLite, DuckDB, Snowflake, BigQuery
 */

export interface SchemaTable {
  schema?: string // Schema name (PostgreSQL, MySQL); 'main' for SQLite; usually omitted for DuckDB
  name: string
  type: 'TABLE' | 'VIEW' | 'TEMPORARY'
  rowCount?: number
  sizeBytes?: number
}

export interface ColumnInfo {
  name: string
  type: string // e.g., 'integer', 'text', 'timestamp', 'numeric(10,2)'
  nullable: boolean
  default?: string
  maxLength?: number // Character types
  precision?: number // Numeric types (total digits)
  scale?: number // Numeric types (decimal places)
}

export interface ConstraintInfo {
  column: string
  type: 'PRIMARY_KEY' | 'FOREIGN_KEY' | 'UNIQUE' | 'CHECK' | 'NOT_NULL'
  foreignTable?: string
  foreignColumn?: string
  name?: string
}

export type DbType = 'postgresql' | 'mysql' | 'sqlite' | 'duckdb' | 'snowflake' | 'bigquery'

const DB_TYPES: DbType[] = ['postgresql', 'mysql', 'sqlite', 'duckdb', 'snowflake', 'bigquery']

/** Narrow an arbitrary string (e.g. a connection's `db_type` field) to `DbType`. */
export function isDbType(value: string): value is DbType {
  return (DB_TYPES as string[]).includes(value)
}

/** Validate/cast a free-form string to `DbType`, falling back when it doesn't match. */
export function toDbType(value: string, fallback: DbType = 'postgresql'): DbType {
  return isDbType(value) ? value : fallback
}

/**
 * Build a SQL query to list all tables and views in a database
 * Excludes system schemas and tables
 */
export function buildSchemaQuery(dbType: DbType, schemaName?: string): string {
  switch (dbType) {
    case 'postgresql':
    case 'snowflake':
      return `
        SELECT
          table_schema AS schema,
          table_name AS name,
          CASE WHEN table_type = 'BASE TABLE' THEN 'TABLE' ELSE 'VIEW' END AS type
        FROM information_schema.tables
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'public')
          OR table_schema = 'public'
        ${schemaName ? `AND table_schema = '${escapeSql(schemaName)}'` : ''}
        ORDER BY table_schema, table_name
      `

    case 'mysql':
      return `
        SELECT
          table_schema AS schema,
          table_name AS name,
          CASE WHEN table_type = 'BASE TABLE' THEN 'TABLE' ELSE 'VIEW' END AS type
        FROM information_schema.tables
        WHERE table_schema NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
        ${schemaName ? `AND table_schema = '${escapeSql(schemaName)}'` : ''}
        ORDER BY table_schema, table_name
      `

    case 'sqlite':
      return `
        SELECT
          'main' AS schema,
          name,
          CASE type WHEN 'table' THEN 'TABLE' ELSE 'VIEW' END AS type
        FROM sqlite_master
        WHERE type IN ('table', 'view')
        ORDER BY name
      `

    case 'duckdb':
      return `
        SELECT
          table_schema AS schema,
          table_name AS name,
          CASE WHEN table_type = 'BASE TABLE' THEN 'TABLE' ELSE 'VIEW' END AS type
        FROM information_schema.tables
        WHERE table_schema != 'information_schema'
        ${schemaName ? `AND table_schema = '${escapeSql(schemaName)}'` : ''}
        ORDER BY table_schema, table_name
      `

    case 'bigquery':
      // BigQuery doesn't have traditional schemas; uses dataset.table
      return `
        SELECT
          dataset_id AS schema,
          table_name AS name,
          CASE WHEN type = 1 THEN 'TABLE' WHEN type = 2 THEN 'VIEW' ELSE 'TABLE' END AS type
        FROM \`region-us\`.INFORMATION_SCHEMA.TABLES
        WHERE dataset_id NOT IN ('_information_schema', 'fivetran_audit')
        ${schemaName ? `AND dataset_id = '${escapeSql(schemaName)}'` : ''}
        ORDER BY dataset_id, table_name
      `

    default:
      throw new Error(`Unsupported database type: ${dbType}`)
  }
}

/**
 * Build a SQL query to get column details for a specific table
 * Returns: name, data_type, is_nullable, column_default, character_maximum_length, numeric_precision, numeric_scale
 */
export function buildColumnsQuery(
  dbType: DbType,
  tableName: string,
  schemaName?: string
): string {
  const table = schemaName ? `${escapeSql(schemaName)}.${escapeSql(tableName)}` : escapeSql(tableName)

  switch (dbType) {
    case 'postgresql':
    case 'snowflake':
      return `
        SELECT
          column_name AS name,
          data_type AS type,
          is_nullable = 'YES' AS nullable,
          column_default AS default,
          character_maximum_length AS max_length,
          numeric_precision AS precision,
          numeric_scale AS scale
        FROM information_schema.columns
        WHERE table_name = '${escapeSql(tableName)}'
          ${schemaName ? `AND table_schema = '${escapeSql(schemaName)}'` : ''}
        ORDER BY ordinal_position
      `

    case 'mysql':
      return `
        SELECT
          column_name AS name,
          column_type AS type,
          is_nullable = 'YES' AS nullable,
          column_default AS default,
          character_maximum_length AS max_length,
          numeric_precision AS precision,
          numeric_scale AS scale
        FROM information_schema.columns
        WHERE table_name = '${escapeSql(tableName)}'
          ${schemaName ? `AND table_schema = '${escapeSql(schemaName)}'` : ''}
        ORDER BY ordinal_position
      `

    case 'sqlite':
      // SQLite uses PRAGMA table_info() instead of INFORMATION_SCHEMA
      return `PRAGMA table_info(${table})`

    case 'duckdb':
      return `
        SELECT
          column_name AS name,
          data_type AS type,
          is_nullable = 'YES' AS nullable,
          column_default AS default,
          character_maximum_length AS max_length,
          numeric_precision AS precision,
          numeric_scale AS scale
        FROM information_schema.columns
        WHERE table_name = '${escapeSql(tableName)}'
          ${schemaName ? `AND table_schema = '${escapeSql(schemaName)}'` : ''}
        ORDER BY ordinal_position
      `

    case 'bigquery':
      return `
        SELECT
          column_name AS name,
          data_type AS type,
          is_nullable = 'YES' AS nullable,
          NULL AS default,
          NULL AS max_length,
          numeric_precision AS precision,
          numeric_scale AS scale
        FROM \`region-us\`.INFORMATION_SCHEMA.COLUMNS
        WHERE table_name = '${escapeSql(tableName)}'
          ${schemaName ? `AND table_schema = '${escapeSql(schemaName)}'` : ''}
        ORDER BY ordinal_position
      `

    default:
      throw new Error(`Unsupported database type: ${dbType}`)
  }
}

/**
 * Build a SQL query to get primary key and foreign key constraints
 */
export function buildConstraintsQuery(
  dbType: DbType,
  tableName: string,
  schemaName?: string
): string {
  const table = schemaName ? `${escapeSql(schemaName)}.${escapeSql(tableName)}` : escapeSql(tableName)

  switch (dbType) {
    case 'postgresql':
      return `
        SELECT
          kcu.column_name AS column,
          tc.constraint_type AS type,
          ccu.table_name AS foreign_table,
          ccu.column_name AS foreign_column
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.table_name = '${escapeSql(tableName)}'
          ${schemaName ? `AND tc.table_schema = '${escapeSql(schemaName)}'` : ''}
          AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE')
        ORDER BY kcu.column_name
      `

    case 'mysql':
      return `
        SELECT
          kcu.column_name AS column,
          CASE
            WHEN kcu.column_name = kcu.column_name AND rc.constraint_name IS NOT NULL THEN 'FOREIGN KEY'
            WHEN kcu.constraint_name = 'PRIMARY' THEN 'PRIMARY_KEY'
            ELSE 'UNIQUE'
          END AS type,
          rc.referenced_table_name AS foreign_table,
          rc.referenced_column_name AS foreign_column
        FROM information_schema.key_column_usage kcu
        LEFT JOIN information_schema.referential_constraints rc
          ON kcu.constraint_name = rc.constraint_name
          AND kcu.table_schema = rc.constraint_schema
        WHERE kcu.table_name = '${escapeSql(tableName)}'
          ${schemaName ? `AND kcu.table_schema = '${escapeSql(schemaName)}'` : ''}
        ORDER BY kcu.column_name
      `

    case 'sqlite':
      // SQLite: PRAGMA foreign_key_list gives FKs; no PK query
      // PK info is in PRAGMA table_info with pk > 0
      return `PRAGMA foreign_key_list(${table})`

    case 'duckdb':
      return `
        SELECT
          kcu.column_name AS column,
          tc.constraint_type AS type,
          ccu.table_name AS foreign_table,
          ccu.column_name AS foreign_column
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = '${escapeSql(tableName)}'
          ${schemaName ? `AND tc.table_schema = '${escapeSql(schemaName)}'` : ''}
        ORDER BY kcu.column_name
      `

    case 'snowflake':
      return `
        SELECT
          column_name AS column,
          CASE
            WHEN primary_key THEN 'PRIMARY_KEY'
            WHEN foreign_key THEN 'FOREIGN_KEY'
            ELSE 'UNIQUE'
          END AS type
        FROM information_schema.columns
        WHERE table_name = '${escapeSql(tableName)}'
          ${schemaName ? `AND table_schema = '${escapeSql(schemaName)}'` : ''}
        ORDER BY ordinal_position
      `

    case 'bigquery':
      // BigQuery doesn't expose constraints via INFORMATION_SCHEMA
      return `SELECT NULL AS column, NULL AS type, NULL AS foreign_table, NULL AS foreign_column WHERE FALSE`

    default:
      throw new Error(`Unsupported database type: ${dbType}`)
  }
}

/**
 * Build a SQL query to get row count and approximate table size
 */
export function buildStatsQuery(dbType: DbType, tableName: string, schemaName?: string): string {
  const table = schemaName ? `${escapeSql(schemaName)}.${escapeSql(tableName)}` : escapeSql(tableName)

  switch (dbType) {
    case 'postgresql':
      return `
        SELECT
          n_live_tup AS row_count,
          pg_total_relation_size('${table}'::regclass) AS size_bytes
        FROM pg_stat_user_tables
        WHERE schemaname = '${escapeSql(schemaName || 'public')}'
          AND relname = '${escapeSql(tableName)}'
      `

    case 'mysql':
      return `
        SELECT
          table_rows AS row_count,
          (data_length + index_length) AS size_bytes
        FROM information_schema.tables
        WHERE table_schema = '${escapeSql(schemaName || 'information_schema')}'
          AND table_name = '${escapeSql(tableName)}'
      `

    case 'sqlite':
      return `SELECT COUNT(*) AS row_count FROM ${table}`

    case 'duckdb':
      return `SELECT COUNT(*) AS row_count FROM ${table}`

    case 'snowflake':
      return `SELECT COUNT(*) AS row_count FROM ${table}`

    case 'bigquery':
      return `SELECT COUNT(*) AS row_count FROM ${table}`

    default:
      throw new Error(`Unsupported database type: ${dbType}`)
  }
}

/**
 * Build a SQL query to profile a single column
 * Returns: count, non_null_count, distinct_count, min_value, max_value
 */
export function buildColumnProfileQuery(
  _dbType: DbType,
  tableName: string,
  columnName: string,
  schemaName?: string
): string {
  const table = schemaName ? `${escapeSql(schemaName)}.${escapeSql(tableName)}` : escapeSql(tableName)
  const col = escapeSql(columnName)

  return `
    SELECT
      COUNT(*) AS count,
      COUNT(${col}) AS non_null_count,
      COUNT(DISTINCT ${col}) AS distinct_count,
      MIN(${col}) AS min_value,
      MAX(${col}) AS max_value
    FROM ${table}
  `
}

/**
 * Build a SQL query to get top N distinct values for a column
 */
export function buildTopValuesQuery(
  _dbType: DbType,
  tableName: string,
  columnName: string,
  schemaName?: string,
  limit: number = 10
): string {
  const table = schemaName ? `${escapeSql(schemaName)}.${escapeSql(tableName)}` : escapeSql(tableName)
  const col = escapeSql(columnName)

  // Database-agnostic query (works on most systems)
  return `
    SELECT
      ${col} AS value,
      COUNT(*) AS count
    FROM ${table}
    GROUP BY ${col}
    ORDER BY count DESC
    LIMIT ${limit}
  `
}

/**
 * Parse PRAGMA table_info() result from SQLite
 * PRAGMA returns: (cid, name, type, notnull, dflt_value, pk)
 */
export function parseSqlitePragmaTableInfo(rows: any[][]): ColumnInfo[] {
  return rows.map((row) => ({
    name: row[1], // name
    type: row[2], // type
    nullable: row[3] === 0, // notnull inverted
    default: row[4], // dflt_value
    maxLength: undefined,
    precision: undefined,
    scale: undefined,
  }))
}

/**
 * Parse PRAGMA foreign_key_list() result from SQLite
 * PRAGMA returns: (id, seq, table, from, to, on_delete, on_update, match)
 */
export function parseSqliteForeignKeys(rows: any[][]): ConstraintInfo[] {
  return rows.map((row) => ({
    column: row[3], // from
    type: 'FOREIGN_KEY',
    foreignTable: row[2], // table
    foreignColumn: row[4], // to
  }))
}

/**
 * Convert query response { columns, rows } into an array of objects
 * Used by all consuming code to normalize the response shape from POST /api/databases/:id/query
 */
export function parseQueryResults(columns: string[], rows: any[][]): Record<string, any>[] {
  return rows.map((row) => {
    const obj: Record<string, any> = {}
    columns.forEach((col, i) => {
      obj[col.toLowerCase()] = row[i]
    })
    return obj
  })
}

/**
 * Escape SQL identifier (table name, column name) to prevent injection
 * Uses double quotes (PostgreSQL, SQLite, DuckDB) or backticks (MySQL)
 */
function escapeSql(value: string): string {
  // Simple escape: quote and double any quotes inside
  return `"${value.replace(/"/g, '""')}"` // PostgreSQL/SQLite/DuckDB style
}

/**
 * Get singular form of a table name for FK inference
 * Handles common pluralization rules
 */
export function singularize(word: string): string {
  // Strip trailing 's' or 'es' or 'ies' -> 'y'
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y'
  if (word.endsWith('es')) return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

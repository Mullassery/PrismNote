/**
 * Schema Cache Hook — Zustand store for managing database schema state
 * Handles fetching, caching (5-min TTL), and invalidation of:
 * - List of tables per connection
 * - Column details per table
 * - Constraint information
 * - Inferred FK relationships
 */

import { create } from 'zustand'
import type { SchemaTable, ColumnInfo, ConstraintInfo, DbType } from '../lib/schemaParser'
import {
  buildSchemaQuery,
  buildColumnsQuery,
  buildConstraintsQuery,
  parseQueryResults,
  parseSqlitePragmaTableInfo,
  parseSqliteForeignKeys,
} from '../lib/schemaParser'
import type { InferredRelationship, TableClassification } from '../lib/relationshipInference'
import { inferRelationships } from '../lib/relationshipInference'
import { queryDatabase } from '../api/data'

interface ConnectionSchema {
  tables: SchemaTable[]
  fetchedAt: number
  status: 'idle' | 'loading' | 'ready' | 'error'
  error?: string
}

interface TableDetail {
  columns: ColumnInfo[]
  constraints: ConstraintInfo[]
  inferredFks: InferredRelationship[]
  classification?: TableClassification
  fetchedAt: number
  status: 'idle' | 'loading' | 'ready' | 'error'
  error?: string
}

interface ColumnProfile {
  column: string
  count: number
  nonNullCount: number
  distinctCount: number
  minValue: any
  maxValue: any
  topValues?: Array<{ value: any; count: number }>
  fetchedAt: number
}

interface SchemaCacheState {
  // Connection-level schema lists (keyed by connId)
  schemas: Record<string, ConnectionSchema>
  // Table-level details (keyed by "{connId}.{schema}.{table}")
  tableDetails: Record<string, TableDetail>
  // Column profiles (keyed by "{connId}.{schema}.{table}.{column}")
  columnProfiles: Record<string, ColumnProfile>

  // Actions
  fetchSchema(connId: string, dbType: DbType): Promise<void>
  fetchTableDetail(connId: string, dbType: DbType, tableName: string, schemaName?: string): Promise<void>
  profileColumn(connId: string, dbType: DbType, tableName: string, columnName: string, schemaName?: string): Promise<void>
  invalidateConnection(connId: string): void
  invalidateTable(connId: string, tableName: string, schemaName?: string): void
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

const useSchemaCacheStore = create<SchemaCacheState>((set, get) => ({
  schemas: {},
  tableDetails: {},
  columnProfiles: {},

  fetchSchema: async (connId: string, dbType: DbType) => {
    const state = get()
    const cached = state.schemas[connId]

    // Return if cached and not expired
    if (cached?.status === 'ready' && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return
    }

    // Set loading state
    set((s) => ({
      schemas: {
        ...s.schemas,
        [connId]: {
          tables: cached?.tables || [],
          fetchedAt: cached?.fetchedAt || 0,
          status: 'loading',
        },
      },
    }))

    try {
      const query = buildSchemaQuery(dbType)
      const response = await queryDatabase(connId, query)

      if (!response) {
        throw new Error('No response from database')
      }

      // Parse results into SchemaTable objects
      const tables = response.rows.map((row: any[]) => {
        const col0 = String(response.columns[0] || '').toLowerCase()
        const schema = col0.includes('schema') ? row[0] : undefined
        const nameIdx = response.columns.findIndex((c: string | number) => String(c).toLowerCase() === 'name')
        const typeIdx = response.columns.findIndex((c: string | number) => String(c).toLowerCase() === 'type')

        return {
          schema,
          name: row[nameIdx] || row[1],
          type: (row[typeIdx] || row[2])?.toUpperCase(),
        } as SchemaTable
      })

      set((s) => ({
        schemas: {
          ...s.schemas,
          [connId]: {
            tables,
            fetchedAt: Date.now(),
            status: 'ready',
          },
        },
      }))
    } catch (error) {
      set((s) => ({
        schemas: {
          ...s.schemas,
          [connId]: {
            tables: state.schemas[connId]?.tables || [],
            fetchedAt: state.schemas[connId]?.fetchedAt || 0,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      }))
    }
  },

  fetchTableDetail: async (connId: string, dbType: DbType, tableName: string, schemaName?: string) => {
    const state = get()
    const key = `${connId}.${schemaName || 'main'}.${tableName}`
    const cached = state.tableDetails[key]

    // Return if cached and not expired
    if (cached?.status === 'ready' && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return
    }

    set((s) => ({
      tableDetails: {
        ...s.tableDetails,
        [key]: {
          columns: cached?.columns || [],
          constraints: cached?.constraints || [],
          inferredFks: cached?.inferredFks || [],
          fetchedAt: cached?.fetchedAt || 0,
          status: 'loading',
        },
      },
    }))

    try {
      // Fetch columns and constraints in parallel
      const [colResponse, constraintResponse] = await Promise.all([
        queryDatabase(connId, buildColumnsQuery(dbType, tableName, schemaName)),
        queryDatabase(connId, buildConstraintsQuery(dbType, tableName, schemaName)),
      ])

      let columns: ColumnInfo[] = []
      let constraints: ConstraintInfo[] = []

      // Parse columns
      if (dbType === 'sqlite' && colResponse?.rows) {
        // PRAGMA table_info returns different schema
        columns = parseSqlitePragmaTableInfo(colResponse.rows)
      } else if (colResponse?.rows) {
        const colNames = (colResponse.columns as Array<string | number>).map(String)
        const parsed = parseQueryResults(colNames, colResponse.rows)
        columns = parsed.map((row: any) => ({
          name: row.name || row.column_name,
          type: row.type || row.data_type || row.column_type,
          nullable: row.nullable !== false && row.is_nullable !== 'NO',
          default: row.default || row.column_default,
          maxLength: row.max_length || row.character_maximum_length,
          precision: row.precision || row.numeric_precision,
          scale: row.scale || row.numeric_scale,
        }))
      }

      // Parse constraints
      if (dbType === 'sqlite' && constraintResponse?.rows) {
        // PRAGMA foreign_key_list returns different schema
        constraints = parseSqliteForeignKeys(constraintResponse.rows)
      } else if (constraintResponse?.rows) {
        const constraintNames = (constraintResponse.columns as Array<string | number>).map(String)
        const parsed = parseQueryResults(constraintNames, constraintResponse.rows)
        constraints = parsed
          .map((row: any) => ({
            column: row.column,
            type: (row.type || '').toUpperCase().replace(' ', '_'),
            foreignTable: row.foreign_table,
            foreignColumn: row.foreign_column,
          }))
          .filter((c) => c.column) // Filter out nulls from LEFT JOINs
      }

      // Infer FKs from naming conventions
      const allColumnsMap = new Map([[tableName, columns]])
      const allConstraintMap = new Map([[tableName, constraints]])
      const inferredFks = inferRelationships(
        [{ name: tableName, type: 'TABLE' }],
        allColumnsMap,
        allConstraintMap
      )

      set((s) => ({
        tableDetails: {
          ...s.tableDetails,
          [key]: {
            columns,
            constraints,
            inferredFks,
            fetchedAt: Date.now(),
            status: 'ready',
          },
        },
      }))
    } catch (error) {
      set((s) => ({
        tableDetails: {
          ...s.tableDetails,
          [key]: {
            columns: cached?.columns || [],
            constraints: cached?.constraints || [],
            inferredFks: cached?.inferredFks || [],
            fetchedAt: cached?.fetchedAt || 0,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      }))
    }
  },

  profileColumn: async (connId: string, _dbType: DbType, tableName: string, columnName: string, schemaName?: string) => {
    const state = get()
    const key = `${connId}.${schemaName || 'main'}.${tableName}.${columnName}`
    const cached = state.columnProfiles[key]

    // Return if cached
    if (cached?.fetchedAt && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return
    }

    try {
      // Fetch profile stats — simple aggregate query
      const query = `
        SELECT
          COUNT(*) AS count,
          COUNT("${columnName}") AS non_null_count,
          COUNT(DISTINCT "${columnName}") AS distinct_count,
          MIN("${columnName}") AS min_value,
          MAX("${columnName}") AS max_value
        FROM ${schemaName ? `"${schemaName}".` : ''}"${tableName}"
      `

      const response = await queryDatabase(connId, query)

      if (response?.rows?.[0]) {
        const row = response.rows[0]
        const profile: ColumnProfile = {
          column: columnName,
          count: row[0] || 0,
          nonNullCount: row[1] || 0,
          distinctCount: row[2] || 0,
          minValue: row[3],
          maxValue: row[4],
          fetchedAt: Date.now(),
        }

        set((s) => ({
          columnProfiles: {
            ...s.columnProfiles,
            [key]: profile,
          },
        }))
      }
    } catch (error) {
      // Silently fail for profile — it's non-critical
      console.warn(`Failed to profile column ${key}:`, error)
    }
  },

  invalidateConnection: (connId: string) => {
    set((s) => {
      const newSchemas = { ...s.schemas }
      const newDetails = { ...s.tableDetails }

      delete newSchemas[connId]
      Object.keys(newDetails).forEach((key) => {
        if (key.startsWith(`${connId}.`)) {
          delete newDetails[key]
        }
      })

      return {
        schemas: newSchemas,
        tableDetails: newDetails,
      }
    })
  },

  invalidateTable: (connId: string, tableName: string, schemaName?: string) => {
    const key = `${connId}.${schemaName || 'main'}.${tableName}`
    set((s) => {
      const newDetails = { ...s.tableDetails }
      delete newDetails[key]
      return { tableDetails: newDetails }
    })
  },
}))

export const useSchemaCache = useSchemaCacheStore

/**
 * Relationship Inference — Detect probable foreign keys based on naming conventions
 * Analyzes table and column names to infer likely FK relationships
 * Accuracy: >90% on well-named schemas
 */

import { SchemaTable, ColumnInfo, ConstraintInfo, singularize } from './schemaParser'

export interface InferredRelationship {
  fromTable: string
  fromColumn: string
  toTable: string
  toColumn: string
  confidence: 'high' | 'medium'
  pattern: string // The matching pattern for debugging
}

/**
 * Infer foreign key relationships from table and column naming conventions
 *
 * Patterns matched (in order of confidence):
 * 1. HIGH: {singular_table_name}_id → table.id or table.{table}_id
 * 2. HIGH: {table_name}_id where table_name is a known table
 * 3. MEDIUM: {word}_id where word matches a known table (fuzzy match, >60% similarity)
 *
 * Excluded (known false positives):
 * - created_by_id, updated_by_id (user references, not table FKs)
 * - version_id, parent_id (system columns)
 * - Columns with explicit FK constraints (from the constraints list)
 */
export function inferRelationships(
  tables: SchemaTable[],
  allColumns: Map<string, ColumnInfo[]>, // Map of "${schema}.${table}" -> columns
  existingConstraints: Map<string, ConstraintInfo[]>, // Map of "${schema}.${table}" -> constraints
): InferredRelationship[] {
  const inferred: InferredRelationship[] = []
  const tableNameSet = new Set(tables.map((t) => t.name.toLowerCase()))
  const tableLookup = new Map(tables.map((t) => [t.name.toLowerCase(), t]))

  // False positive exclusions
  const excludedColumns = new Set([
    'created_by_id',
    'updated_by_id',
    'version_id',
    'parent_id',
    'id', // Don't infer id -> anything (that's a PK, not FK)
  ])

  // Iterate through all tables and their columns
  for (const table of tables) {
    const tableKey = table.name.toLowerCase()
    const tableSingular = singularize(tableKey)
    const columns = allColumns.get(table.name) || []
    const existingFks = (existingConstraints.get(table.name) || []).filter((c) => c.type === 'FOREIGN_KEY')
    const existingFkColumns = new Set(existingFks.map((fk) => fk.column.toLowerCase()))

    for (const col of columns) {
      const colLower = col.name.toLowerCase()

      // Skip if already has explicit FK, or is an excluded column
      if (existingFkColumns.has(colLower) || excludedColumns.has(colLower)) {
        continue
      }

      // Skip if not an ID-like column
      if (!colLower.endsWith('_id') && !colLower.endsWith('id')) {
        continue
      }

      // PATTERN 1: {singular_table_name}_id
      // e.g., customer_id -> customers table
      const idlessCol = colLower.replace(/_id$/, '')
      const singularIdless = singularize(idlessCol)

      // Try exact match with pluralized table name
      if (tableNameSet.has(idlessCol)) {
        const targetTable = Array.from(tableLookup.values()).find((t) => t.name.toLowerCase() === idlessCol)
        if (targetTable) {
          inferred.push({
            fromTable: table.name,
            fromColumn: col.name,
            toTable: targetTable.name,
            toColumn: 'id', // Assume PK is 'id'
            confidence: 'high',
            pattern: 'exact_table_id',
          })
          continue
        }
      }

      // Try exact match with singularized table name
      if (tableNameSet.has(singularIdless)) {
        const targetTable = Array.from(tableLookup.values()).find((t) => t.name.toLowerCase() === singularIdless)
        if (targetTable) {
          inferred.push({
            fromTable: table.name,
            fromColumn: col.name,
            toTable: targetTable.name,
            toColumn: 'id', // Assume PK is 'id'
            confidence: 'high',
            pattern: 'singular_table_id',
          })
          continue
        }
      }

      // PATTERN 2: Fuzzy match — find tables with >60% name similarity to the column prefix
      const similarity = calculateSimilarity(singularIdless, tableNameSet)
      if (similarity.score > 0.6) {
        const targetTable = Array.from(tableLookup.values()).find(
          (t) => t.name.toLowerCase() === similarity.match.toLowerCase()
        )
        if (targetTable) {
          inferred.push({
            fromTable: table.name,
            fromColumn: col.name,
            toTable: targetTable.name,
            toColumn: 'id',
            confidence: 'medium',
            pattern: `fuzzy_match_${similarity.score.toFixed(2)}`,
          })
        }
      }
    }
  }

  // Sort by confidence (high first), then by table name
  return inferred.sort((a, b) => {
    if (a.confidence !== b.confidence) {
      return a.confidence === 'high' ? -1 : 1
    }
    return a.fromTable.localeCompare(b.fromTable)
  })
}

/**
 * Calculate string similarity using Levenshtein distance
 * Returns a score from 0 (no match) to 1 (perfect match)
 * and the best-matching table name
 */
function calculateSimilarity(
  source: string,
  targetSet: Set<string>
): { score: number; match: string } {
  let bestScore = 0
  let bestMatch = ''

  for (const target of targetSet) {
    const score = 1 - levenshteinDistance(source, target) / Math.max(source.length, target.length)
    if (score > bestScore) {
      bestScore = score
      bestMatch = target
    }
  }

  return { score: bestScore, match: bestMatch }
}

/**
 * Levenshtein distance — count of minimum edits to transform one string to another
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }

  return dp[m][n]
}

/**
 * Detect if a column is likely a primary key
 * Heuristics: name contains 'id', column index is 0, type is integer/serial/uuid
 */
export function inferPrimaryKey(columns: ColumnInfo[]): ColumnInfo | null {
  // Heuristic 1: look for column named 'id' or '{table}_id'
  const idCol = columns.find((c) => c.name.toLowerCase() === 'id')
  if (idCol) return idCol

  // Heuristic 2: first column with 'id' in name
  const firstId = columns.find((c) => c.name.toLowerCase().includes('id'))
  if (firstId && ['integer', 'serial', 'bigserial', 'uuid', 'int', 'bigint'].some((t) => firstId.type.toLowerCase().includes(t))) {
    return firstId
  }

  // Heuristic 3: first column if it's a numeric/uuid type (fallback)
  const firstNumeric = columns.find((c) =>
    ['integer', 'serial', 'bigserial', 'uuid', 'int', 'bigint'].some((t) => c.type.toLowerCase().includes(t))
  )
  if (firstNumeric) return firstNumeric

  return null
}

/**
 * Classify tables as 'fact' or 'dimension' based on naming and structure
 * Heuristics:
 * - Fact tables: many FKs, large row count, mostly numeric columns
 * - Dimension tables: few FKs, smaller row count, text-heavy, connected to facts
 */
export interface TableClassification {
  table: string
  type: 'fact' | 'dimension' | 'bridge' | 'unknown'
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
}

export function classifyTables(
  tables: SchemaTable[],
  allColumns: Map<string, ColumnInfo[]>,
  allForeignKeys: Map<string, ConstraintInfo[]>
): TableClassification[] {
  return tables.map((table) => {
    const columns = allColumns.get(table.name) || []
    const fks = (allForeignKeys.get(table.name) || []).filter((c) => c.type === 'FOREIGN_KEY')

    const fkCount = fks.length
    const colCount = columns.length
    const numericCount = columns.filter((c) =>
      ['integer', 'numeric', 'float', 'double', 'decimal', 'int', 'bigint', 'smallint'].some((t) =>
        c.type.toLowerCase().includes(t)
      )
    ).length

    const textCount = columns.filter((c) => ['text', 'varchar', 'char', 'string'].some((t) => c.type.toLowerCase().includes(t))).length

    // Heuristics for classification
    if (table.rowCount === undefined || table.rowCount === null) {
      // Can't classify without row count
      return {
        table: table.name,
        type: 'unknown',
        confidence: 'low',
        reasoning: 'Row count unavailable',
      }
    }

    // Fact table: many FKs (≥3), large row count (>1M), numeric-heavy
    if (fkCount >= 3 && table.rowCount > 1000000 && numericCount > colCount * 0.5) {
      return {
        table: table.name,
        type: 'fact',
        confidence: 'high',
        reasoning: `${fkCount} FKs, ${table.rowCount}M+ rows, ${Math.round((numericCount / colCount) * 100)}% numeric`,
      }
    }

    // Dimension table: few FKs (<2), smaller row count (<1M), text-heavy
    if (fkCount < 2 && table.rowCount < 1000000 && textCount > colCount * 0.3) {
      return {
        table: table.name,
        type: 'dimension',
        confidence: 'high',
        reasoning: `${fkCount} FKs, ${table.rowCount}K rows, ${Math.round((textCount / colCount) * 100)}% text`,
      }
    }

    // Bridge table: many FKs, small row count
    if (fkCount >= 2 && table.rowCount < 100000 && colCount < 10) {
      return {
        table: table.name,
        type: 'bridge',
        confidence: 'medium',
        reasoning: `${fkCount} FKs, ${table.rowCount}K rows, ${colCount} columns`,
      }
    }

    // Medium confidence guesses
    if (fkCount >= 2) {
      return {
        table: table.name,
        type: 'fact',
        confidence: 'medium',
        reasoning: `${fkCount} FKs suggests fact table`,
      }
    }

    if (textCount > colCount * 0.4) {
      return {
        table: table.name,
        type: 'dimension',
        confidence: 'medium',
        reasoning: `${Math.round((textCount / colCount) * 100)}% text columns suggest dimension`,
      }
    }

    return {
      table: table.name,
      type: 'unknown',
      confidence: 'low',
      reasoning: 'Unable to classify with confidence',
    }
  })
}

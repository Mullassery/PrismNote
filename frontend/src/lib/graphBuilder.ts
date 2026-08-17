/**
 * Graph Builder — Convert schema + relationship data into cytoscape.js elements
 * for `RelationshipMap.tsx`.
 *
 * Reuses the existing schema/relationship types instead of inventing parallel
 * ones: table shapes come from `./schemaParser`, FK inference results from
 * `./relationshipInference`. Table "fact / dimension / bridge" classification
 * is computed here via `classifyTables` (previously unused anywhere in the
 * app) so the cytoscape stylesheet's `node[classification=...]` selectors in
 * `RelationshipMap.tsx` actually have real data behind them.
 */

import type { SchemaTable, ColumnInfo, ConstraintInfo } from './schemaParser'
import type { InferredRelationship, TableClassification } from './relationshipInference'
import { classifyTables } from './relationshipInference'

/** Per-table detail as cached by `useSchemaCache` (only the fields we need). */
export interface GraphTableDetail {
  columns: ColumnInfo[]
  constraints: ConstraintInfo[]
  inferredFks?: InferredRelationship[]
  classification?: TableClassification
}

export interface BuildRelationshipGraphInput {
  connId: string
  tables: SchemaTable[]
  /** Keyed by `${connId}.${schema||'main'}.${table}`, as produced by `useSchemaCache`. */
  tableDetails: Record<string, GraphTableDetail | undefined>
  /** Naming-convention-inferred FKs across all tables in this schema. */
  inferredFks: InferredRelationship[]
}

export interface CytoscapeNodeData {
  id: string
  label: string
  classification: TableClassification['type']
}

export interface CytoscapeNode {
  data: CytoscapeNodeData
}

export interface CytoscapeEdgeData {
  id: string
  source: string
  target: string
  label: string
  joinPredicate: string
  cardinality: string
  type: 'explicit' | 'inferred'
  confidence?: 'high' | 'medium'
}

export interface CytoscapeEdge {
  data: CytoscapeEdgeData
}

export interface RelationshipGraph {
  nodes: CytoscapeNode[]
  edges: CytoscapeEdge[]
  metadata: {
    tableCount: number
    relationshipCount: number
  }
}

/**
 * Build cytoscape-ready nodes/edges from schema tables, their column/constraint
 * details, and inferred (naming-convention) foreign keys.
 */
export function buildRelationshipGraph(input: BuildRelationshipGraphInput): RelationshipGraph {
  const { connId, tables, tableDetails, inferredFks } = input

  const detailKey = (table: SchemaTable) => `${connId}.${table.schema || 'main'}.${table.name}`

  // Gather per-table columns/constraints so we can classify tables (fact /
  // dimension / bridge) using the same heuristics as relationshipInference.ts.
  const allColumns = new Map<string, ColumnInfo[]>()
  const allConstraints = new Map<string, ConstraintInfo[]>()
  for (const table of tables) {
    const detail = tableDetails[detailKey(table)]
    allColumns.set(table.name, detail?.columns || [])
    allConstraints.set(table.name, detail?.constraints || [])
  }

  const classifications = classifyTables(tables, allColumns, allConstraints)
  const classificationByTable = new Map(classifications.map((c) => [c.table, c.type]))

  const nodeIds = new Set(tables.map((t) => t.name))

  const nodes: CytoscapeNode[] = tables.map((table) => ({
    data: {
      id: table.name,
      label: table.name,
      classification: classificationByTable.get(table.name) || 'unknown',
    },
  }))

  const edges: CytoscapeEdge[] = []
  const seenEdgeKeys = new Set<string>()

  // Explicit FKs, sourced from real database constraints.
  for (const table of tables) {
    const detail = tableDetails[detailKey(table)]
    const fks = (detail?.constraints || []).filter(
      (c): c is ConstraintInfo & { foreignTable: string } =>
        c.type === 'FOREIGN_KEY' && !!c.foreignTable,
    )

    for (const fk of fks) {
      if (!nodeIds.has(table.name) || !nodeIds.has(fk.foreignTable)) continue

      const edgeKey = `explicit:${table.name}.${fk.column}->${fk.foreignTable}`
      if (seenEdgeKeys.has(edgeKey)) continue
      seenEdgeKeys.add(edgeKey)

      // A FK column that's also unique/PK on this side implies a 1:1 relationship;
      // otherwise it's the typical many-to-one shape.
      const isUniqueOnThisSide = (detail?.constraints || []).some(
        (c) => c.column === fk.column && (c.type === 'UNIQUE' || c.type === 'PRIMARY_KEY'),
      )
      const cardinality = isUniqueOnThisSide ? '1:1' : 'N:1'
      const foreignColumn = fk.foreignColumn || 'id'

      edges.push({
        data: {
          id: `e-${edgeKey}`,
          source: table.name,
          target: fk.foreignTable,
          label: cardinality,
          joinPredicate: `${table.name}.${fk.column} = ${fk.foreignTable}.${foreignColumn}`,
          cardinality,
          type: 'explicit',
        },
      })
    }
  }

  // Naming-convention-inferred FKs, only for tables that are actually in this graph.
  for (const rel of inferredFks) {
    if (!nodeIds.has(rel.fromTable) || !nodeIds.has(rel.toTable)) continue

    const edgeKey = `inferred:${rel.fromTable}.${rel.fromColumn}->${rel.toTable}`
    if (seenEdgeKeys.has(edgeKey)) continue
    seenEdgeKeys.add(edgeKey)

    edges.push({
      data: {
        id: `e-${edgeKey}`,
        source: rel.fromTable,
        target: rel.toTable,
        label: 'N:1?',
        joinPredicate: `${rel.fromTable}.${rel.fromColumn} = ${rel.toTable}.${rel.toColumn}`,
        cardinality: 'N:1',
        type: 'inferred',
        confidence: rel.confidence,
      },
    })
  }

  return {
    nodes,
    edges,
    metadata: {
      tableCount: nodes.length,
      relationshipCount: edges.length,
    },
  }
}

import { describe, expect, it } from 'vitest'
import { buildRelationshipGraph, type GraphTableDetail } from '../lib/graphBuilder'
import type { SchemaTable } from '../lib/schemaParser'
import type { InferredRelationship } from '../lib/relationshipInference'

const tables: SchemaTable[] = [
  { name: 'customers', type: 'TABLE' },
  { name: 'orders', type: 'TABLE' },
  { name: 'order_items', type: 'TABLE' },
]

const details: Record<string, GraphTableDetail> = {
  'conn.main.customers': {
    columns: [
      { name: 'id', type: 'integer', nullable: false },
      { name: 'email', type: 'text', nullable: false },
    ],
    constraints: [{ column: 'id', type: 'PRIMARY_KEY' }],
  },
  'conn.main.orders': {
    columns: [
      { name: 'id', type: 'integer', nullable: false },
      { name: 'customer_id', type: 'integer', nullable: false },
    ],
    constraints: [
      { column: 'id', type: 'PRIMARY_KEY' },
      {
        column: 'customer_id',
        type: 'FOREIGN_KEY',
        foreignTable: 'customers',
        foreignColumn: 'id',
      },
    ],
  },
  'conn.main.order_items': {
    columns: [
      { name: 'id', type: 'integer', nullable: false },
      { name: 'order_id', type: 'integer', nullable: false },
      { name: 'product_id', type: 'integer', nullable: false },
    ],
    constraints: [
      { column: 'id', type: 'PRIMARY_KEY' },
      {
        column: 'order_id',
        type: 'FOREIGN_KEY',
        foreignTable: 'orders',
        foreignColumn: 'id',
      },
    ],
  },
}

const inferred: InferredRelationship[] = [
  {
    fromTable: 'order_items',
    fromColumn: 'product_id',
    toTable: 'products',
    toColumn: 'id',
    confidence: 'medium',
    pattern: 'products_id',
  },
]

describe('buildRelationshipGraph', () => {
  it('creates one node per table with its classification', () => {
    const graph = buildRelationshipGraph({
      connId: 'conn',
      tables,
      tableDetails: details,
      inferredFks: [],
    })

    expect(graph.nodes.map((n) => n.data.id)).toEqual(['customers', 'orders', 'order_items'])
    expect(graph.metadata).toEqual({ tableCount: 3, relationshipCount: 2 })
    for (const node of graph.nodes) {
      expect(node.data.label).toBe(node.data.id)
      expect(['fact', 'dimension', 'bridge', 'unknown']).toContain(node.data.classification)
    }
  })

  it('turns explicit foreign keys into edges with join predicates', () => {
    const graph = buildRelationshipGraph({
      connId: 'conn',
      tables,
      tableDetails: details,
      inferredFks: [],
    })

    const explicit = graph.edges.filter((e) => e.data.type === 'explicit')
    expect(explicit).toHaveLength(2)
    expect(explicit.map((e) => e.data.joinPredicate)).toContain(
      'orders.customer_id = customers.id',
    )
    expect(explicit.map((e) => e.data.joinPredicate)).toContain(
      'order_items.order_id = orders.id',
    )
  })

  it('marks a unique foreign-key column as 1:1 instead of N:1', () => {
    const graph = buildRelationshipGraph({
      connId: 'conn',
      tables,
      tableDetails: {
        ...details,
        'conn.main.orders': {
          ...details['conn.main.orders'],
          constraints: [
            ...details['conn.main.orders'].constraints,
            { column: 'customer_id', type: 'UNIQUE' },
          ],
        },
      },
      inferredFks: [],
    })

    const edge = graph.edges.find(
      (e) => e.data.source === 'orders' && e.data.target === 'customers',
    )
    expect(edge?.data.cardinality).toBe('1:1')
  })

  it('drops inferred relationships whose target table is not in the graph', () => {
    const graph = buildRelationshipGraph({
      connId: 'conn',
      tables,
      tableDetails: details,
      inferredFks: inferred,
    })

    expect(graph.edges.some((e) => e.data.target === 'products')).toBe(false)
    expect(graph.metadata.relationshipCount).toBe(2)
  })

  it('includes inferred relationships between tables in the graph', () => {
    const graph = buildRelationshipGraph({
      connId: 'conn',
      tables,
      tableDetails: details,
      inferredFks: [
        {
          fromTable: 'order_items',
          fromColumn: 'order_id',
          toTable: 'orders',
          toColumn: 'id',
          confidence: 'high',
          pattern: 'orders_id',
        },
      ],
    })

    const edge = graph.edges.find((e) => e.data.type === 'inferred')
    expect(edge?.data).toMatchObject({
      source: 'order_items',
      target: 'orders',
      cardinality: 'N:1',
      confidence: 'high',
    })
  })

  it('deduplicates explicit foreign keys that repeat on the same column', () => {
    const repeated: GraphTableDetail = {
      ...details['conn.main.orders'],
      constraints: [
        ...details['conn.main.orders'].constraints,
        {
          column: 'customer_id',
          type: 'FOREIGN_KEY',
          foreignTable: 'customers',
          foreignColumn: 'id',
        },
      ],
    }

    const graph = buildRelationshipGraph({
      connId: 'conn',
      tables,
      tableDetails: { ...details, 'conn.main.orders': repeated },
      inferredFks: [],
    })

    expect(graph.edges.filter((e) => e.data.source === 'orders')).toHaveLength(1)
  })
})

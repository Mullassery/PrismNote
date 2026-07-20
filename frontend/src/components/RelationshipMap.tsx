/**
 * RelationshipMap — Interactive ER diagram visualization
 * Displays tables as nodes, relationships as edges
 * Uses cytoscape.js for graph rendering and interactions
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { X, AlertCircle, Loader2, HelpCircle } from 'lucide-react'
import cytoscape from 'cytoscape'
import type { Core, EventObject } from 'cytoscape'
import coseLayout from 'cytoscape-cose-bilkent'
import dagreLayout from 'cytoscape-dagre'
import { useSchemaCache } from '../hooks/useSchemaCache'
import { buildRelationshipGraph, type CytoscapeEdge, type RelationshipGraph } from '../lib/graphBuilder'
import LayoutControls, { type LayoutMode } from './LayoutControls'
import LegendPanel from './LegendPanel'

// Register layout algorithms
cytoscape.use(coseLayout)
cytoscape.use(dagreLayout)

interface RelationshipMapProps {
  connId: string
  schemaName?: string
  dbType?: string
  onTableClick?: (tableName: string) => void
  onClose: () => void
}

interface EdgeDetail {
  from: string
  to: string
  joinPredicate: string
  cardinality: string
  type: 'explicit' | 'inferred'
  confidence?: 'high' | 'medium'
}

export default function RelationshipMap({
  connId,
  schemaName,
  dbType: _dbType,
  onTableClick,
  onClose,
}: RelationshipMapProps) {
  const schemaCache = useSchemaCache()
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)

  const [layoutMode, setLayoutMode] = useState<LayoutMode>('force-directed')
  const [selectedEdge, setSelectedEdge] = useState<EdgeDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLegend, setShowLegend] = useState(false)

  // Build graph from schema data
  const graph = useMemo(() => {
    if (!schemaCache.schemas[connId]) return null

    const schema = schemaCache.schemas[connId]
    if (schema.status !== 'ready') return null

    const tables = schema.tables.filter((t) => !schemaName || t.schema === schemaName)

    // Collect table details
    const tableDetails: Record<string, any> = {}
    for (const table of tables) {
      const key = `${connId}.${table.schema || 'main'}.${table.name}`
      tableDetails[key] = schemaCache.tableDetails[key]
    }

    // Collect inferred FKs (from first table's details)
    const inferredFks: any[] = []
    for (const table of tables) {
      const key = `${connId}.${table.schema || 'main'}.${table.name}`
      const detail = tableDetails[key]
      if (detail?.inferredFks) {
        inferredFks.push(...detail.inferredFks)
      }
    }

    try {
      return buildRelationshipGraph({
        connId,
        tables,
        tableDetails,
        inferredFks,
      })
    } catch (err) {
      console.error('Failed to build graph:', err)
      return null
    }
  }, [schemaCache, connId, schemaName])

  // Initialize cytoscape instance
  useEffect(() => {
    if (!containerRef.current || !graph) return

    try {
      setLoading(true)
      setError(null)

      // Create cytoscape instance
      const cy = cytoscape({
        container: containerRef.current,
        elements: [...graph.nodes, ...graph.edges],
        style: getCytoscapeStyle(),
        layout: { name: 'null' }, // Start with no layout, apply after creation
        wheelSensitivity: 0.1,
        maxZoom: 5,
        minZoom: 0.2,
      })

      cyRef.current = cy

      // Apply initial layout
      applyLayout(cy, layoutMode)

      // Event handlers
      cy.on('tap', 'node', handleNodeClick)
      cy.on('tap', 'edge', handleEdgeClick)
      cy.on('tap', handleBackgroundClick)

      setLoading(false)
    } catch (err) {
      console.error('Cytoscape init error:', err)
      setError(err instanceof Error ? err.message : 'Failed to initialize graph')
      setLoading(false)
    }

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy()
        cyRef.current = null
      }
    }
  }, [graph])

  // Layout change handler
  useEffect(() => {
    if (cyRef.current) {
      applyLayout(cyRef.current, layoutMode)
    }
  }, [layoutMode])

  const handleNodeClick = (evt: EventObject) => {
    const node = evt.target
    const isSelected = node.selected()

    // Clear previous selection
    if (cyRef.current) {
      cyRef.current.$(':selected').unselect()
      cyRef.current.$('.highlighted').removeClass('highlighted')
    }

    if (!isSelected) {
      // Select this node
      node.select()

      // Highlight neighbors
      const neighborhood = node.closedNeighborhood()
      neighborhood.addClass('highlighted')

      // Callback
      onTableClick?.(node.data('label'))
    }

    setSelectedEdge(null)
  }

  const handleEdgeClick = (evt: EventObject) => {
    const edge = evt.target as any
    const edgeData = edge.data() as CytoscapeEdge['data']

    setSelectedEdge({
      from: cyRef.current?.getElementById(edgeData.source).data('label') || edgeData.source,
      to: cyRef.current?.getElementById(edgeData.target).data('label') || edgeData.target,
      joinPredicate: edgeData.joinPredicate,
      cardinality: edgeData.cardinality,
      type: edgeData.type,
      confidence: edgeData.confidence,
    })
  }

  const handleBackgroundClick = (evt: EventObject) => {
    if (evt.target === cyRef.current) {
      if (cyRef.current) {
        cyRef.current.$(':selected').unselect()
        cyRef.current.$('.highlighted').removeClass('highlighted')
      }
      setSelectedEdge(null)
    }
  }

  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.2)
    }
  }

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() / 1.2)
    }
  }

  const handleFitView = () => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 50)
    }
  }

  const handleExport = () => {
    if (cyRef.current) {
      const png = cyRef.current.png({
        full: true,
        maxWidth: 4000,
        maxHeight: 4000,
      })

      const link = document.createElement('a')
      link.href = png
      link.download = `schema-${connId}-${schemaName || 'all'}-${Date.now()}.png`
      link.click()
    }
  }

  if (!schemaCache.schemas[connId]) {
    return (
      <div className="w-96 shrink-0 flex flex-col pn-surface border-l pn-bd overflow-hidden">
        <div className="h-10 flex items-center justify-between px-4 border-b pn-bd">
          <span className="text-sm font-semibold pn-text">Relationship Map</span>
          <button onClick={onClose} className="p-1 pn-hover rounded hover:bg-red-500/10">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center pn-muted">
            <AlertCircle size={32} className="mx-auto mb-2" />
            <p className="text-sm">No database connection</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col pn-surface border-l pn-bd overflow-hidden">
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-4 border-b pn-bd shrink-0">
        <div>
          <div className="text-sm font-semibold pn-text">Relationship Map</div>
          <div className="text-xs pn-faint">{schemaName || 'All tables'}</div>
        </div>
        <button onClick={onClose} className="p-1 pn-hover rounded hover:bg-red-500/10">
          <X size={16} />
        </button>
      </div>

      {/* Controls */}
      <LayoutControls
        mode={layoutMode}
        onModeChange={setLayoutMode}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        onExport={handleExport}
        nodeCount={graph?.metadata.tableCount}
        edgeCount={graph?.metadata.relationshipCount}
      />

      {/* Canvas */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={24} className="animate-spin text-white" />
              <span className="text-sm text-white">Building graph...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-red-900/50">
            <div className="text-center text-white">
              <AlertCircle size={32} className="mx-auto mb-2" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Legend Button */}
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="absolute top-4 left-4 z-20 p-2 rounded-full pn-surface border pn-bd hover:bg-pn-hover transition"
          title="Show legend"
        >
          <HelpCircle size={18} className="text-blue-400" />
        </button>

        {/* Legend Panel */}
        {showLegend && <LegendPanel onClose={() => setShowLegend(false)} />}

        <div ref={containerRef} className="flex-1" />
      </div>

      {/* Edge detail panel */}
      {selectedEdge && (
        <div className="h-auto p-3 border-t pn-bd bg-pn-hover/50">
          <div className="space-y-2 text-xs">
            <div className="font-semibold pn-text">
              {selectedEdge.from} → {selectedEdge.to}
            </div>

            <div className="flex justify-between">
              <span className="pn-muted">Relationship:</span>
              <span className="font-mono text-[11px]">{selectedEdge.joinPredicate}</span>
            </div>

            <div className="flex justify-between">
              <span className="pn-muted">Cardinality:</span>
              <span className="font-semibold">{selectedEdge.cardinality}</span>
            </div>

            <div className="flex justify-between">
              <span className="pn-muted">Type:</span>
              <span
                className={selectedEdge.type === 'explicit' ? 'text-green-400' : 'text-yellow-400'}
              >
                {selectedEdge.type === 'explicit' ? '🔗 Explicit' : '🔹 Inferred'}
              </span>
            </div>

            {selectedEdge.confidence && (
              <div className="flex justify-between">
                <span className="pn-muted">Confidence:</span>
                <span className="capitalize">{selectedEdge.confidence}</span>
              </div>
            )}

            <button
              onClick={() => setSelectedEdge(null)}
              className="mt-2 w-full px-2 py-1 rounded text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Get cytoscape stylesheet (node/edge styling)
 */
function getCytoscapeStyle(): any[] {
  return [
    {
      selector: 'node',
      style: {
        'background-color': '#4b5563',
        'background-opacity': 0.8,
        'border-width': 2,
        'border-color': '#6b7280',
        label: 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'color': '#f1f5f9',
        'font-size': 12,
        'font-weight': 'bold',
        'min-zoomed-font-size': 6,
        'text-overflow': 'ellipsis',
        width: 60,
        height: 60,
        'text-wrap': 'wrap',
      },
    },
    {
      selector: 'node[classification="fact"]',
      style: {
        'background-color': '#f97316',
      },
    },
    {
      selector: 'node[classification="dimension"]',
      style: {
        'background-color': '#3b82f6',
      },
    },
    {
      selector: 'node[classification="bridge"]',
      style: {
        'background-color': '#a855f7',
      },
    },
    {
      selector: 'node:selected',
      style: {
        'border-color': '#60a5fa',
        'border-width': 3,
        'box-shadow': '0 0 10px #60a5fa',
      },
    },
    {
      selector: 'node.highlighted',
      style: {
        'background-color': '#fbbf24',
        opacity: 1,
      },
    },
    {
      selector: 'edge',
      style: {
        'curve-style': 'straight',
        'target-arrow-shape': 'triangle',
        'target-arrow-color': '#9ca3af',
        'line-color': '#9ca3af',
        'line-style': 'solid',
        width: 2,
        label: 'data(label)',
        'text-background-color': '#1f2937',
        'text-background-opacity': 0.9,
        'text-background-padding': '2px',
        'color': '#f1f5f9',
        'font-size': 10,
      },
    },
    {
      selector: 'edge[type="inferred"]',
      style: {
        'line-style': 'dashed',
        'line-color': '#fbbf24',
        'target-arrow-color': '#fbbf24',
      },
    },
    {
      selector: 'edge:selected',
      style: {
        'line-color': '#60a5fa',
        'target-arrow-color': '#60a5fa',
        width: 3,
      },
    },
  ]
}

/**
 * Apply layout algorithm
 */
function applyLayout(cy: Core, mode: LayoutMode): void {
  const layoutOptions: any = {
    'force-directed': {
      name: 'cose',
      directed: true,
      avoidOverlap: true,
      nodeSpacing: 10,
      edgeLengthVal: 80,
      animate: true,
      animationDuration: 500,
      randomize: false,
    },
    hierarchical: {
      name: 'dagre',
      rankDir: 'TB',
      align: 'DL',
      spacingFactor: 1.5,
      animate: true,
      animationDuration: 500,
    },
    circular: {
      name: 'circle',
      avoidOverlap: true,
      animate: true,
      animationDuration: 500,
    },
    grid: {
      name: 'grid',
      avoidOverlap: true,
      animate: true,
      animationDuration: 500,
    },
  }

  cy.layout(layoutOptions[mode]).run()
}

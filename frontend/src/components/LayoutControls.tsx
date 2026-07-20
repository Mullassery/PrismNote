/**
 * LayoutControls — Toolbar for relationship map interactions
 * Layout selection, zoom controls, export
 */

import { ZoomIn, ZoomOut, Maximize2, Download, Minimize2 } from 'lucide-react'

export type LayoutMode = 'force-directed' | 'hierarchical' | 'circular' | 'grid'

interface LayoutControlsProps {
  mode: LayoutMode
  onModeChange: (mode: LayoutMode) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFitView: () => void
  onExport: () => void
  nodeCount?: number
  edgeCount?: number
}

const layoutModes: Array<{ id: LayoutMode; label: string; description: string }> = [
  { id: 'force-directed', label: 'Force-Directed', description: 'Organic layout with physics simulation' },
  { id: 'hierarchical', label: 'Hierarchical', description: 'Tree layout (facts at top, dimensions below)' },
  { id: 'circular', label: 'Circular', description: 'Nodes arranged in circle' },
  { id: 'grid', label: 'Grid', description: 'Compact 2D grid layout' },
]

export default function LayoutControls(props: LayoutControlsProps) {
  const { mode, onModeChange, onZoomIn, onZoomOut, onFitView, onExport, nodeCount = 0, edgeCount = 0 } =
    props

  return (
    <div className="flex items-center gap-2 px-3 py-2 pn-surface border pn-bd rounded-lg shrink-0">
      {/* Layout selector */}
      <div className="flex items-center gap-2 border-r pn-bd pr-2">
        <span className="text-xs pn-muted uppercase font-semibold">Layout</span>
        <select
          value={mode}
          onChange={(e) => onModeChange(e.target.value as LayoutMode)}
          className="bg-pn-hover text-pn-text text-xs rounded px-2 py-1 outline-none hover:bg-pn-hover/80 transition"
        >
          {layoutModes.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-1 border-r pn-bd pr-2">
        <button
          onClick={onZoomIn}
          className="p-1 rounded pn-hover hover:bg-pn-hover transition"
          title="Zoom in"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={onZoomOut}
          className="p-1 rounded pn-hover hover:bg-pn-hover transition"
          title="Zoom out"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={onFitView}
          className="p-1 rounded pn-hover hover:bg-pn-hover transition"
          title="Fit all nodes in view"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs pn-muted border-r pn-bd pr-2">
        <span>{nodeCount} tables</span>
        <span>{edgeCount} relationships</span>
      </div>

      {/* Export */}
      <button
        onClick={onExport}
        className="ml-auto flex items-center gap-1 px-2 py-1 text-xs rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition"
        title="Export as PNG"
      >
        <Download size={14} />
        Export
      </button>
    </div>
  )
}

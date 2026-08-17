/**
 * Multi-Terminal Split Container
 * Supports vertical/horizontal splits with independent terminal panes
 * Useful for ROS workflows (publishers, listeners, monitoring)
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import type { JSX } from 'react'
import { Plus, Trash2, Code2, Split } from 'lucide-react'
import TerminalPane from './TerminalPane'

export interface TerminalConfig {
  id: string
  type: 'pane' | 'split'
  direction?: 'vertical' | 'horizontal'
  size?: number // percentage (0-100)
  children?: TerminalConfig[]
  history?: { cmd: string; out: string }[]
}

interface TerminalSplitContainerProps {
  config: TerminalConfig
  onConfigChange: (config: TerminalConfig) => void
  fontSize: number
}

const generateId = () => Math.random().toString(36).substr(2, 9)

export default function TerminalSplitContainer({
  config,
  onConfigChange,
  fontSize,
}: TerminalSplitContainerProps) {
  const [dragging, setDragging] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleSplit = (paneId: string, direction: 'vertical' | 'horizontal') => {
    const newConfig = splitPane(config, paneId, direction)
    onConfigChange(newConfig)
  }

  const handleClose = (paneId: string) => {
    const newConfig = closePane(config, paneId)
    if (newConfig) {
      onConfigChange(newConfig)
    }
  }

  const handleResize = (splitId: string, delta: number, direction: 'vertical' | 'horizontal') => {
    const newConfig = resizeSplit(config, splitId, delta, direction)
    onConfigChange(newConfig)
  }

  const handleHistoryChange = (paneId: string, history: { cmd: string; out: string }[]) => {
    const newConfig = updatePaneHistory(config, paneId, history)
    onConfigChange(newConfig)
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex overflow-hidden bg-slate-900"
      onMouseUp={() => setDragging(null)}
      onMouseLeave={() => setDragging(null)}
    >
      {renderTerminalTree(
        config,
        {
          onSplit: handleSplit,
          onClose: handleClose,
          onResize: handleResize,
          onHistoryChange: handleHistoryChange,
          fontSize,
          dragging,
          setDragging,
        }
      )}
    </div>
  )
}

interface RenderContext {
  onSplit: (paneId: string, direction: 'vertical' | 'horizontal') => void
  onClose: (paneId: string) => void
  onResize: (splitId: string, delta: number, direction: 'vertical' | 'horizontal') => void
  onHistoryChange: (paneId: string, history: { cmd: string; out: string }[]) => void
  fontSize: number
  dragging: string | null
  setDragging: (id: string | null) => void
}

function renderTerminalTree(config: TerminalConfig, ctx: RenderContext): JSX.Element {
  if (config.type === 'pane') {
    return (
      <TerminalPane
        id={config.id}
        history={config.history || []}
        onHistoryChange={(h) => ctx.onHistoryChange(config.id, h)}
        onSplit={(direction) => ctx.onSplit(config.id, direction)}
        onClose={() => ctx.onClose(config.id)}
        fontSize={ctx.fontSize}
      />
    )
  }

  const { direction = 'vertical', children = [], size = 50 } = config
  const isVertical = direction === 'vertical'
  const dividerSize = 4

  return (
    <div
      className={`flex w-full h-full ${isVertical ? 'flex-row' : 'flex-col'}`}
    >
      {children.map((child, idx) => (
        <div
          key={child.id}
          style={{
            flex: idx === 0 ? `0 0 ${size}%` : `1 1 auto`,
            minWidth: isVertical ? '100px' : 'auto',
            minHeight: isVertical ? 'auto' : '50px',
            overflow: 'hidden',
          }}
          className="relative"
        >
          {renderTerminalTree(child, ctx)}

          {/* Divider between panes */}
          {idx < children.length - 1 && (
            <div
              onMouseDown={() => ctx.setDragging(config.id)}
              style={{
                cursor: isVertical ? 'col-resize' : 'row-resize',
              }}
              className={`absolute ${
                isVertical
                  ? `right-0 top-0 w-1 h-full bg-slate-700 hover:bg-blue-500/50 transition-colors`
                  : `bottom-0 left-0 h-1 w-full bg-slate-700 hover:bg-blue-500/50 transition-colors`
              }`}
              onMouseMove={(e) => {
                if (ctx.dragging === config.id) {
                  e.preventDefault()
                  const delta = isVertical ? e.movementX : e.movementY
                  ctx.onResize(config.id, delta, direction || 'vertical')
                }
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * Split a pane into two panes
 */
function splitPane(
  config: TerminalConfig,
  paneId: string,
  direction: 'vertical' | 'horizontal'
): TerminalConfig {
  if (config.id === paneId && config.type === 'pane') {
    return {
      id: generateId(),
      type: 'split',
      direction,
      size: 50,
      children: [
        config,
        {
          id: generateId(),
          type: 'pane',
          history: [{ cmd: '', out: 'Terminal 2 — ready' }],
        },
      ],
    }
  }

  if (config.type === 'split' && config.children) {
    return {
      ...config,
      children: config.children.map((child) => splitPane(child, paneId, direction)),
    }
  }

  return config
}

/**
 * Close a pane and promote sibling if in a split
 */
function closePane(config: TerminalConfig, paneId: string): TerminalConfig | null {
  if (config.id === paneId) {
    return null // Root pane can't be closed
  }

  if (config.type === 'split' && config.children) {
    const filtered = config.children
      .map((child) => closePane(child, paneId))
      .filter((c) => c !== null) as TerminalConfig[]

    // If only one child remains, promote it
    if (filtered.length === 1) {
      return filtered[0]
    }

    // If all children were removed, return null
    if (filtered.length === 0) {
      return null
    }

    return { ...config, children: filtered }
  }

  return config
}

/**
 * Resize a split container
 */
function resizeSplit(
  config: TerminalConfig,
  splitId: string,
  delta: number,
  direction: 'vertical' | 'horizontal'
): TerminalConfig {
  if (config.id === splitId && config.type === 'split') {
    const currentSize = config.size || 50
    const maxDelta = currentSize * 0.8 // Don't let panes get too small
    const constrainedDelta = Math.max(-maxDelta, Math.min(maxDelta, delta))
    const newSize = Math.max(10, Math.min(90, currentSize + constrainedDelta))

    return { ...config, size: newSize }
  }

  if (config.type === 'split' && config.children) {
    return {
      ...config,
      children: config.children.map((child) => resizeSplit(child, splitId, delta, direction)),
    }
  }

  return config
}

/**
 * Update history for a specific pane
 */
function updatePaneHistory(
  config: TerminalConfig,
  paneId: string,
  history: { cmd: string; out: string }[]
): TerminalConfig {
  if (config.id === paneId && config.type === 'pane') {
    return { ...config, history }
  }

  if (config.type === 'split' && config.children) {
    return {
      ...config,
      children: config.children.map((child) => updatePaneHistory(child, paneId, history)),
    }
  }

  return config
}

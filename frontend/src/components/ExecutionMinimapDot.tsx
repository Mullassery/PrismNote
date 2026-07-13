import type { CellExecutionState } from '../hooks/useExecutionMinimap'
import { useExecutionMinimapStore } from '../hooks/useExecutionMinimap'

interface ExecutionMinimapDotProps {
  cellId: string
  cellIndex: number
  cellRef: React.RefObject<HTMLDivElement | null>
}

function getDotColor(state: CellExecutionState['state']): string {
  switch (state) {
    case 'idle':
      return 'bg-slate-400/40'
    case 'running':
      return 'bg-blue-400 animate-pulse'
    case 'success':
      return 'bg-emerald-400'
    case 'error':
      return 'bg-rose-400'
  }
}

function getAriaLabel(state: CellExecutionState, cellIndex: number): string {
  const baseLabel = `Cell ${cellIndex + 1}`
  switch (state.state) {
    case 'idle':
      return `${baseLabel}, not executed`
    case 'running':
      return `${baseLabel}, executing`
    case 'success':
      return `${baseLabel}, executed successfully`
    case 'error':
      return `${baseLabel}, execution failed`
  }
}

export default function ExecutionMinimapDot({ cellId, cellIndex, cellRef }: ExecutionMinimapDotProps) {
  const executionState = useExecutionMinimapStore((state) => state.getCellState(cellId))
  const executionTime = useExecutionMinimapStore((state) => state.getExecutionTime(cellId))

  const handleClick = () => {
    if (cellRef && cellRef.current) {
      cellRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const tooltipText = executionTime !== null ? `${executionTime.toFixed(1)}s` : '—'

  return (
    <div className="flex items-center justify-center py-0.5 group">
      <button
        onClick={handleClick}
        role="button"
        aria-label={getAriaLabel(executionState, cellIndex)}
        title={`Cell ${cellIndex + 1} — ${tooltipText}`}
        className={`w-2 h-2 rounded-full cursor-pointer transition-all ${getDotColor(executionState.state)} hover:scale-125 ring-1 ring-white/20`}
      />
      <div className="absolute right-7 px-2 py-1 rounded bg-slate-900 text-white text-xs whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10">
        Cell {cellIndex + 1} — {tooltipText}
      </div>
    </div>
  )
}

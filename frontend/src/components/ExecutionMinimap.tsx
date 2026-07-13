import ExecutionMinimapDot from './ExecutionMinimapDot'

interface Cell {
  id: string
}

interface ExecutionMinimapProps {
  cells: Cell[]
  cellRefs: Map<string, React.RefObject<HTMLDivElement>>
}

export default function ExecutionMinimap({ cells, cellRefs }: ExecutionMinimapProps) {
  return (
    <div className="w-5 flex-shrink-0 flex flex-col gap-4 py-4 px-0.5 bg-slate-900/30 border-l border-slate-700/50 overflow-y-auto">
      {cells.map((cell, index) => (
        <ExecutionMinimapDot
          key={cell.id}
          cellId={cell.id}
          cellIndex={index}
          cellRef={cellRefs.get(cell.id) || { current: null }}
        />
      ))}
    </div>
  )
}

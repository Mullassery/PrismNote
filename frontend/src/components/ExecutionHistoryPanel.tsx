import { useEffect, useState } from 'react'
import { Clock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

interface ExecutionRecord {
  execution_id: string
  cell_id: string
  status: string
  start_time: string
  duration_ms: number
  rows_affected?: number
  memory_mb?: number
  error_message?: string
}

interface ExecutionHistoryPanelProps {
  notebookId: string
  cellId?: string
}

export default function ExecutionHistoryPanel({ notebookId, cellId }: ExecutionHistoryPanelProps) {
  const [executions, setExecutions] = useState<ExecutionRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!cellId || !notebookId) return

    const fetchHistory = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/notebooks/${notebookId}/cells/${cellId}/executions?limit=20`)
        if (!response.ok) throw new Error('Failed to fetch execution history')

        const records = await response.json()
        setExecutions(records)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching history')
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [notebookId, cellId])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={14} className="text-emerald-500" />
      case 'error':
        return <AlertCircle size={14} className="text-red-500" />
      case 'timeout':
        return <AlertCircle size={14} className="text-yellow-500" />
      default:
        return <Clock size={14} className="text-slate-400" />
    }
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  if (!cellId) {
    return (
      <div className="p-4 text-center pn-faint text-sm">
        Select a cell to view execution history
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 border-l border-slate-700">
      {/* Header */}
      <div className="p-3 border-b border-slate-700 flex items-center gap-2">
        <Clock size={16} className="text-blue-400" />
        <h3 className="text-sm font-semibold pn-text">Execution History</h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="p-4 flex items-center gap-2 text-sm pn-faint">
            <Loader2 size={14} className="animate-spin" />
            Loading history...
          </div>
        )}

        {error && (
          <div className="p-4 text-sm text-rose-400 bg-rose-500/10">
            {error}
          </div>
        )}

        {!loading && executions.length === 0 && (
          <div className="p-4 text-center text-sm pn-faint">
            No execution history
          </div>
        )}

        {!loading && executions.length > 0 && (
          <div className="divide-y divide-slate-700">
            {executions.map((exec) => (
              <div key={exec.execution_id} className="p-3 hover:bg-slate-800/50 transition-colors">
                {/* Time and Status */}
                <div className="flex items-center gap-2 mb-1">
                  {getStatusIcon(exec.status)}
                  <span className="text-xs pn-faint">{formatDate(exec.start_time)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    exec.status === 'success'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : exec.status === 'error'
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {exec.status}
                  </span>
                </div>

                {/* Duration */}
                <div className="text-xs pn-text mb-1">
                  Duration: <span className="font-mono text-blue-400">{formatTime(exec.duration_ms)}</span>
                </div>

                {/* Rows and Memory */}
                <div className="text-xs pn-faint space-y-0.5">
                  {exec.rows_affected !== undefined && (
                    <div>Rows: {exec.rows_affected.toLocaleString()}</div>
                  )}
                  {exec.memory_mb !== undefined && (
                    <div>Memory: {exec.memory_mb.toFixed(1)} MB</div>
                  )}
                </div>

                {/* Error Message */}
                {exec.error_message && (
                  <div className="mt-2 text-xs bg-red-500/10 text-red-300 p-2 rounded font-mono whitespace-pre-wrap overflow-hidden max-h-20">
                    {exec.error_message.substring(0, 200)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

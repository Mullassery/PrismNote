/**
 * Single Terminal Pane
 * Manages command execution and output for one terminal instance
 */

import { useRef, useEffect, useState } from 'react'
import { Plus, Trash2, Split } from 'lucide-react'

interface TerminalPaneProps {
  id: string
  history: { cmd: string; out: string }[]
  onHistoryChange: (history: { cmd: string; out: string }[]) => void
  onSplit: (direction: 'vertical' | 'horizontal') => void
  onClose: () => void
  fontSize: number
}

export default function TerminalPane({
  id,
  history,
  onHistoryChange,
  onSplit,
  onClose,
  fontSize,
}: TerminalPaneProps) {
  const [cmd, setCmd] = useState('')
  const termEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to end when history changes
  useEffect(() => {
    termEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  // Focus input when pane is rendered
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const runCmd = async () => {
    const c = cmd.trim()
    if (!c) return

    setCmd('')

    let out = ''
    try {
      const res = await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: c, paneId: id }),
      })
      out = res.ok ? (await res.json()).output ?? '' : `prismnote: backend unavailable (${res.status})`
    } catch {
      out = `prismnote: '${c.split(' ')[0]}' — no terminal backend connected`
    }

    onHistoryChange([...history, { cmd: c, out }])
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 border-b border-slate-700 text-xs pn-muted">
        <span className="font-mono text-blue-400">Terminal ({id.substring(0, 6)})</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSplit('vertical')}
            title="Split vertically"
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <Split size={14} className="rotate-90" />
          </button>
          <button
            onClick={() => onSplit('horizontal')}
            title="Split horizontally"
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <Split size={14} />
          </button>
          <button
            onClick={onClose}
            title="Close pane"
            className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Terminal output */}
      <div className="flex-1 overflow-auto p-2 font-mono pn-text" style={{ fontSize }}>
        {history.length === 0 && (
          <div className="pn-muted text-sm">
            PrismNote terminal — type a command (python, ros2, launch, etc.)
          </div>
        )}
        {history.map((h, i) => (
          <div key={i}>
            {h.cmd && (
              <div className="text-emerald-400">
                <span className="text-blue-400">prismnote</span> $ {h.cmd}
              </div>
            )}
            {h.out && <div className="whitespace-pre-wrap pn-muted text-xs">{h.out}</div>}
          </div>
        ))}
        <div className="flex items-center gap-1 text-emerald-400">
          <span className="text-blue-400">prismnote</span> $
          <input
            ref={inputRef}
            value={cmd}
            onChange={(e) => setCmd(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runCmd()}
            className="flex-1 bg-transparent outline-none pn-text text-xs"
            placeholder="command…"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div ref={termEndRef} />
      </div>
    </div>
  )
}

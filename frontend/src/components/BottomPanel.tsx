import { useCallback, useEffect, useRef, useState } from 'react'
import { TerminalSquare, ListChecks, ChevronDown, X, Minus, SquareTerminal, Plus, Variable, RefreshCw, Table2, List, GitBranch, Sparkles } from 'lucide-react'
import { useNotebookStore } from '../hooks/useNotebookRedux'
import { useFontSize } from '../hooks/useFontSize'
import TableOfContents from './TableOfContents'
import LineageViewer from './LineageViewer'
import AgentPanel from './AgentPanel'
import type { ExplorerTarget } from './DataExplorer'

type Tab = 'terminal' | 'output' | 'lineage' | 'variables' | 'contents' | 'ai'

interface BottomPanelProps {
  notebookVisible?: boolean
  onClose: () => void
  onOpenExplorer?: (target: ExplorerTarget, title: string) => void
}

export default function BottomPanel({ notebookVisible = true, onClose, onOpenExplorer }: BottomPanelProps) {
    
  const { currentNotebook } = useNotebookStore()
const [tab, setTab] = useState<Tab>('output')
  const [collapsed, setCollapsed] = useState(false)
  const [height, setHeight] = useState(240)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null)
  const dragging = useRef(false)
  const { size: fontSize, inc, dec } = useFontSize('pn-bottom-font', 13)

  // ---- resize via top drag handle ----
  const onMouseDown = useCallback(() => {
    dragging.current = true
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const next = window.innerHeight - e.clientY
      setHeight(Math.min(Math.max(next, 120), window.innerHeight - 200))
    }
    const onUp = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  // ---- terminal state ----
  const [history, setHistory] = useState<{ cmd: string; out: string }[]>([
    { cmd: '', out: 'PrismNote terminal — type a command. (python, ls, pip …)' },
  ])
  const [cmd, setCmd] = useState('')
  const termEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    termEndRef.current?.scrollIntoView()
  }, [history, tab])

  const runCmd = async () => {
    const c = cmd.trim()
    if (!c) return
    setCmd('')
    let out = ''
    try {
      const res = await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: c }),
      })
      out = res.ok ? (await res.json()).output ?? '' : `prismnote: backend unavailable (${res.status})`
    } catch {
      out = `prismnote: '${c.split(' ')[0]}' — no terminal backend connected`
    }
    setHistory((h) => [...h, { cmd: c, out }])
  }


  // ---- variable explorer (introspects the live kernel namespace) ----
  const [variables, setVariables] = useState<any[]>([])
  const [varsLoading, setVarsLoading] = useState(false)
  const loadVariables = async () => {
    setVarsLoading(true)
    try {
      const r = await fetch('/api/kernel/variables')
      const d = await r.json()
      setVariables(d.variables ?? [])
    } catch {
      setVariables([])
    } finally {
      setVarsLoading(false)
    }
  }
  // Clear variables when notebook is closed
  useEffect(() => {
    if (!currentNotebook) setVariables([])
  }, [currentNotebook])

  useEffect(() => {
    if (tab === 'variables' && !collapsed) loadVariables()
    // refresh when the active notebook's outputs change while the tab is open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, collapsed, currentNotebook?.cells.map((c: any) => c.execution_count).join(',')])

  // ---- derive results & plots from notebook cell outputs ----
  const outputs = (currentNotebook?.cells ?? []).flatMap((cell, i) =>
    (cell.outputs ?? []).map((o: any) => ({ cell: i, o }))
  )
  const textOutputs = outputs.filter(
    ({ o }) => o.output_type === 'stream' || o.output_type === 'execute_result' || o.output_type === 'error'
  )

  const tabs: { id: Tab; label: string; icon: any; badge?: number }[] = [
    { id: 'output', label: 'Output', icon: ListChecks, badge: textOutputs.length || undefined },
    { id: 'variables', label: 'Variables', icon: Variable, badge: variables.length || undefined },
    { id: 'lineage', label: 'Lineage', icon: GitBranch },
    { id: 'contents', label: 'Contents', icon: List },
    { id: 'ai', label: 'AI', icon: Sparkles },
    { id: 'terminal', label: 'Terminal', icon: TerminalSquare },
  ]

  return (
    <div
      className={`pn-surface border-t pn-bd flex flex-col ${notebookVisible ? 'shrink-0' : 'flex-1'}`}
      style={notebookVisible ? { height: collapsed ? 32 : height } : {}}
    >
      {/* drag handle */}
      {!collapsed && <div onMouseDown={onMouseDown} className="h-1 -mt-1 cursor-row-resize hover:bg-blue-500/60 transition-colors" />}

      {/* tab bar */}
      <div className="h-8 flex items-center justify-between border-b pn-bd pr-1">
        <div className="flex items-stretch h-full">
          {tabs.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id)
                  setCollapsed(false)
                }}
                className={`flex items-center gap-1.5 px-3 text-[12px] border-b-2 transition-colors ${
                  tab === t.id && !collapsed
                    ? 'border-blue-400 pn-text'
                    : 'border-transparent pn-muted hover:pn-text'
                }`}
              >
                <Icon size={13} />
                {t.label}
                {t.badge ? <span className="ml-1 px-1 rounded bg-blue-500/25 text-blue-300 text-[10px]">{t.badge}</span> : null}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-0.5 pn-muted">
          <button onClick={dec} title="Decrease font size" className="p-1 pn-hover rounded"><Minus size={13} /></button>
          <span className="text-[10px] tabular-nums w-5 text-center" title="Panel font size">{fontSize}</span>
          <button onClick={inc} title="Increase font size" className="p-1 pn-hover rounded"><Plus size={13} /></button>
          <span className="w-px h-4 bg-white/10 mx-1" />
          <button onClick={() => setCollapsed((c) => !c)} title={collapsed ? 'Expand' : 'Minimize'} className="p-1 pn-hover rounded">
            {collapsed ? <ChevronDown size={14} className="rotate-180" /> : <Minus size={14} />}
          </button>
          <button onClick={onClose} title="Close panel" className="p-1 pn-hover rounded">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* body */}
      {!collapsed && (
        <div className="flex-1 overflow-auto font-mono" style={{ fontSize }}>
          {tab === 'terminal' && (
            <div className="p-2 pn-text">
              {history.map((h, i) => (
                <div key={i}>
                  {h.cmd && (
                    <div className="text-emerald-400">
                      <span className="text-blue-400">prismnote</span> $ {h.cmd}
                    </div>
                  )}
                  {h.out && <div className="whitespace-pre-wrap pn-muted">{h.out}</div>}
                </div>
              ))}
              <div className="flex items-center gap-1 text-emerald-400">
                <span className="text-blue-400">prismnote</span> $
                <input
                  autoFocus
                  value={cmd}
                  onChange={(e) => setCmd(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runCmd()}
                  className="flex-1 bg-transparent outline-none pn-text"
                  placeholder="run a command…"
                />
              </div>
              <div ref={termEndRef} />
            </div>
          )}

          {tab === 'output' && (
            <div className="p-3 space-y-2 pn-text">
              {textOutputs.length === 0 && <div className="pn-faint">Run a cell to see results here.</div>}
              {textOutputs.map(({ cell, o }, i) => (
                <div key={i} className="border-l-2 pn-bd pl-2">
                  <div className="text-[10px] uppercase pn-faint">Cell [{cell + 1}]</div>
                  <pre className={`whitespace-pre-wrap ${o.output_type === 'error' ? 'text-red-400' : 'pn-text'}`}>
                    {(Array.isArray(o.text) ? o.text.join('') : o.text) ||
                      o.data?.['text/plain']?.join?.('') ||
                      JSON.stringify(o.data ?? o, null, 0)}
                  </pre>
                </div>
              ))}
            </div>
          )}

          {tab === 'variables' && (
            <div className="p-2 pn-text">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] pn-faint">{variables.length} variables in the kernel</span>
                <button onClick={loadVariables} className="flex items-center gap-1 text-[11px] pn-muted hover:pn-text">
                  <RefreshCw size={11} className={varsLoading ? 'animate-spin' : ''} /> Refresh
                </button>
              </div>
              {variables.length === 0 ? (
                <div className="pn-faint">No variables yet — run a cell that defines one.</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] uppercase pn-faint text-left">
                      <th className="px-2 py-1">Name</th>
                      <th className="px-2 py-1">Type</th>
                      <th className="px-2 py-1">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variables.map((v) => {
                      const tabular = /DataFrame|ndarray|Series/.test(v.type)
                      return (
                        <tr key={v.name} className="border-t pn-bd align-top group">
                          <td className="px-2 py-1 text-blue-300 whitespace-nowrap">{v.name}</td>
                          <td className="px-2 py-1 pn-muted whitespace-nowrap">
                            {v.type}{v.shape ? ` ${JSON.stringify(v.shape)}` : v.len !== undefined ? ` (${v.len})` : ''}
                          </td>
                          <td className="px-2 py-1 pn-text break-all">
                            <div className="flex items-start gap-2">
                              <span className="flex-1">{v.preview}</span>
                              {tabular && onOpenExplorer && (
                                <button
                                  onClick={() => onOpenExplorer({ var: v.name }, v.name)}
                                  title="Open in Data Explorer"
                                  className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-200 text-[10px] whitespace-nowrap"
                                >
                                  <Table2 size={11} /> Explore
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'lineage' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedTable && selectedColumn ? (
                <LineageViewer
                  table={selectedTable}
                  column={selectedColumn}
                  onClose={() => {
                    setSelectedTable(null)
                    setSelectedColumn(null)
                  }}
                />
              ) : (
                <div className="p-4 pn-text space-y-3 overflow-auto">
                  <div>
                    <label className="text-xs pn-faint">Select a datasource to view lineage:</label>
                    <select
                      value={selectedTable || ''}
                      onChange={(e) => {
                        setSelectedTable(e.target.value || null)
                        setSelectedColumn(null)
                      }}
                      className="w-full mt-1 px-2 py-1 rounded bg-white/5 border pn-bd pn-text text-sm outline-none focus:border-blue-500"
                    >
                      <option value="">Choose a table or dataset...</option>
                      <option value="notebook_output">Notebook Outputs</option>
                    </select>
                  </div>
                  {selectedTable && (
                    <div>
                      <label className="text-xs pn-faint">Select a column:</label>
                      <select
                        value={selectedColumn || ''}
                        onChange={(e) => setSelectedColumn(e.target.value || null)}
                        className="w-full mt-1 px-2 py-1 rounded bg-white/5 border pn-bd pn-text text-sm outline-none focus:border-blue-500"
                      >
                        <option value="">Choose a column...</option>
                        <option value="sample_column_1">Column 1</option>
                        <option value="sample_column_2">Column 2</option>
                      </select>
                    </div>
                  )}
                  <div className="text-xs pn-faint pt-4">
                    <p>Column lineage tracking shows:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Upstream sources (where data originates)</li>
                      <li>Transformations applied</li>
                      <li>Downstream usage</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'contents' && (
            <div className="flex-1 overflow-auto">
              <TableOfContents cells={currentNotebook?.cells} />
            </div>
          )}

          {tab === 'ai' && (
            <div className="flex-1 overflow-hidden">
              <AgentPanel onClose={() => setTab('output')} inBottomPanel={true} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

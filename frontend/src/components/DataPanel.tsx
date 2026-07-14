import { useEffect, useState } from 'react'
import { Database, X, Plus, Trash2, Play, Loader2, Cloud, AlertTriangle, NotebookPen, Minus, ChevronRight, Table2 } from 'lucide-react'
import Editor from '@monaco-editor/react'
import {
  listDatabases, createDatabase, deleteDatabase, queryDatabase,
  listWarehouses, queryWarehouse, queryCode, getDatabaseSchema, getWarehouseSchema,
  type DbConnection, type QueryResult, type DatabaseSchema,
} from '../api/data'
import DataFrameView from './DataFrameView'
import { useNotebookStore, getNotebookState } from '../hooks/useNotebookRedux'
import { useFontSize } from '../hooks/useFontSize'

type Conn = { id: string; name: string; kind: 'db' | 'warehouse'; sub: string }

let sqlCompletionProviderRegistered = false

function SqlEditor({ value, onChange, schema }: { value: string; onChange: (v: string) => void; schema: DatabaseSchema }) {
  useEffect(() => {
    if (sqlCompletionProviderRegistered) return

    const registerCompletionProvider = async () => {
      try {
        const monaco = (await import('monaco-editor')).default
        sqlCompletionProviderRegistered = true

        monaco.languages.registerCompletionItemProvider('sql', {
          provideCompletionItems: (model, position) => {
            const word = model.getWordUntilPosition(position)
            const range = { startLineNumber: position.lineNumber, startColumn: word.startColumn, endLineNumber: position.lineNumber, endColumn: word.endColumn }

            const suggestions: any[] = []

            // Add SQL keywords
            const keywords = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AS', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'IS', 'NULL', 'DISTINCT', 'HAVING']
            keywords.forEach((kw) => {
              suggestions.push({
                label: kw,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: kw,
                range,
              })
            })

            // Add table names
            schema.tables.forEach((table) => {
              suggestions.push({
                label: table.name,
                kind: monaco.languages.CompletionItemKind.Struct,
                insertText: table.name,
                range,
                detail: `Table: ${table.columns.length} columns`,
              })
            })

            // Add column names
            schema.tables.forEach((table) => {
              table.columns.forEach((col) => {
                suggestions.push({
                  label: col.name,
                  kind: monaco.languages.CompletionItemKind.Field,
                  insertText: col.name,
                  range,
                  detail: `Column: ${col.type}`,
                })
              })
            })

            return { suggestions }
          },
        })
      } catch (e) {
        console.error('Failed to register SQL completion provider:', e)
      }
    }

    registerCompletionProvider()
  }, [])

  return (
    <Editor
      height="100%"
      defaultLanguage="sql"
      value={value}
      onChange={(v) => onChange(v || '')}
      options={{
        minimap: { enabled: false },
        wordWrap: 'on',
        fontSize: 13,
        fontFamily: 'Menlo, Monaco, Courier New, monospace',
        lineHeight: 20,
        quickSuggestions: { other: true, comments: false, strings: false },
        suggestOnTriggerCharacters: true,
      } as any}
      beforeMount={(monaco) => {
        monaco.editor.defineTheme('pn-dark', {
          base: 'vs-dark',
          inherit: true,
          rules: [],
          colors: { 'editor.background': '#0f1117' },
        })
      }}
      theme="vs-dark"
    />
  )
}

// Connections + SQL runner. Results render through DataFrameView (Table/Bar/Line).
export default function DataPanel({ onClose }: { onClose: () => void }) {
  const [conns, setConns] = useState<Conn[]>([])
  const [sel, setSel] = useState<Conn | null>(null)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [expandedConns, setExpandedConns] = useState<Set<string>>(new Set())
  const [sql, setSql] = useState('SELECT 1')
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [schema, setSchema] = useState<DatabaseSchema>({ tables: [] })
  const [form, setForm] = useState<Partial<DbConnection>>({ db_type: 'sqlite', name: '', database: '', host: 'localhost', port: 5432 })
  const { size: fontSize, inc: fontInc, dec: fontDec } = useFontSize('pn-datapanel-size', 13)

  const refresh = async () => {
    const [dbs, whs] = await Promise.all([listDatabases().catch(() => []), listWarehouses().catch(() => [])])
    const list: Conn[] = [
      ...dbs.map((d) => ({ id: d.id, name: d.name, kind: 'db' as const, sub: d.db_type })),
      ...whs.map((w: any) => ({ id: w.id, name: w.name, kind: 'warehouse' as const, sub: String(w.warehouse_type ?? 'warehouse').toLowerCase() })),
    ]
    setConns(list)
    if (!sel && list.length) setSel(list[0])
  }
  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!sel) {
      setSchema({ tables: [] })
      return
    }
    const fetchSchema = async () => {
      const s = sel.kind === 'db' ? await getDatabaseSchema(sel.id) : await getWarehouseSchema(sel.id)
      setSchema(s)
    }
    fetchSchema()
  }, [sel])

  const run = async () => {
    if (!sel) return
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const r = sel.kind === 'db' ? await queryDatabase(sel.id, sql) : await queryWarehouse(sel.id, sql)
      setResult(r)
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'query failed')
    } finally {
      setRunning(false)
    }
  }

  const insertAsCell = async () => {
    if (!sel) return
    try {
      const code = await queryCode(sel.kind, sel.id, sql)
      const store = getNotebookState() as any
      if (!store.currentNotebook) {
        await store.createNotebook('SQL')
      }
      store.addCell('code')
      const s2 = getNotebookState() as any
      const idx = s2.currentNotebook.cells.length - 1
      s2.updateCell(idx, { source: code.split(/(?<=\n)/) })
      onClose() // jump back to the notebook with the new cell
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'could not generate cell')
    }
  }

  const addDb = async () => {
    if (!form.name || !form.database) return
    await createDatabase(form)
    setShowAdd(false)
    setForm({ db_type: 'sqlite', name: '', database: '', host: 'localhost', port: 5432 })
    refresh()
  }

  return (
    <div className="absolute inset-0 z-30 pn-app flex flex-col pointer-events-none">
      <div className="h-10 flex items-center justify-between px-4 border-b pn-bd pointer-events-auto">
        <span className="flex items-center gap-2 text-sm font-semibold pn-text"><Database size={16} className="text-blue-400" /> Data Querying</span>
        <div className="flex items-center gap-1 pn-muted">
          <button onClick={fontDec} title="Decrease font size" className="p-1 pn-hover rounded"><Minus size={13} /></button>
          <span className="text-[10px] tabular-nums w-5 text-center" title="Panel font size">{fontSize}</span>
          <button onClick={fontInc} title="Increase font size" className="p-1 pn-hover rounded">+</button>
          <span className="w-px h-4 bg-white/10 mx-1" />
          <button onClick={onClose} className="p-1 rounded pn-hover"><X size={16} /></button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden pointer-events-auto">
        {/* connections list */}
        <div className="w-60 shrink-0 border-r pn-bd flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 text-[11px] uppercase tracking-wide pn-faint">
            Connections
            <button onClick={() => setShowAdd((s) => !s)} className="p-1 rounded pn-hover" title="Add database"><Plus size={13} /></button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conns.length === 0 && <div className="px-3 py-2 text-[12px] pn-faint">No connections yet.</div>}
            {conns.map((c) => {
              const isExpanded = expandedConns.has(c.id)
              const tables = c.kind === 'db' && sel?.id === c.id ? schema.tables : []
              return (
                <div key={c.id}>
                  <div className={`group flex items-center gap-1 px-3 py-1.5 cursor-pointer text-[13px] ${sel?.id === c.id && !selectedTable ? 'bg-blue-500/15 pn-text' : 'pn-muted hover:pn-text'}`}>
                    {c.kind === 'db' && tables.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedConns((s) => {
                            const n = new Set(s)
                            if (n.has(c.id)) n.delete(c.id)
                            else n.add(c.id)
                            return n
                          })
                        }}
                        className="p-0.5"
                      >
                        <ChevronRight size={12} className={isExpanded ? 'rotate-90' : ''} />
                      </button>
                    )}
                    {c.kind === 'db' && tables.length === 0 && <div className="w-4" />}
                    <div
                      className="flex-1 flex items-center gap-2 cursor-pointer"
                      onClick={() => {
                        setSel(c)
                        setSelectedTable(null)
                      }}
                    >
                      {c.kind === 'warehouse' ? <Cloud size={13} className="text-sky-400" /> : <Database size={13} className="text-emerald-400" />}
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-[10px] pn-faint">{c.sub}</span>
                    </div>
                    {c.kind === 'db' && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          await deleteDatabase(c.id)
                          if (sel?.id === c.id) setSel(null)
                          refresh()
                        }}
                        className="opacity-0 group-hover:opacity-100 text-rose-400"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  {isExpanded && tables.length > 0 && (
                    <div className="pl-6 border-l pn-bd ml-2">
                      {tables.map((table) => (
                        <div
                          key={table.name}
                          className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer text-[12px] ${
                            selectedTable === table.name ? 'bg-blue-500/15 pn-text' : 'pn-muted hover:pn-text'
                          }`}
                          onClick={() => setSelectedTable(table.name)}
                        >
                          <Table2 size={11} />
                          <span className="flex-1 truncate">{table.name}</span>
                          <span className="text-[10px] pn-faint">{table.columns.length} cols</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {showAdd && (
            <div className="border-t pn-bd p-2 space-y-1.5 text-[12px]">
              <select value={form.db_type} onChange={(e) => setForm({ ...form, db_type: e.target.value })} className="w-full px-2 py-1 rounded bg-white/5 border pn-bd pn-text">
                {['sqlite', 'duckdb', 'postgresql', 'mysql'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input placeholder="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-2 py-1 rounded bg-white/5 border pn-bd pn-text" />
              <input placeholder={form.db_type === 'sqlite' || form.db_type === 'duckdb' ? 'file path / database' : 'database'} value={form.database} onChange={(e) => setForm({ ...form, database: e.target.value })} className="w-full px-2 py-1 rounded bg-white/5 border pn-bd pn-text" />
              {form.db_type !== 'sqlite' && form.db_type !== 'duckdb' && (
                <>
                  <input placeholder="host" value={form.host ?? ''} onChange={(e) => setForm({ ...form, host: e.target.value })} className="w-full px-2 py-1 rounded bg-white/5 border pn-bd pn-text" />
                  <input placeholder="port" value={form.port ?? ''} onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || undefined })} className="w-full px-2 py-1 rounded bg-white/5 border pn-bd pn-text" />
                  <input placeholder="user" value={form.username ?? ''} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full px-2 py-1 rounded bg-white/5 border pn-bd pn-text" />
                  <input placeholder="password" type="password" value={form.password ?? ''} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-2 py-1 rounded bg-white/5 border pn-bd pn-text" />
                </>
              )}
              <button onClick={addDb} className="w-full px-2 py-1 rounded prism-bg text-white">Add</button>
            </div>
          )}
        </div>

        {/* SQL editor + results */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ fontSize }}>
          <div className="flex-1 flex flex-col border-b pn-bd min-h-0">
            <SqlEditor value={sql} onChange={setSql} schema={schema} />
          </div>
          <div className="p-3 border-t pn-bd">
            <div className="flex items-center gap-2">
              <button onClick={run} disabled={!sel || running} className="flex items-center gap-1 px-3 py-1.5 rounded prism-bg text-white disabled:opacity-40" style={{ fontSize: `${fontSize - 1}px` }}>
                {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Run
              </button>
              <button onClick={insertAsCell} disabled={!sel} title="Insert as a reproducible code cell (DataFrame `df`)"
                className="flex items-center gap-1 px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 pn-text disabled:opacity-40" style={{ fontSize: `${fontSize - 1}px` }}>
                <NotebookPen size={14} /> Insert into notebook
              </button>
              {sel && <span className="pn-faint" style={{ fontSize: `${fontSize - 2}px` }}>{sel.kind === 'warehouse' ? 'cloud warehouse' : sel.sub} · {sel.name}</span>}
            </div>
          </div>
          <div className="flex-1 overflow-auto p-3">
            {error && (
              <div className="rounded border border-rose-700/60 bg-rose-900/20 p-3 text-rose-200 flex gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" /><pre className="whitespace-pre-wrap font-mono" style={{ fontSize: `${fontSize - 1}px` }}>{error}</pre>
              </div>
            )}
            {result && !error && (
              result.rows.length || result.columns.length
                ? <DataFrameView df={{ columns: result.columns, data: result.rows }} />
                : <div className="pn-faint">Query OK — {result.row_count} rows.</div>
            )}
            {!result && !error && <div className="pn-faint">Run a query to see results.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

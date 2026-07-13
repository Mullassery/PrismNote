import { useEffect, useRef, useState } from 'react'
import {
  Sparkles,
  Send,
  X,
  ChevronDown,
  Wand2,
  Play,
  Check,
  Ban,
  Plus,
  Pencil,
  CircleDot,
  Loader,
  Plug,
  Download,
  RefreshCw,
  Minus,
  Copy,
  Code,
  FileText,
  Database,
  Eye,
} from 'lucide-react'
import MDPreview from '@uiw/react-markdown-preview'
import { useNotebookStore } from '../hooks/useNotebook'
import { useFontSize } from '../hooks/useFontSize'
import { ollamaEndpoint, getAiConfig, aiChat } from '../api/ai'
import { buildEnvironmentContext } from '../hooks/useAIContext'

type Provider = 'ollama' | 'claude' | 'openai'
const PROVIDER_LABEL: Record<Provider, string> = { ollama: 'Ollama', claude: 'Claude', openai: 'OpenAI' }

type Mode = 'plan' | 'act'
type Role = 'user' | 'assistant'

interface AgentAction {
  id: string
  kind: 'add_cell' | 'edit_cell' | 'run_cell'
  index?: number
  code?: string
  status: 'pending' | 'done' | 'rejected'
}

interface Message {
  role: Role
  text: string
  actions?: AgentAction[]
}

// Persona prepended to every request so ANY Ollama model behaves like a patient
// Python teacher — explaining the "why", flagging pitfalls, and offering a short
// contextual tip/trick. Kept model-agnostic so it works across local models.
const teacherPersona = `You are "Prism", a friendly and patient Python data-science teacher embedded in a notebook.
Teaching style (always):
- Explain the *why*, not just the *what*, in plain language.
- Prefer clear, idiomatic, Pythonic code (pandas/numpy where apt) and name the idiom you used.
- After your main answer, add a short "💡 Tip:" line with one relevant tip, trick, or gotcha tailored to the user's code/context (e.g. vectorization, chaining, f-strings, .loc vs .iloc, list comprehensions).
- Keep tips practical and specific to what the user is doing — never generic filler.`

const planSystem = `${teacherPersona}

You are PrismNote's PLANNING agent. Read the user's request and the current notebook, then reply with a short, numbered plan describing the approach. Do NOT write the final code or take actions yet — planning only. Be concise, and end with a "💡 Tip:" line.`

const actSystem = `${teacherPersona}

You are PrismNote's CODING agent for a Python data-science notebook. Briefly explain what you'll do (teaching the why), then emit actions the notebook can execute. Use EXACTLY these tags:
- Add a code cell:  <action type="add_cell">PYTHON CODE</action>
- Edit cell N:      <action type="edit_cell" index="N">PYTHON CODE</action>
- Run cell N:       <action type="run_cell" index="N"/>
Only emit actions you are confident about. Keep code runnable and self-contained. After the actions, add a short "💡 Tip:" line relevant to the code.`

function parseActions(text: string): AgentAction[] {
  const re = /<action\s+type="(add_cell|edit_cell|run_cell)"(?:\s+index="(\d+)")?\s*(?:\/>|>([\s\S]*?)<\/action>)/g
  const out: AgentAction[] = []
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    out.push({
      id: `${Date.now()}-${i++}`,
      kind: m[1] as AgentAction['kind'],
      index: m[2] !== undefined ? parseInt(m[2], 10) : undefined,
      code: m[3]?.trim(),
      status: 'pending',
    })
  }
  return out
}

function stripActions(text: string) {
  return text.replace(/<action[\s\S]*?(?:\/>|<\/action>)/g, '').trim()
}

export default function AgentPanel({ onClose }: { onClose: () => void }) {
  const { currentNotebook, addCell, updateCell, executeCell } = useNotebookStore()
  const [mode, setMode] = useState<Mode>('plan')
  const [models, setModels] = useState<string[]>([])
  const [model, setModel] = useState('')
  const [provider, setProvider] = useState<Provider>('ollama')
  const [cloudModel, setCloudModel] = useState('')
  const { size: fontSize, inc, dec } = useFontSize('pn-ai-font', 13)
  const [modelOpen, setModelOpen] = useState(false)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [contextOpen, setContextOpen] = useState(true)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, streaming])

  // discover local Ollama models (retryable)
  const checkOllama = () => {
    setConnected(null)
    fetch(`${ollamaEndpoint()}/api/tags`)
      .then((r) => r.json())
      .then((d) => {
        const names = (d.models ?? []).map((m: any) => m.name)
        setModels(names)
        // Prefer a coding model by default (this is a coding agent)
        const preferred =
          names.find((n: string) => /coder/i.test(n)) ||
          names.find((n: string) => /code/i.test(n)) ||
          names[0]
        setModel(preferred ?? '')
        setConnected(true)
      })
      .catch(() => setConnected(false))
  }
  // Load the configured provider; for cloud providers "connected" = key saved.
  // Re-runs when Settings → AI saves (it dispatches 'pn-ai-config').
  const loadConfig = () => {
    getAiConfig()
      .then((c) => {
        const p = (c.provider as Provider) || 'ollama'
        setProvider(p)
        if (p === 'ollama') {
          checkOllama()
        } else if (p === 'claude') {
          setCloudModel(c.claude_model || 'claude-sonnet-4-6')
          setConnected(c.claude_key_set)
        } else if (p === 'openai') {
          setCloudModel(c.openai_model || 'gpt-4o')
          setConnected(c.openai_key_set)
        }
      })
      .catch(() => { setProvider('ollama'); checkOllama() })
  }
  useEffect(() => {
    loadConfig()
    window.addEventListener('pn-ai-config', loadConfig)
    return () => window.removeEventListener('pn-ai-config', loadConfig)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeModel = provider === 'ollama' ? model : cloudModel

  const notebookContext = () => {
    const cells = currentNotebook?.cells ?? []
    if (!cells.length) return '(empty notebook)'
    return cells
      .map((c, i) => `# Cell ${i} (${c.cell_type})\n${Array.isArray(c.source) ? c.source.join('') : c.source}`)
      .join('\n\n')
  }

  const runAction = async (msgIdx: number, action: AgentAction) => {
    if (action.kind === 'add_cell') {
      addCell('code')
      // new cell appended at end
      const newIndex = (currentNotebook?.cells.length ?? 0)
      updateCell(newIndex, { source: (action.code ?? '').split('\n') })
    } else if (action.kind === 'edit_cell' && action.index !== undefined) {
      updateCell(action.index, { source: (action.code ?? '').split('\n') })
    } else if (action.kind === 'run_cell' && action.index !== undefined) {
      await executeCell(action.index)
    }
    setMessages((ms) =>
      ms.map((m, i) =>
        i === msgIdx ? { ...m, actions: m.actions?.map((a) => (a.id === action.id ? { ...a, status: 'done' } : a)) } : m
      )
    )
  }

  const rejectAction = (msgIdx: number, id: string) =>
    setMessages((ms) =>
      ms.map((m, i) =>
        i === msgIdx ? { ...m, actions: m.actions?.map((a) => (a.id === id ? { ...a, status: 'rejected' } : a)) } : m
      )
    )

  const send = async () => {
    if (!input.trim() || streaming || !activeModel) return
    const userMsg: Message = { role: 'user', text: input }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setStreaming(true)

    const sys = mode === 'plan' ? planSystem : actSystem
    // Give the agent product context: workspace files, the open Data Explorer
    // dataset, and the session — not just the notebook cells.
    const env = buildEnvironmentContext()
    const sysContent = `${sys}\n\nEnvironment:\n${env}\n\nCurrent notebook:\n${notebookContext()}`

    setMessages((ms) => [...ms, { role: 'assistant', text: '' }])

    // Cloud providers (Claude/OpenAI) go through the backend engine (non-streaming).
    if (provider !== 'ollama') {
      try {
        const reply = await aiChat(history.map((m) => ({ role: m.role, content: m.text })), sysContent)
        const actions = mode === 'act' ? parseActions(reply) : []
        setMessages((ms) => {
          const copy = [...ms]
          copy[copy.length - 1] = { role: 'assistant', text: reply, actions: actions.length ? actions : undefined }
          return copy
        })
      } catch (e: any) {
        setMessages((ms) => {
          const copy = [...ms]
          copy[copy.length - 1] = { role: 'assistant', text: `⚠️ ${PROVIDER_LABEL[provider]} request failed: ${e?.response?.data?.error || e?.message || 'check your API key in Settings → AI'}` }
          return copy
        })
      } finally {
        setStreaming(false)
      }
      return
    }

    const payload = {
      model,
      stream: true,
      messages: [
        { role: 'system', content: sysContent },
        ...history.map((m) => ({ role: m.role, content: m.text })),
      ],
    }

    try {
      const res = await fetch(`${ollamaEndpoint()}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.body) throw new Error('no stream')
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      let acc = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          const json = JSON.parse(line)
          if (json.message?.content) {
            acc += json.message.content
            setMessages((ms) => {
              const copy = [...ms]
              copy[copy.length - 1] = { role: 'assistant', text: acc }
              return copy
            })
          }
        }
      }
      const actions = mode === 'act' ? parseActions(acc) : []
      setMessages((ms) => {
        const copy = [...ms]
        copy[copy.length - 1] = { role: 'assistant', text: acc, actions: actions.length ? actions : undefined }
        return copy
      })
    } catch {
      setMessages((ms) => {
        const copy = [...ms]
        copy[copy.length - 1] = {
          role: 'assistant',
          text: `⚠️ Couldn't reach Ollama at ${ollamaEndpoint()}. Make sure it's running (\`ollama serve\`) and that browser requests are allowed:\n\nOLLAMA_ORIGINS=http://localhost:5173 ollama serve`,
        }
        return copy
      })
    } finally {
      setStreaming(false)
    }
  }

  const actionMeta = {
    add_cell: { icon: Plus, label: 'Add code cell', color: 'text-emerald-400' },
    edit_cell: { icon: Pencil, label: 'Edit cell', color: 'text-amber-400' },
    run_cell: { icon: Play, label: 'Run cell', color: 'text-blue-400' },
  } as const

  return (
    <aside className="w-96 shrink-0 pn-surface border-l pn-bd flex flex-col overflow-hidden">
      {/* header */}
      <div className="px-3 py-2.5 border-b pn-bd space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[12px] font-bold pn-text">
            <Sparkles size={15} className="text-sky-400" /> Chat with AI
          </span>
          <div className="flex items-center gap-1">
            <button onClick={dec} title="Decrease font size" className="pn-muted hover:pn-text p-1 rounded hover:bg-white/5 transition"><Minus size={12} /></button>
            <span className="text-[10px] tabular-nums w-4 text-center pn-faint" title="Panel font size">{fontSize}</span>
            <button onClick={inc} title="Increase font size" className="pn-muted hover:pn-text p-1 rounded hover:bg-white/5 transition"><Plus size={12} /></button>
            <button onClick={onClose} className="pn-muted hover:pn-text p-1 rounded hover:bg-white/5 transition">
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${
              connected === false ? 'bg-red-500/20 text-red-300' : connected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 pn-faint'
            }`}
            title={`${PROVIDER_LABEL[provider]} connection`}
          >
            <Plug size={10} />
            {connected === false
              ? `${PROVIDER_LABEL[provider]}: ${provider === 'ollama' ? 'offline' : 'no key'}`
              : connected
              ? `${PROVIDER_LABEL[provider]} connected`
              : 'checking…'}
          </span>
          {currentNotebook && <span className="text-slate-500 text-[10px]">{currentNotebook.cells.length} cells</span>}
        </div>
      </div>

      {/* mode toggle + model picker */}
      <div className="px-3 py-2 border-b pn-bd space-y-2">
        <div className="flex rounded-lg bg-slate-800/50 p-0.5 text-[12px] border border-slate-700/30">
          {(['plan', 'act'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md capitalize font-medium transition ${
                mode === m ? 'prism-bg text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m === 'plan' ? <Wand2 size={13} /> : <Play size={13} />}
              {m}
            </button>
          ))}
        </div>

        <div className="relative min-w-0">
          {provider !== 'ollama' ? (
            <div className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/30 text-[12px] pn-text" title="Set in Settings → AI">
              <Code size={13} className="text-sky-400 shrink-0" />
              <span className="text-[11px] px-2 py-1 rounded bg-sky-500/20 text-sky-200 font-medium">{PROVIDER_LABEL[provider]}</span>
              <span className="truncate text-slate-300">{cloudModel || '—'}</span>
            </div>
          ) : (
          <>
          <button
            onClick={() => setModelOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/30 hover:border-slate-600/50 text-[12px] pn-text transition"
          >
            <span className="truncate flex items-center gap-2">
              <Code size={13} className="text-emerald-400 shrink-0" />
              {model || (connected === false ? '⚠ no Ollama' : 'select model')}
            </span>
            <ChevronDown size={14} className={`shrink-0 transition ${modelOpen ? 'rotate-180' : ''}`} />
          </button>
          {modelOpen && (
            <div className="absolute right-0 top-11 z-20 w-full max-h-60 overflow-auto bg-slate-950 border border-slate-700/50 rounded-lg shadow-2xl py-1.5">
              {models.length === 0 && <div className="px-3 py-2 text-[12px] pn-faint">No models found</div>}
              {models.map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setModel(m)
                    setModelOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-[12px] hover:bg-slate-800/50 transition ${
                    m === model ? 'pn-text font-medium bg-slate-800/30' : 'pn-muted hover:pn-text'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
          </>
          )}
        </div>
      </div>

      {/* context panel — collapsible */}
      <div className="border-b pn-bd">
        <button
          onClick={() => setContextOpen(!contextOpen)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-800/50 transition text-[12px]"
        >
          <span className="flex items-center gap-1.5 pn-text font-medium">
            <Eye size={13} /> Context
          </span>
          <ChevronDown size={13} className={`transition ${contextOpen ? 'rotate-180' : ''}`} />
        </button>
        {contextOpen && (
          <div className="px-3 py-2 space-y-2 border-t pn-bd bg-slate-900/30 text-[11px]">
            {currentNotebook && (
              <div className="flex items-start gap-2">
                <FileText size={12} className="text-blue-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="pn-text font-medium truncate">{currentNotebook.name}</div>
                  <div className="pn-faint text-[10px]">{currentNotebook.cells.length} cells</div>
                </div>
              </div>
            )}
            {currentNotebook && currentNotebook.cells.length > 0 && (
              <div className="flex items-start gap-2 pt-1 border-t pn-bd">
                <Code size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="pn-text font-medium">Last cell</div>
                  <div className="pn-faint text-[10px] truncate">
                    {currentNotebook.cells[currentNotebook.cells.length - 1].cell_type}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* conversation — Chainlit style */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-w-0 bg-gradient-to-b from-slate-900 to-slate-950" style={{ fontSize }}>
        {/* Cloud provider selected but no API key → point to Settings */}
        {provider !== 'ollama' && connected === false && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[12.5px] pn-muted">
            <div className="flex items-center gap-2 text-amber-300 font-semibold mb-1.5">
              <Plug size={15} /> {PROVIDER_LABEL[provider]} not connected
            </div>
            No API key saved for {PROVIDER_LABEL[provider]}. Add one in <span className="pn-text">Settings → AI Provider</span> to use {cloudModel || 'this model'}.
          </div>
        )}
        {/* Ollama not detected → install guidance */}
        {provider === 'ollama' && connected === false && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
            <div className="flex items-center gap-2 text-amber-300 text-[13px] font-semibold mb-1.5">
              <Download size={15} /> Ollama not detected
            </div>
            <p className="text-[12.5px] pn-muted leading-relaxed mb-2">
              The agent runs on <span className="pn-text">local models via Ollama</span> — free, private, offline.
              Install it to enable AI:
            </p>
            <ol className="text-[12.5px] pn-muted space-y-1.5 mb-3 list-decimal pl-4">
              <li>
                Get Ollama:{' '}
                <a href="https://ollama.com/download" target="_blank" rel="noreferrer" className="text-blue-300 underline">
                  ollama.com/download
                </a>{' '}
                <span className="pn-faint">(or <code className="pn-code">brew install ollama</code>)</span>
              </li>
              <li>
                Pull a coding model: <code className="pn-code block mt-1 px-2 py-1 rounded pn-solid-bg">ollama pull qwen2.5-coder</code>
              </li>
              <li>
                Allow the browser: <code className="pn-code block mt-1 px-2 py-1 rounded pn-solid-bg break-all">OLLAMA_ORIGINS=http://localhost:5173 ollama serve</code>
              </li>
            </ol>
            <div className="flex gap-2">
              <a
                href="https://ollama.com/download"
                target="_blank"
                rel="noreferrer"
                className="flex-1 text-center px-3 py-1.5 rounded-lg prism-bg text-white text-[12.5px] font-medium hover:brightness-110"
              >
                Install Ollama
              </a>
              <button
                onClick={checkOllama}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 pn-text text-[12.5px]"
              >
                <RefreshCw size={13} /> Retry
              </button>
            </div>
          </div>
        )}

        {messages.length === 0 && connected !== false && (
          <div className="text-[13px] pn-faint leading-relaxed bg-slate-800/30 border border-slate-700/30 rounded-lg p-3 space-y-2">
            <div className="flex gap-2">
              <span className="text-sky-400 font-bold text-lg">✨</span>
              <div>
                <p className="pn-text font-medium mb-1">Welcome to PrismNote AI Chat</p>
                <p>
                  <span className="text-blue-300 font-medium">Plan</span> mode discusses your approach;{' '}
                  <span className="text-sky-300 font-medium">Act</span> mode writes and runs cell code.
                </p>
              </div>
            </div>
            <p className="text-slate-400">I can see your whole notebook. Ask me to load data, build charts, debug errors, or optimize queries.</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className="min-w-0">
            {m.text && (
              <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-xl p-3 ${
                    m.role === 'user'
                      ? 'bg-blue-500/20 border border-blue-500/40 text-blue-50 rounded-br-none'
                      : 'bg-slate-800/50 border border-slate-700/50 pn-text rounded-bl-none'
                  }`}
                >
                  {m.role === 'assistant' ? (
                    <div className="text-[13px] max-w-none [&_code]:bg-slate-900/50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-emerald-300 [&_pre]:bg-slate-900/50 [&_pre]:p-2 [&_pre]:rounded [&_pre]:overflow-x-auto">
                      <MDPreview source={stripActions(m.text) || (streaming && i === messages.length - 1 ? '…' : '')} />
                    </div>
                  ) : (
                    <div className="text-[13px] whitespace-pre-wrap break-words">{m.text}</div>
                  )}
                </div>
              </div>
            )}

            {/* action cards — Chainlit style */}
            {m.actions?.map((a) => {
              const meta = actionMeta[a.kind]
              const Icon = meta.icon
              return (
                <div key={a.id} className="mt-3 rounded-xl border border-slate-700/50 bg-slate-900/30 overflow-hidden min-w-0">
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 border-b border-slate-700/30">
                    <span className={`flex items-center gap-2 text-[12px] font-medium ${meta.color}`}>
                      <Icon size={14} /> {meta.label}
                      {a.index !== undefined && <span className="pn-faint text-[11px]">Cell {a.index}</span>}
                    </span>
                    {a.status === 'pending' ? (
                      <span className="flex items-center gap-1.5">
                        <button
                          onClick={() => runAction(i, a)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/25 text-emerald-300 hover:bg-emerald-500/35 text-[11px] font-medium transition"
                        >
                          <Check size={12} /> Run
                        </button>
                        <button
                          onClick={() => rejectAction(i, a.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-700/50 text-slate-400 hover:text-slate-300 hover:bg-slate-700 text-[11px] font-medium transition"
                        >
                          <Ban size={12} /> Skip
                        </button>
                      </span>
                    ) : (
                      <span className={`text-[11px] font-medium ${a.status === 'done' ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {a.status === 'done' ? '✓ Applied' : 'Skipped'}
                      </span>
                    )}
                  </div>
                  {a.code && (
                    <pre className="px-3 py-2 text-[12px] pn-muted font-mono overflow-x-auto whitespace-pre min-w-0 max-w-full bg-slate-950/50 border-t border-slate-700/30">{a.code}</pre>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {streaming && (
          <div className="flex items-center gap-2 pn-muted text-[13px]">
            <Loader size={14} className="animate-spin" /> {mode === 'plan' ? 'planning' : 'thinking'}…
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* prompt input — Chainlit style */}
      <div className="p-3 border-t pn-bd">
        <div className="flex items-end gap-2 bg-slate-900/50 border border-slate-700/50 rounded-xl px-3 py-2 focus-within:border-blue-500/70 focus-within:bg-slate-900/70 transition">
          <CircleDot size={16} className={`mb-1.5 shrink-0 ${mode === 'act' ? 'text-sky-400' : 'text-blue-400'}`} />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            rows={1}
            placeholder={mode === 'plan' ? 'Ask me to plan something…' : 'Tell me what to build…'}
            className="flex-1 bg-transparent outline-none text-[13px] pn-text resize-none max-h-32 py-1"
          />
          <button
            onClick={send}
            disabled={streaming || !input.trim()}
            className="mb-1 text-blue-300 hover:text-blue-100 p-1 disabled:opacity-40 transition hover:bg-blue-500/10 rounded-lg"
            title="Send message (Shift+Enter for new line)"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}

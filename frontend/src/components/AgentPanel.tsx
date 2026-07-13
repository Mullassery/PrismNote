import { useCallback, useEffect, useRef, useState } from 'react'
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

export default function AgentPanel({ onClose, inBottomPanel = false }: { onClose: () => void; inBottomPanel?: boolean }) {
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
  const sessionIdRef = useRef(Date.now().toString())
  const endRef = useRef<HTMLDivElement>(null)

  // Load conversation history from session storage on mount
  useEffect(() => {
    if (!currentNotebook?.id) {
      setMessages([])
      return
    }
    const sessionKey = `pn-ai-session-${currentNotebook.id}`
    const saved = localStorage.getItem(sessionKey)
    if (saved) {
      try {
        setMessages(JSON.parse(saved))
      } catch {
        // Session corrupted, start fresh
        setMessages([])
      }
    } else {
      setMessages([])
    }
  }, [currentNotebook?.id])

  // Save conversation history to session storage
  useEffect(() => {
    if (!currentNotebook?.id || messages.length === 0) return
    const sessionKey = `pn-ai-session-${currentNotebook.id}`
    try {
      localStorage.setItem(sessionKey, JSON.stringify(messages))
    } catch {
      // Storage full or other error, continue silently
    }
  }, [messages, currentNotebook?.id])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

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
  useEffect(() => {
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
    loadConfig()
    window.addEventListener('pn-ai-config', loadConfig)
    return () => window.removeEventListener('pn-ai-config', loadConfig)
  }, [])

  // Auto-retry Ollama detection if it failed initially
  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    if (provider === 'ollama' && connected === false && models.length === 0) {
      retryTimer = setTimeout(() => checkOllama(), 1500)
    }
    return () => {
      if (retryTimer !== undefined) clearTimeout(retryTimer)
    }
  }, [provider, connected, models.length])

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
          const errorMsg = e?.response?.data?.error || e?.message || 'Check your API key in Settings → AI'
          copy[copy.length - 1] = { role: 'assistant', text: `**Error:** ${PROVIDER_LABEL[provider]} request failed\n\n\`${errorMsg}\`` }
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
          text: `**Error:** Couldn't reach Ollama at \`${ollamaEndpoint()}\`\n\nMake sure it's running:\n\`\`\`\nOLLAMA_ORIGINS=http://localhost:5173 ollama serve\n\`\`\``,
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
    <aside className={`${inBottomPanel ? 'flex-1' : 'w-96 shrink-0'} pn-surface ${!inBottomPanel ? 'border-l' : ''} pn-bd flex flex-col overflow-hidden`}>
      {/* header */}
      <div className="px-4 py-3 border-b pn-bd space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[14px] font-bold pn-text">
            <Sparkles size={16} className="text-indigo-600" /> Chat
          </span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => { setMessages([]); localStorage.removeItem(`pn-ai-session-${currentNotebook?.id}`) }}
              title="Start new conversation"
              className="pn-muted hover:pn-text p-1.5 rounded-lg hover:bg-white/10 transition"
            >
              <Plus size={14} />
            </button>
            <button onClick={dec} title="Decrease font size" className="pn-muted hover:pn-text p-1.5 rounded-lg hover:bg-white/10 transition"><Minus size={14} /></button>
            <span className="text-[10px] tabular-nums w-3 text-center pn-faint" title="Panel font size">{fontSize}</span>
            <button onClick={inc} title="Increase font size" className="pn-muted hover:pn-text p-1.5 rounded-lg hover:bg-white/10 transition"><Plus size={14} /></button>
            <button onClick={onClose} className="pn-muted hover:pn-text p-1.5 rounded-lg hover:bg-white/10 transition">
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ${
              connected === false ? 'bg-red-500/20 text-red-400' : connected ? 'bg-green-500/20 text-green-400' : 'bg-white/10 pn-faint'
            }`}
            title={`${PROVIDER_LABEL[provider]} connection`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${connected === false ? 'bg-red-500' : connected ? 'bg-green-500' : 'bg-white/40'}`} />
            {connected === false
              ? `${PROVIDER_LABEL[provider]}: ${provider === 'ollama' ? 'offline' : 'no key'}`
              : connected
              ? `${PROVIDER_LABEL[provider]} connected`
              : 'checking…'}
          </span>
          {currentNotebook && <span className="pn-faint text-[10px]">{currentNotebook.cells.length} cells in notebook</span>}
        </div>
      </div>

      {/* mode toggle + model picker */}
      <div className="px-4 py-2.5 border-b pn-bd space-y-2.5">
        <div className="flex rounded-lg bg-white/10 p-1 text-[12px] gap-1">
          {(['plan', 'act'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md capitalize font-semibold transition ${
                mode === m ? 'pn-surface text-indigo-400 shadow-sm' : 'pn-faint hover:pn-text'
              }`}
            >
              {m === 'plan' ? <Wand2 size={13} /> : <Play size={13} />}
              {m}
            </button>
          ))}
        </div>

        <div className="relative min-w-0">
          {provider !== 'ollama' ? (
            <div className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-[12px] pn-text" title="Set in Settings → AI">
              <Code size={13} className="text-indigo-400 shrink-0" />
              <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-300 font-medium">{PROVIDER_LABEL[provider]}</span>
              <span className="truncate pn-muted flex-1">{cloudModel || '—'}</span>
            </div>
          ) : (
          <>
          <button
            onClick={() => setModelOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg pn-surface border pn-bd hover:border-indigo-500/40 text-[12px] pn-text transition"
          >
            <span className="truncate flex items-center gap-2">
              <Code size={13} className="text-indigo-400 shrink-0" />
              <span className="pn-muted">{model || (connected === false ? '⚠ No Ollama' : 'Select model')}</span>
            </span>
            <ChevronDown size={13} className={`shrink-0 pn-faint transition ${modelOpen ? 'rotate-180' : ''}`} />
          </button>
          {modelOpen && (
            <div className="absolute right-0 top-11 z-20 w-full max-h-60 overflow-auto pn-surface border pn-bd rounded-lg shadow-xl py-1">
              {models.length === 0 && connected && (
                <div className="px-3 py-3 text-[11px] space-y-2 pn-faint">
                  <div className="text-amber-300 font-semibold">Pull a model first</div>
                  <code className="block text-[9px] bg-black/20 p-1 rounded font-mono">ollama pull mistral</code>
                  <button
                    onClick={() => { checkOllama(); setModelOpen(false); }}
                    className="w-full text-left px-2 py-1.5 rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 text-[10px] font-medium"
                  >
                    Refresh ↻
                  </button>
                </div>
              )}
              {models.length === 0 && !connected && <div className="px-3 py-2 text-[12px] pn-faint">Start Ollama to continue</div>}
              {models.map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setModel(m)
                    setModelOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-[12px] hover:bg-white/5 transition ${
                    m === model ? 'text-indigo-400 font-semibold bg-indigo-500/20' : 'pn-text'
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
      <div className="border-b pn-bd bg-white/5">
        <button
          onClick={() => setContextOpen(!contextOpen)}
          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/10 transition text-[12px]"
        >
          <span className="flex items-center gap-2 pn-text font-semibold">
            <Eye size={13} /> Context
          </span>
          <ChevronDown size={13} className={`transition pn-faint ${contextOpen ? 'rotate-180' : ''}`} />
        </button>
        {contextOpen && (
          <div className="px-4 py-2.5 space-y-1.5 border-t pn-bd text-[10px]">
            {currentNotebook ? (
              <div className="pn-faint space-y-1">
                <div className="truncate"><strong>{currentNotebook.name}</strong> • {currentNotebook.cells.length} cells</div>
              </div>
            ) : (
              <div className="pn-faint">No notebook open</div>
            )}
          </div>
        )}
      </div>

      {/* conversation — Chainlit style */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-w-0" style={{ fontSize }}>
        {/* Cloud provider selected but no API key → point to Settings */}
        {provider !== 'ollama' && connected === false && (
          <div className="rounded-lg border border-amber-600/40 bg-amber-500/20 p-3 text-[12px]">
            <div className="flex items-center gap-2 text-amber-300 font-semibold mb-1">
              <Plug size={14} /> {PROVIDER_LABEL[provider]} not connected
            </div>
            <p className="text-amber-200">Add your API key in Settings → AI Provider to use {cloudModel || 'this model'}.</p>
          </div>
        )}
        {/* Ollama not detected → install guidance */}
        {provider === 'ollama' && connected === false && (
          <div className="rounded-lg border border-amber-600/40 bg-amber-500/20 p-2.5 text-[11px] space-y-1.5">
            <div className="text-amber-300 font-semibold">Ollama offline</div>
            <p className="pn-faint text-[10px]">
              Install: <a href="https://ollama.com/download" target="_blank" rel="noreferrer" className="text-amber-300 underline">ollama.com</a>
            </p>
            <code className="block text-[9px] bg-black/20 p-1.5 rounded font-mono pn-faint">OLLAMA_ORIGINS=http://localhost:5173 ollama serve</code>
            <button
              onClick={checkOllama}
              className="text-amber-300 hover:text-amber-200 text-[10px] font-medium"
            >
              Retry →
            </button>
          </div>
        )}

        {messages.length === 0 && connected !== false && (
          <div className="text-[12px] bg-indigo-500/15 border border-indigo-500/30 rounded-lg p-3 space-y-1.5">
            <p className="font-semibold text-indigo-300">Ask anything</p>
            <p className="pn-faint text-[11px]">Plan mode: discuss approach • Act mode: write code</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className="min-w-0 flex" style={{ justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div className="flex flex-col gap-2 max-w-[85%]">
              {/* Message bubble */}
              {m.text && (
                <div
                  className={`rounded-xl p-3.5 ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/10 pn-text border border-white/20'
                  }`}
                >
                  {m.role === 'assistant' ? (
                    <div className="text-[12px] max-w-none [&_code]:bg-black/40 [&_code]:text-amber-300 [&_code]:px-2 [&_code]:py-1 [&_code]:rounded [&_code]:font-mono [&_pre]:bg-black/40 [&_pre]:text-gray-100 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:text-[11px] [&_pre]:my-2 [&_a]:text-indigo-400 [&_a]:underline">
                      <MDPreview source={stripActions(m.text) || (streaming && i === messages.length - 1 ? '…' : '')} />
                    </div>
                  ) : (
                    <div className="text-[12px] whitespace-pre-wrap break-words">{m.text}</div>
                  )}
                </div>
              )}

              {/* Action cards */}
              {m.actions?.map((a) => {
                const meta = actionMeta[a.kind]
                const Icon = meta.icon
                const colorMap = { 'text-emerald-400': '#10b981', 'text-amber-400': '#f59e0b', 'text-blue-400': '#3b82f6' }
                const iconColor = colorMap[meta.color as keyof typeof colorMap] || '#3b82f6'
                return (
                  <div key={a.id} className="rounded-lg border border-white/20 bg-white/5 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between px-3.5 py-2.5 bg-white/10 border-b border-white/20">
                      <span className="flex items-center gap-2 text-[11px] font-semibold pn-text">
                        <Icon size={13} style={{ color: iconColor }} /> {meta.label}
                        {a.index !== undefined && <span className="pn-faint font-normal text-[10px]">Cell {a.index}</span>}
                      </span>
                      {a.status === 'pending' ? (
                        <span className="flex items-center gap-2">
                          <button
                            onClick={() => runAction(i, a)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 text-[10px] font-semibold transition border border-green-500/40"
                          >
                            <Check size={11} /> Run
                          </button>
                          <button
                            onClick={() => rejectAction(i, a.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/10 pn-muted hover:bg-white/20 text-[10px] font-semibold transition"
                          >
                            <Ban size={11} /> Skip
                          </button>
                        </span>
                      ) : (
                        <span className={`text-[10px] font-semibold ${a.status === 'done' ? 'text-green-400' : 'pn-faint'}`}>
                          {a.status === 'done' ? '✓ Applied' : 'Skipped'}
                        </span>
                      )}
                    </div>
                    {a.code && (
                      <pre className="px-3.5 py-2.5 text-[11px] pn-text font-mono overflow-x-auto whitespace-pre bg-black/40 border-t border-white/20">{a.code}</pre>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {streaming && (
          <div className="flex items-center gap-2 pn-faint text-[12px]">
            <Loader size={13} className="animate-spin" /> {mode === 'plan' ? 'Planning' : 'Thinking'}…
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* prompt input — Chainlit style */}
      <div className="p-3.5 border-t pn-bd pn-surface">
        <div className="flex items-end gap-2 bg-white/10 border border-white/20 rounded-xl px-3.5 py-2.5 focus-within:border-indigo-400/60 focus-within:bg-white/15 focus-within:shadow-md transition">
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
            placeholder={mode === 'plan' ? 'Discuss your approach…' : 'Write code, analyze data…'}
            className="flex-1 bg-transparent outline-none text-[13px] pn-text resize-none max-h-24 py-1 placeholder-white/40"
          />
          <button
            onClick={send}
            disabled={streaming || !input.trim()}
            className="text-indigo-400 hover:text-indigo-300 p-1.5 disabled:opacity-40 transition hover:bg-indigo-500/20 rounded-lg"
            title="Send message (Shift+Enter for new line)"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[9px] pn-faint mt-1.5 px-1">Shift+Enter for new line</p>
      </div>
    </aside>
  )
}

// SQL and Ollama-powered inline code completion for Monaco.
// SQL: registered once globally, fetches completions from /api/sql/complete
// Ollama: only produces suggestions when Ollama is reachable.
// Throttled + cached to avoid hammering servers.

import { ollamaEndpoint } from './ai'

const OLLAMA = () => ollamaEndpoint()
let registeredSql = false
let registeredOllama = false
let cachedModel: { name: string | null; at: number } = { name: null, at: 0 }
let lastCall = 0
let lastSqlCall = 0

async function ollamaModel(): Promise<string | null> {
  // cache the model name for 30s to avoid a /tags round-trip per keystroke
  if (Date.now() - cachedModel.at < 30_000) return cachedModel.name
  try {
    const r = await fetch(`${OLLAMA()}/api/tags`)
    const d = r.ok ? await r.json() : null
    cachedModel = { name: d?.models?.[0]?.name ?? null, at: Date.now() }
  } catch {
    cachedModel = { name: null, at: Date.now() }
  }
  return cachedModel.name
}

export function registerSqlCompletions(monaco: any) {
  if (registeredSql) return
  registeredSql = true

  // Register SQL completion provider for SQL language
  monaco.languages.registerCompletionItemProvider('sql', {
    triggerCharacters: [' ', '.', '('],
    async provideCompletionItems(model: any, position: any) {
      // throttle: at most one request every 300ms
      const now = Date.now()
      if (now - lastSqlCall < 300) return { suggestions: [] }
      lastSqlCall = now

      // Get the word/prefix being typed
      const word = model.getWordUntilPosition(position)
      const prefix = model.getValueInRange({
        startLineNumber: Math.max(1, position.lineNumber - 1),
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      })

      if (!prefix.trim() && !word.word) return { suggestions: [] }

      try {
        const res = await fetch('/api/sql/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prefix: word.word || prefix }),
        })

        if (!res.ok) return { suggestions: [] }
        const suggestions = await res.json()

        return {
          suggestions: suggestions.map((s: any) => ({
            label: s.label,
            kind: mapCompletionKind(s.kind, monaco),
            detail: s.detail,
            documentation: s.documentation,
            insertText: s.label,
            sortText: s.sort_text || s.label,
            range: new monaco.Range(
              position.lineNumber,
              word.startColumn,
              position.lineNumber,
              position.column,
            ),
          })),
        }
      } catch {
        return { suggestions: [] }
      }
    },
  })

  // Also register for Python SQL magic cells (%sql, --sql, etc)
  monaco.languages.registerCompletionItemProvider('python', {
    triggerCharacters: [' ', '.', '('],
    async provideCompletionItems(model: any, position: any) {
      const line = model.getLineContent(position.lineNumber)

      // Only provide SQL suggestions if line starts with SQL magic
      if (!line.trim().startsWith('%sql') && !line.trim().startsWith('--sql')) {
        return { suggestions: [] }
      }

      // Get prefix
      const word = model.getWordUntilPosition(position)
      if (!word.word) return { suggestions: [] }

      try {
        const res = await fetch('/api/sql/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prefix: word.word }),
        })

        if (!res.ok) return { suggestions: [] }
        const suggestions = await res.json()

        return {
          suggestions: suggestions.map((s: any) => ({
            label: s.label,
            kind: mapCompletionKind(s.kind, monaco),
            detail: s.detail,
            documentation: s.documentation,
            insertText: s.label,
            sortText: s.sort_text || s.label,
            range: new monaco.Range(
              position.lineNumber,
              word.startColumn,
              position.lineNumber,
              position.column,
            ),
          })),
        }
      } catch {
        return { suggestions: [] }
      }
    },
  })
}

function mapCompletionKind(kind: string, monaco: any): number {
  const kinds: { [key: string]: number } = {
    keyword: monaco.languages.CompletionItemKind.Keyword,
    function: monaco.languages.CompletionItemKind.Function,
    table: monaco.languages.CompletionItemKind.Struct,
    column: monaco.languages.CompletionItemKind.Field,
  }
  return kinds[kind] || monaco.languages.CompletionItemKind.Text
}

export function registerOllamaCompletions(monaco: any) {
  if (registeredOllama) return
  registeredOllama = true

  monaco.languages.registerInlineCompletionsProvider(['python'], {
    async provideInlineCompletions(model: any, position: any) {
      // throttle: at most one request ~every 500ms
      const now = Date.now()
      if (now - lastCall < 500) return { items: [] }
      lastCall = now

      const prefix = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      })
      if (!prefix.trim()) return { items: [] }

      const mdl = await ollamaModel()
      if (!mdl) return { items: [] } // Ollama not connected → no suggestions

      try {
        const res = await fetch(`${OLLAMA()}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: mdl,
            prompt:
              'You are a Python autocomplete engine inside a data-science notebook. ' +
              'Continue the code from the cursor. Output ONLY the raw continuation — ' +
              'no markdown fences, no commentary.\n\n' +
              prefix,
            stream: false,
            options: { temperature: 0.1, num_predict: 64, stop: ['\n\n', '```'] },
          }),
        })
        if (!res.ok) return { items: [] }
        const d = await res.json()
        const text: string = (d.response || '').replace(/```/g, '')
        if (!text.trim()) return { items: [] }
        return {
          items: [
            {
              insertText: text,
              range: new monaco.Range(
                position.lineNumber,
                position.column,
                position.lineNumber,
                position.column,
              ),
            },
          ],
        }
      } catch {
        return { items: [] }
      }
    },
    // Monaco requires both on the provider; missing disposeInlineCompletions
    // throws a TypeError when the editor disposes the provider.
    freeInlineCompletions() {},
    disposeInlineCompletions() {},
    handleItemDidShow() {},
  })
}

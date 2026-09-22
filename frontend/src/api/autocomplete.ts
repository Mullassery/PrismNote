// SQL and Ollama-powered inline code completion for Monaco.
// SQL: registered once globally, fetches completions from /api/sql/complete
// Ollama: only produces suggestions when Ollama is reachable.
// Throttled + cached to avoid hammering servers.

import { ollamaEndpoint } from './ai'
import type { Monaco } from '@monaco-editor/react'
import type { editor as MonacoEditorNS, Position, languages } from 'monaco-editor'

/** Shape returned by the backend's `/api/sql/complete` endpoint. */
interface SqlCompletionSuggestion {
  label: string
  kind: string
  detail?: string
  documentation?: string
  sort_text?: string
}

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

export function registerSqlCompletions(monaco: Monaco) {
  if (registeredSql) return
  registeredSql = true

  // Register SQL completion provider for SQL language
  const sqlProvider: languages.CompletionItemProvider = {
    triggerCharacters: [' ', '.', '('],
    async provideCompletionItems(model, position) {
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
        const suggestions: SqlCompletionSuggestion[] = await res.json()

        return {
          suggestions: suggestions.map((s) => ({
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
  }
  monaco.languages.registerCompletionItemProvider('sql', sqlProvider)

  // Also register for Python SQL magic cells (%sql, --sql, etc)
  const pythonSqlProvider: languages.CompletionItemProvider = {
    triggerCharacters: [' ', '.', '('],
    async provideCompletionItems(model, position) {
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
        const suggestions: SqlCompletionSuggestion[] = await res.json()

        return {
          suggestions: suggestions.map((s) => ({
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
  }
  monaco.languages.registerCompletionItemProvider('python', pythonSqlProvider)
}

function mapCompletionKind(kind: string, monaco: Monaco): languages.CompletionItemKind {
  const kinds: { [key: string]: languages.CompletionItemKind } = {
    keyword: monaco.languages.CompletionItemKind.Keyword,
    function: monaco.languages.CompletionItemKind.Function,
    table: monaco.languages.CompletionItemKind.Struct,
    column: monaco.languages.CompletionItemKind.Field,
  }
  return kinds[kind] ?? monaco.languages.CompletionItemKind.Text
}

export function registerOllamaCompletions(monaco: Monaco) {
  if (registeredOllama) return
  registeredOllama = true

  // Not explicitly typed as `languages.InlineCompletionsProvider` — this
  // provider also implements `freeInlineCompletions`, an older Monaco
  // provider method no longer in this package's shipped types but still
  // required at runtime by the editor's inline-completions host (see
  // comment below); an explicit annotation here would trigger an excess-
  // property error on that extra method. Passing the untyped-but-inferred
  // object into registerInlineCompletionsProvider still gets it checked
  // structurally against the real interface, just without that false
  // positive.
  const ollamaProvider = {
    async provideInlineCompletions(model: MonacoEditorNS.ITextModel, position: Position) {
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
  }
  monaco.languages.registerInlineCompletionsProvider(['python'], ollamaProvider)
}

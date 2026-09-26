import axios from 'axios'
import type { Monaco } from '@monaco-editor/react'
import type { editor as MonacoEditorNS } from 'monaco-editor'

/** Pretty-print Python via the backend (Black → autopep8). Returns the original
 *  code on any failure so formatting never loses the user's work. */
export const formatCode = (code: string): Promise<string> =>
  axios
    .post<{ code: string; changed: boolean }>('/api/format', { code })
    .then((r) => r.data.code)
    .catch(() => code)

let registered = false

/** Register Python formatting providers once. Black formats whole files, so the
 *  range provider (used by format-on-paste) reformats the entire model too. */
export function registerPythonFormatter(monaco: Monaco) {
  if (registered) return
  registered = true

  const formatWhole = async (model: MonacoEditorNS.ITextModel) => {
    const src = model.getValue()
    const formatted = await formatCode(src)
    if (formatted === src) return []
    return [{ range: model.getFullModelRange(), text: formatted }]
  }

  monaco.languages.registerDocumentFormattingEditProvider('python', {
    provideDocumentFormattingEdits: (model: MonacoEditorNS.ITextModel) => formatWhole(model),
  })
  monaco.languages.registerDocumentRangeFormattingEditProvider('python', {
    provideDocumentRangeFormattingEdits: (model: MonacoEditorNS.ITextModel) => formatWhole(model),
  })
}

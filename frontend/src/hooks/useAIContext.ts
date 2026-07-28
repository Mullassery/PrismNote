import { create } from 'zustand'

// Shared "what the user is looking at" context, so the AI panel understands more
// than just notebook cells: the open dataset (Data Explorer) and the workspace
// files (File/Server Explorer). Panels publish here; the agent reads it.
interface DatasetCtx {
  title: string
  columns: string[]
  shape?: [number, number]
}

interface AIContextState {
  dataset: DatasetCtx | null
  workspace: string | null
  files: string[]
  setDataset: (d: DatasetCtx | null) => void
  setWorkspace: (name: string | null, files: string[]) => void
}

export const useAIContext = create<AIContextState>((set) => ({
  dataset: null,
  workspace: null,
  files: [],
  setDataset: (dataset) => set({ dataset }),
  setWorkspace: (workspace, files) => set({ workspace, files }),
}))

/** Strip secrets from code/strings to prevent credential leakage to AI model.
 * WARNING: This is a heuristic filter, not cryptographically secure. Users should
 * avoid pasting real secrets into notebooks. */
export function sanitizeForAI(text: string): string {
  return text
    // Hide API keys: "key=...", "KEY: ...", "XXXXXXXXXXXXXXXX" patterns
    .replace(/(['"]?(?:api[_-]?)?key['"]?\s*[:=]\s*)([a-zA-Z0-9_\-\.]+|'[^']*'|"[^"]*")/gi, '$1[REDACTED]')
    // Hide common credential patterns: passwords, tokens, secrets
    .replace(/(['"]?(?:password|passwd|pwd|token|secret|api[_-]?secret)['"]?\s*[:=]\s*)([^\s,;}\]]+|'[^']*'|"[^"]*")/gi, '$1[REDACTED]')
    // Hide OAuth/Bearer tokens: "Bearer XXXXX"
    .replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'bearer [REDACTED]')
    // Hide connection strings with passwords: postgresql://user:pass@host
    .replace(/([a-z]+:\/\/[^:]+:)[^@]+(@)/gi, '$1[REDACTED]$2')
    // Hide email+password combos
    .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+)[\"'\s]*[:=,]\s*[^\s,;}\]"']+/g, '$1:[REDACTED]')
}

/** Render the environment block injected into the AI agent's system prompt. */
export function buildEnvironmentContext(): string {
  const { dataset, workspace, files } = useAIContext.getState()
  const parts: string[] = []
  // PrismNote is a local, single-user application — there is no login/account.
  // AI has access to all data visible in the notebook and data explorer,
  // but Settings/Security tabs are off-limits (never sent to AI).
  parts.push('Session: local workspace (no account / login).')
  if (workspace) {
    const list = files.slice(0, 40).join(', ')
    parts.push(`Workspace folder: ${workspace}${list ? `\nFiles: ${list}${files.length > 40 ? ', …' : ''}` : ''}`)
  }
  if (dataset) {
    const shape = dataset.shape ? ` (${dataset.shape[0]}×${dataset.shape[1]})` : ''
    parts.push(`Open dataset in Data Explorer: ${dataset.title}${shape}\nColumns: ${dataset.columns.slice(0, 60).join(', ')}`)
  }
  return parts.join('\n\n')
}

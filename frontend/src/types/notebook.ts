// Shared notebook/cell/output types.
//
// The backend speaks a Jupyter-nbformat-flavored protocol: cell outputs are
// MIME bundles (`{ "text/plain": "...", "image/png": "base64..." }`) whose
// exact shape depends on `output_type`. These types describe that contract
// as precisely as it's reasonably knowable from the frontend; genuinely
// free-form bits (MIME bundle values, widget values, cell/notebook metadata)
// stay as `unknown` rather than `any` so callers are forced to narrow before
// use.

import type { CellLanguage as FullCellLanguage } from '../lib/languages'

/** A single entry in a Jupyter-style MIME output bundle. String values are
 * the common case; some renderers (e.g. streamed text) split the value into
 * an array of chunks that get joined. */
export type MimeValue = string | string[] | Record<string, unknown> | number | boolean | null

export type MimeBundle = Record<string, MimeValue>

export interface CellOutput {
  output_type: 'stream' | 'execute_result' | 'display_data' | 'error' | string
  // stream
  name?: string
  text?: string | string[]
  // execute_result / display_data
  data?: MimeBundle
  metadata?: Record<string, unknown>
  execution_count?: number | null
  // error
  ename?: string
  evalue?: string
  traceback?: string[]
}

// Re-exported from lib/languages.ts (the single source of truth for which
// languages a cell can be — 14 total, not just the 4 this alias used to
// declare on its own before that mismatch was caught by typing Cell.tsx/
// useNotebookRedux.ts's `language` plumbing: cells can genuinely be
// markdown/cpp/rust/etc, per LanguageSelector and lib/codeExecutor's per-
// language executors, and always could be at runtime — this was simply
// never enforced before those call sites were `any`).
export type CellLanguage = FullCellLanguage

export interface Cell {
  id: string
  cell_type: 'code' | 'markdown'
  language?: CellLanguage
  source: string[] | string
  outputs: CellOutput[]
  execution_count: number | null
  metadata: Record<string, unknown>
  // SQL-specific metadata
  sqlConnection?: string
}

export interface Notebook {
  id: string
  name: string
  cells: Cell[]
  metadata: Record<string, unknown>
}

/** `Cell.source` is stored as an array of line-chunks (so edits round-trip
 * without losing newlines) but a few call sites have historically also
 * accepted a plain string. Normalizes either into the joined text. */
export function cellSourceText(source: string[] | string | undefined | null): string {
  if (Array.isArray(source)) return source.join('')
  return source ?? ''
}

/** A tabular result (e.g. a pandas DataFrame or SQL query result) delivered
 * via the `application/vnd.prismnote.df+json` MIME type. Cell values are
 * `unknown` because a dataframe column can hold any JSON-serializable type. */
export interface DataFrame {
  columns: (string | number)[]
  data: unknown[][]
}

/** Narrows an arbitrary JSON value (e.g. a parsed MIME-bundle payload) down
 * to the `{ columns, data }` shape a dataframe view expects. */
export function isDataFrame(value: unknown): value is DataFrame {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return Array.isArray(v.columns) && Array.isArray(v.data)
}

/** Shape of a raw `.ipynb` file as read from / written to disk (nbformat).
 * Deliberately looser than `Cell`/`Notebook` (all fields optional, no `id`)
 * since it's parsed from a file the user picked — it may be hand-edited,
 * from an older nbformat version, or just malformed. Callers that build a
 * `Notebook` from this should treat every field as possibly absent. */
export interface IpynbCellRaw {
  cell_type?: 'code' | 'markdown'
  source?: string[] | string
  outputs?: CellOutput[]
  execution_count?: number | null
  metadata?: Record<string, unknown>
}

export interface IpynbRaw {
  cells?: IpynbCellRaw[]
  metadata?: Record<string, unknown>
}

/** Minimal shape check for a value parsed from a `.ipynb` file: just enough
 * to safely read `.cells`/`.metadata` off it with `??` fallbacks, the way
 * the notebook-import code already does. Does not validate nbformat version
 * or per-cell structure — malformed cells are the caller's problem to
 * tolerate (and they already do, via `??` defaults). */
export function isIpynbRaw(value: unknown): value is IpynbRaw {
  return typeof value === 'object' && value !== null
}

/** Spec for an interactive `prism.input`/`slider`/`select`/`checkbox` widget,
 * delivered via the `application/vnd.prismnote.widget+json` MIME type. */
export interface WidgetSpec {
  name: string
  type: 'text' | 'slider' | 'select' | 'checkbox'
  value?: string | number | boolean
  min?: number
  max?: number
  options?: Array<string | number>
}

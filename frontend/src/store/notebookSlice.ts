import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import axios from 'axios'

const API_BASE = '/api'

export type CellLanguage = 'python' | 'sql' | 'r' | 'javascript'

interface Cell {
  id: string
  cell_type: 'code' | 'markdown'
  language?: CellLanguage // NEW: language for code cells (default: 'python' for backward compat)
  source: string[]
  outputs: any[]
  execution_count: number | null
  metadata: Record<string, any>
  // SQL-specific metadata
  sqlConnection?: string // Connection ID for SQL cells
}

interface Notebook {
  id: string
  name: string
  cells: Cell[]
  metadata: Record<string, any>
}

interface LibrarySuggestion {
  name: string
  version: string
  description: string
  reasoning: string
  installed_version?: string
  is_update: boolean
  category: 'data' | 'viz' | 'ml' | 'web' | 'utility'
  confidence: number
}

interface NotebookState {
  notebooks: Notebook[]
  currentNotebookId: string | null
  currentNotebook: Notebook | null
  selectedCellIndex: number | null
  clipboardCell: Cell | null
  librarySuggestions: LibrarySuggestion[]
  suggestionsIntent: string
  suggestionsSummary: string
  suggestionsLoading: boolean
}

const initialState: NotebookState = {
  notebooks: [],
  currentNotebookId: null,
  currentNotebook: null,
  selectedCellIndex: null,
  clipboardCell: null,
  librarySuggestions: [],
  suggestionsIntent: '',
  suggestionsSummary: '',
  suggestionsLoading: false,
}

// Async thunks
export const createNotebook = createAsyncThunk(
  'notebook/createNotebook',
  async (name: string) => {
    const res = await axios.post(`${API_BASE}/notebooks`, { name })
    return res.data
  }
)

export const deleteNotebook = createAsyncThunk(
  'notebook/deleteNotebook',
  async (id: string) => {
    await axios.delete(`${API_BASE}/notebooks/${id}`)
    return id
  }
)

export const setCurrentNotebook = createAsyncThunk(
  'notebook/setCurrentNotebook',
  async (id: string) => {
    const res = await axios.get(`${API_BASE}/notebooks/${id}`)
    return res.data
  }
)

export const executeCell = createAsyncThunk(
  'notebook/executeCell',
  async ({
    notebookId,
    cellId,
    code,
    language,
    sqlConnection,
  }: {
    notebookId: string
    cellId: string
    code: string
    language?: CellLanguage
    sqlConnection?: string
  }) => {
    const res = await axios.post(`${API_BASE}/notebooks/${notebookId}/execute`, {
      cell_id: cellId,
      code,
      language: language || 'python', // Default to Python for backward compat
      sql_connection: sqlConnection, // For SQL cells
    })
    return { cellId, ...res.data }
  }
)

export const saveNotebook = createAsyncThunk(
  'notebook/saveNotebook',
  async (notebook: Notebook) => {
    await axios.put(`${API_BASE}/notebooks/${notebook.id}`, { notebook })
    return notebook
  }
)

export const suggestLibraries = createAsyncThunk(
  'notebook/suggestLibraries',
  async (notebookId: string, { getState }: any) => {
    const state = getState()
    const notebook = state.notebook.currentNotebook
    if (!notebook) return null

    const notebookCode = notebook.cells
      .filter((c: Cell) => c.cell_type === 'code')
      .map((c: Cell) => (Array.isArray(c.source) ? c.source.join('') : c.source))
      .join('\n\n')

    const res = await axios.post(`${API_BASE}/notebooks/${notebookId}/suggest-libraries`, {
      notebook_code: notebookCode,
      installed_packages: [],
      ignored_libraries: [],
    })
    return res.data
  }
)

export const ignoreLibrary = createAsyncThunk(
  'notebook/ignoreLibrary',
  async ({ notebookId, libraryName }: { notebookId: string; libraryName: string }) => {
    await axios.post(`${API_BASE}/notebooks/${notebookId}/libraries/ignore`, {
      library_name: libraryName,
      reason: 'User ignored',
    })
    return libraryName
  }
)

const notebookSlice = createSlice({
  name: 'notebook',
  initialState,
  reducers: {
    addCell: (state, action: PayloadAction<{ type: 'code' | 'markdown'; index?: number }>) => {
      if (!state.currentNotebook) return
      const newCell: Cell = {
        id: Math.random().toString(36),
        cell_type: action.payload.type,
        source: [],
        outputs: [],
        execution_count: null,
        metadata: {},
      }
      const at = action.payload.index == null ? state.currentNotebook.cells.length : Math.max(0, Math.min(action.payload.index, state.currentNotebook.cells.length))
      state.currentNotebook.cells.splice(at, 0, newCell)
    },

    updateCell: (state, action: PayloadAction<{ index: number; updates: Partial<Cell> }>) => {
      if (!state.currentNotebook) return
      const cells = state.currentNotebook.cells
      if (cells[action.payload.index]) {
        cells[action.payload.index] = { ...cells[action.payload.index], ...action.payload.updates }
      }
    },

    deleteCell: (state, action: PayloadAction<number>) => {
      if (!state.currentNotebook) return
      state.currentNotebook.cells.splice(action.payload, 1)
      if (state.selectedCellIndex !== null) {
        state.selectedCellIndex = Math.min(state.selectedCellIndex, state.currentNotebook.cells.length - 1)
      }
    },

    setSelectedCell: (state, action: PayloadAction<number | null>) => {
      state.selectedCellIndex = action.payload
    },

    moveCell: (state, action: PayloadAction<{ index: number; dir: -1 | 1 }>) => {
      if (!state.currentNotebook) return
      const cells = state.currentNotebook.cells
      const j = action.payload.index + action.payload.dir
      if (action.payload.index >= 0 && action.payload.index < cells.length && j >= 0 && j < cells.length) {
        ;[cells[action.payload.index], cells[j]] = [cells[j], cells[action.payload.index]]
        state.selectedCellIndex = j
      }
    },

    reorderCell: (state, action: PayloadAction<{ fromIdx: number; toIdx: number }>) => {
      if (!state.currentNotebook || action.payload.fromIdx === action.payload.toIdx) return
      const cells = state.currentNotebook.cells
      const [cell] = cells.splice(action.payload.fromIdx, 1)
      cells.splice(action.payload.toIdx, 0, cell)
      state.selectedCellIndex = action.payload.toIdx
    },

    copyCell: (state, action: PayloadAction<number>) => {
      if (!state.currentNotebook || !state.currentNotebook.cells[action.payload]) return
      state.clipboardCell = JSON.parse(JSON.stringify(state.currentNotebook.cells[action.payload]))
    },

    cutCell: (state, action: PayloadAction<number>) => {
      if (!state.currentNotebook || !state.currentNotebook.cells[action.payload]) return
      state.clipboardCell = JSON.parse(JSON.stringify(state.currentNotebook.cells[action.payload]))
      state.currentNotebook.cells.splice(action.payload, 1)
    },

    pasteCell: (state, action: PayloadAction<number>) => {
      if (!state.currentNotebook || !state.clipboardCell) return
      const copy = {
        ...JSON.parse(JSON.stringify(state.clipboardCell)),
        id: Math.random().toString(36),
        outputs: [],
        execution_count: null,
      }
      const at = Math.max(0, Math.min(action.payload + 1, state.currentNotebook.cells.length))
      state.currentNotebook.cells.splice(at, 0, copy)
      state.selectedCellIndex = at
    },

    setSuggestionsLoading: (state, action: PayloadAction<boolean>) => {
      state.suggestionsLoading = action.payload
    },

    setSuggestions: (state, action: PayloadAction<{ suggestions: LibrarySuggestion[]; intent: string; summary: string }>) => {
      state.librarySuggestions = action.payload.suggestions
      state.suggestionsIntent = action.payload.intent
      state.suggestionsSummary = action.payload.summary
      state.suggestionsLoading = false
    },

    removeSuggestion: (state, action: PayloadAction<string>) => {
      state.librarySuggestions = state.librarySuggestions.filter((s) => s.name !== action.payload)
    },

    setNotebooks: (state, action: PayloadAction<{ notebooks: Notebook[]; currentNotebookId: string; currentNotebook: Notebook }>) => {
      state.notebooks = action.payload.notebooks
      state.currentNotebookId = action.payload.currentNotebookId
      state.currentNotebook = action.payload.currentNotebook
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(createNotebook.fulfilled, (state, action) => {
        state.notebooks.push(action.payload)
        state.currentNotebookId = action.payload.id
        state.currentNotebook = action.payload
      })
      .addCase(deleteNotebook.fulfilled, (state, action) => {
        state.notebooks = state.notebooks.filter((n) => n.id !== action.payload)
        if (state.currentNotebookId === action.payload) {
          state.currentNotebookId = state.notebooks[0]?.id || null
          state.currentNotebook = state.notebooks[0] || null
        }
      })
      .addCase(setCurrentNotebook.fulfilled, (state, action) => {
        state.currentNotebookId = action.payload.id
        state.currentNotebook = action.payload
      })
      .addCase(executeCell.fulfilled, (state, action) => {
        if (!state.currentNotebook) return
        const cell = state.currentNotebook.cells.find((c) => c.id === action.payload.cellId)
        if (cell) {
          cell.execution_count = action.payload.execution_count
          cell.outputs = action.payload.outputs
        }
      })
      .addCase(suggestLibraries.pending, (state) => {
        state.suggestionsLoading = true
      })
      .addCase(suggestLibraries.fulfilled, (state, action) => {
        if (action.payload) {
          state.librarySuggestions = action.payload.suggestions
          state.suggestionsIntent = action.payload.detected_intent
          state.suggestionsSummary = action.payload.context_summary
        }
        state.suggestionsLoading = false
      })
      .addCase(suggestLibraries.rejected, (state) => {
        state.suggestionsLoading = false
      })
      .addCase(ignoreLibrary.fulfilled, (state, action) => {
        state.librarySuggestions = state.librarySuggestions.filter((s) => s.name !== action.payload)
      })
  },
})

export const {
  addCell,
  updateCell,
  deleteCell,
  setSelectedCell,
  moveCell,
  reorderCell,
  copyCell,
  cutCell,
  pasteCell,
  setSuggestionsLoading,
  setSuggestions,
  removeSuggestion,
  setNotebooks,
} = notebookSlice.actions

export default notebookSlice.reducer

import { create } from 'zustand'

export interface CellExecutionState {
  state: 'idle' | 'running' | 'success' | 'error'
  startTime: number | null
  endTime: number | null
  errorMessage: string | null
}

interface ExecutionMinimapStore {
  cellExecutionStates: Map<string, CellExecutionState>
  updateCellExecutionState: (cellId: string, newState: CellExecutionState) => void
  recordCellStart: (cellId: string) => void
  recordCellComplete: (cellId: string, success: boolean, errorMessage?: string) => void
  resetExecutionStates: () => void
  getCellState: (cellId: string) => CellExecutionState
  getExecutionTime: (cellId: string) => number | null
}

const defaultState: CellExecutionState = {
  state: 'idle',
  startTime: null,
  endTime: null,
  errorMessage: null,
}

export const useExecutionMinimapStore = create<ExecutionMinimapStore>((set, get) => ({
  cellExecutionStates: new Map(),

  updateCellExecutionState: (cellId: string, newState: CellExecutionState) => {
    set((state) => {
      const updated = new Map(state.cellExecutionStates)
      updated.set(cellId, newState)
      return { cellExecutionStates: updated }
    })
  },

  recordCellStart: (cellId: string) => {
    set((state) => {
      const updated = new Map(state.cellExecutionStates)
      updated.set(cellId, {
        state: 'running',
        startTime: Date.now(),
        endTime: null,
        errorMessage: null,
      })
      return { cellExecutionStates: updated }
    })
  },

  recordCellComplete: (cellId: string, success: boolean, errorMessage?: string) => {
    set((state) => {
      const updated = new Map(state.cellExecutionStates)
      const current = updated.get(cellId) || { ...defaultState }
      updated.set(cellId, {
        ...current,
        state: success ? 'success' : 'error',
        endTime: Date.now(),
        errorMessage: errorMessage || null,
      })
      return { cellExecutionStates: updated }
    })
  },

  resetExecutionStates: () => {
    set({ cellExecutionStates: new Map() })
  },

  getCellState: (cellId: string) => {
    return get().cellExecutionStates.get(cellId) || { ...defaultState }
  },

  getExecutionTime: (cellId: string) => {
    const state = get().getCellState(cellId)
    if (!state.startTime || !state.endTime) return null
    return (state.endTime - state.startTime) / 1000
  },
}))

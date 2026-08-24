import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch } from '../store/store'
import { store } from '../store/store'
import {
  selectNotebooks,
  selectCurrentNotebookId,
  selectCurrentNotebook,
  selectSelectedCellIndex,
  selectClipboardCell,
  selectLibrarySuggestions,
  selectSuggestionsIntent,
  selectSuggestionsSummary,
  selectSuggestionsLoading,
} from '../store/notebookSelectors'
import {
  addCell,
  updateCell,
  deleteCell,
  setSelectedCell,
  moveCell,
  reorderCell,
  copyCell,
  cutCell,
  pasteCell,
  setSuggestions,
  removeSuggestion,
  createNotebook as createNotebookAction,
  deleteNotebook as deleteNotebookAction,
  setCurrentNotebook as setCurrentNotebookAction,
  executeCell as executeCellAction,
  saveNotebook as saveNotebookAction,
  suggestLibraries as suggestLibrariesAction,
  ignoreLibrary as ignoreLibraryAction,
} from '../store/notebookSlice'

// Export getState and dispatch for use outside React components
export const getNotebookState = () => store.getState().notebook
export const getReduxDispatch = () => store.dispatch

export function useNotebookStore() {
  const dispatch = useDispatch<AppDispatch>()

  // Selectors
  const notebooks = useSelector(selectNotebooks)
  const currentNotebookId = useSelector(selectCurrentNotebookId)
  const currentNotebook = useSelector(selectCurrentNotebook)
  const selectedCellIndex = useSelector(selectSelectedCellIndex)
  const clipboardCell = useSelector(selectClipboardCell)
  const librarySuggestions = useSelector(selectLibrarySuggestions)
  const suggestionsIntent = useSelector(selectSuggestionsIntent)
  const suggestionsSummary = useSelector(selectSuggestionsSummary)
  const suggestionsLoading = useSelector(selectSuggestionsLoading)

  // Actions
  const createNotebook = useCallback(
    async (name: string) => {
      dispatch(createNotebookAction(name))
    },
    [dispatch]
  )

  const deleteNotebook = useCallback(
    async (id: string) => {
      dispatch(deleteNotebookAction(id))
    },
    [dispatch]
  )

  const setCurrentNotebook = useCallback(
    async (id: string) => {
      dispatch(setCurrentNotebookAction(id))
    },
    [dispatch]
  )

  const executeCell = useCallback(
    async (index: number, language?: string, sqlConnection?: string) => {
      if (!currentNotebook) return
      const cell = currentNotebook.cells[index]
      if (!cell) return
      const code = Array.isArray(cell.source) ? cell.source.join('') : cell.source
      dispatch(
        executeCellAction({
          notebookId: currentNotebook.id,
          cellId: cell.id,
          code,
          language: language as any,
          sqlConnection,
        })
      )
    },
    [dispatch, currentNotebook]
  )

  const saveNotebook = useCallback(async () => {
    if (!currentNotebook) return
    dispatch(saveNotebookAction(currentNotebook))
  }, [dispatch, currentNotebook])

  const suggestLibraries = useCallback(async () => {
    if (!currentNotebookId) return
    dispatch(suggestLibrariesAction(currentNotebookId))
  }, [dispatch, currentNotebookId])

  const ignoreLibrary = useCallback(
    async (libraryName: string) => {
      if (!currentNotebookId) return
      dispatch(ignoreLibraryAction({ notebookId: currentNotebookId, libraryName }))
    },
    [dispatch, currentNotebookId]
  )

  return {
    // State
    notebooks,
    currentNotebookId,
    currentNotebook,
    selectedCellIndex,
    clipboardCell,
    librarySuggestions,
    suggestionsIntent,
    suggestionsSummary,
    suggestionsLoading,
    // Actions
    createNotebook,
    deleteNotebook,
    setCurrentNotebook,
    addCell: (type: 'code' | 'markdown', index?: number) => dispatch(addCell({ type, index })),
    updateCell: (index: number, updates: any) => dispatch(updateCell({ index, updates })),
    deleteCell: (index: number) => dispatch(deleteCell(index)),
    setSelectedCell: (index: number | null) => dispatch(setSelectedCell(index)),
    moveCell: (index: number, dir: -1 | 1) => dispatch(moveCell({ index, dir })),
    reorderCell: (fromIdx: number, toIdx: number) => dispatch(reorderCell({ fromIdx, toIdx })),
    copyCell: (index: number) => dispatch(copyCell(index)),
    cutCell: (index: number) => dispatch(cutCell(index)),
    pasteCell: (afterIndex: number) => dispatch(pasteCell(afterIndex)),
    executeCell,
    saveNotebook,
    suggestLibraries,
    ignoreLibrary,
    // Store methods for compatibility
    getState: () => store.getState().notebook,
  }
}

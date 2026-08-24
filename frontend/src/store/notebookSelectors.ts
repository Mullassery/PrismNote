import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from './store'

const selectNotebookState = (state: RootState) => state.notebook

// `state.notebook?.notebooks ?? []` in a plain inline selector allocates a
// new empty array every render whenever `state.notebook` is undefined,
// which breaks reference-equality checks (e.g. React.memo, other
// selectors composed on top of this one). createSelector caches the last
// computed result per distinct `state.notebook` reference, so repeated
// renders with the same (or absent) slice return the same array instance.
export const selectNotebooks = createSelector(
  [selectNotebookState],
  (notebook) => notebook?.notebooks ?? []
)

export const selectCurrentNotebookId = (state: RootState) => state.notebook.currentNotebookId
export const selectCurrentNotebook = (state: RootState) => state.notebook.currentNotebook
export const selectSelectedCellIndex = (state: RootState) => state.notebook.selectedCellIndex
export const selectClipboardCell = (state: RootState) => state.notebook.clipboardCell
export const selectLibrarySuggestions = (state: RootState) => state.notebook.librarySuggestions
export const selectSuggestionsIntent = (state: RootState) => state.notebook.suggestionsIntent
export const selectSuggestionsSummary = (state: RootState) => state.notebook.suggestionsSummary
export const selectSuggestionsLoading = (state: RootState) => state.notebook.suggestionsLoading

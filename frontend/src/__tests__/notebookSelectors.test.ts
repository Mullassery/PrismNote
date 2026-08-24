import { describe, it, expect } from 'vitest'
import { selectNotebooks } from '../store/notebookSelectors'
import type { RootState } from '../store/store'

describe('selectNotebooks', () => {
  it('returns the same array reference across calls when state.notebook is undefined', () => {
    // Mirrors the real bug: `state.notebook?.notebooks ?? []` as a plain
    // inline selector allocated a fresh [] every render whenever the
    // notebook slice was undefined, breaking reference-equality checks
    // downstream (React.memo, other selectors composed on this one).
    const state = { notebook: undefined } as unknown as RootState

    const first = selectNotebooks(state)
    const second = selectNotebooks(state)

    expect(first).toBe(second)
    expect(first).toEqual([])
  })

  it('returns the same array reference across calls when the notebook slice is unchanged', () => {
    const state = {
      notebook: {
        notebooks: [{ id: '1', name: 'a', cells: [], metadata: {} }],
        currentNotebookId: null,
        currentNotebook: null,
        selectedCellIndex: null,
        clipboardCell: null,
        librarySuggestions: [],
        suggestionsIntent: '',
        suggestionsSummary: '',
        suggestionsLoading: false,
      },
    } as unknown as RootState

    const first = selectNotebooks(state)
    const second = selectNotebooks(state)

    expect(first).toBe(second)
    expect(first).toBe(state.notebook.notebooks)
  })

  it('recomputes when the notebook slice reference changes', () => {
    const stateA = {
      notebook: { notebooks: [{ id: '1', name: 'a', cells: [], metadata: {} }] },
    } as unknown as RootState
    const stateB = {
      notebook: { notebooks: [{ id: '2', name: 'b', cells: [], metadata: {} }] },
    } as unknown as RootState

    const first = selectNotebooks(stateA)
    const second = selectNotebooks(stateB)

    expect(first).not.toBe(second)
    expect(second).toBe(stateB.notebook.notebooks)
  })
})

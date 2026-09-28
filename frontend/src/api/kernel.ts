import axios from 'axios'

// Every notebook has its own kernel now (notebooks used to share one global
// kernel, which meant one notebook's variables were readable from any
// other) -- these all need the notebook id they're targeting.

/** Interrupt the currently running cell (SIGINT -> KeyboardInterrupt). */
export async function interruptKernel(notebookId: string): Promise<void> {
  await axios.post(`/api/notebooks/${notebookId}/kernel/interrupt`)
}

/** Restart the kernel, clearing all variables/imports. */
export async function restartKernel(notebookId: string): Promise<void> {
  await axios.post(`/api/notebooks/${notebookId}/kernel/restart`)
}

export interface KernelVariable {
  name: string
  type: string
  preview?: string
  shape?: number[]
  len?: number
}

/** Snapshot of user-defined variables in the live kernel namespace. */
export async function listVariables(notebookId: string): Promise<KernelVariable[]> {
  const r = await axios.get<{ variables: KernelVariable[] }>(
    `/api/notebooks/${notebookId}/kernel/variables`,
  )
  return r.data.variables ?? []
}

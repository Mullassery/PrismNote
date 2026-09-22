import axios from 'axios'

/**
 * Extract a user-facing message from a thrown value, preferring the
 * backend's structured `{ error: "..." }` response body (the shape most
 * PrismNote API endpoints use for error responses) over the raw
 * axios/Error message, with a caller-supplied fallback if neither is
 * available.
 *
 * Centralizes a `e?.response?.data?.error || e?.message || 'fallback'`
 * pattern that was previously duplicated (untyped, via `catch (e: any)`)
 * across several components.
 */
export function apiErrorMessage(e: unknown, fallback: string): string {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as { error?: string } | undefined
    return data?.error || e.message || fallback
  }
  if (e instanceof Error) return e.message || fallback
  return fallback
}

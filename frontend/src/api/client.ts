/**
 * API client with automatic JWT token injection
 */

export interface FetchOptions extends RequestInit {
  skipAuth?: boolean
}

class APIClient {
  private baseURL = '/api'

  getToken(): string | null {
    return localStorage.getItem('access_token')
  }

  private async request<T>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const { skipAuth = false, headers = {}, ...fetchOptions } = options

    const url = `${this.baseURL}${endpoint}`
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(headers as Record<string, string>),
    }

    // Inject JWT token if available and not explicitly skipped
    if (!skipAuth) {
      const token = this.getToken()
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`
      }
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers: requestHeaders,
    })

    // Handle 401 - token expired or invalid
    if (response.status === 401) {
      // Clear auth and redirect to login
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
      throw new Error('Unauthorized - please log in again')
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    return response.json() as Promise<T>
  }

  // Auth endpoints (no auth required)
  async register(email: string, password: string, displayName?: string) {
    return this.request('/auth/register', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({
        email,
        password,
        display_name: displayName,
      }),
    })
  }

  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({ email, password }),
    })
  }

  async getCSRFToken() {
    return this.request('/auth/csrf', {
      method: 'GET',
      skipAuth: true,
    })
  }

  // Protected endpoints (auth required)
  async getMe() {
    return this.request('/auth/me', {
      method: 'GET',
    })
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({}),
    })
  }

  // Notebook endpoints
  async listNotebooks() {
    return this.request('/notebooks', {
      method: 'GET',
    })
  }

  async getNotebook(id: string) {
    return this.request(`/notebooks/${id}`, {
      method: 'GET',
    })
  }

  async createNotebook(name: string) {
    return this.request('/notebooks', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  }

  async updateNotebook(id: string, notebook: any) {
    return this.request(`/notebooks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(notebook),
    })
  }

  async deleteNotebook(id: string) {
    return this.request(`/notebooks/${id}`, {
      method: 'DELETE',
    })
  }

  async executeCell(notebookId: string, cellIndex: number) {
    return this.request(`/notebooks/${notebookId}/execute`, {
      method: 'POST',
      body: JSON.stringify({ cell_index: cellIndex }),
    })
  }

  // Generic request method for other endpoints
  async fetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    return this.request<T>(endpoint, options)
  }
}

// Export singleton instance
export const apiClient = new APIClient()

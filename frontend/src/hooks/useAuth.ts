import { useState, useEffect, useCallback } from 'react'

export interface User {
  user_id: string
  email: string
  display_name: string
  roles: string[]
}

export interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
  })

  // Initialize from localStorage
  useEffect(() => {
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
    const userJson = localStorage.getItem(STORAGE_KEYS.USER)

    if (accessToken && userJson) {
      try {
        const user = JSON.parse(userJson)
        setAuth({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        })
      } catch {
        // Invalid stored data
        clearAuth()
      }
    } else {
      // Dev mode: auto-login with demo user for testing
      if (import.meta.env.DEV) {
        const demoUser: User = {
          user_id: 'demo-user-001',
          email: 'demo@prismnote.local',
          display_name: 'Demo User',
          roles: ['Member'],
        }
        setAuth({
          user: demoUser,
          accessToken: 'demo-token-dev-only',
          refreshToken: null,
          isAuthenticated: true,
          isLoading: false,
        })
      } else {
        setAuth(prev => ({ ...prev, isLoading: false }))
      }
    }
  }, [])

  const clearAuth = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.USER)
    setAuth({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    })
  }, [])

  const setAuthData = useCallback((data: {
    access_token: string
    refresh_token?: string
    user: User
  }) => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token)
    if (data.refresh_token) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token)
    }
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user))

    setAuth({
      user: data.user,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || null,
      isAuthenticated: true,
      isLoading: false,
    })
  }, [])

  const logout = useCallback(async () => {
    // Call logout endpoint if it exists
    try {
      if (auth.accessToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${auth.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }).catch(() => {
          // Ignore errors, logout locally anyway
        })
      }
    } finally {
      clearAuth()
    }
  }, [auth.accessToken, clearAuth])

  return {
    ...auth,
    setAuthData,
    logout,
    clearAuth,
  }
}

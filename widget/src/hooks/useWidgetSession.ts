import { useState } from 'react'
import * as api from '../api'
import type { WidgetSession } from '../types'

const SESSION_KEY = (token: string) => `atendio_session_${token}`

export function useWidgetSession(baseUrl: string, apiToken: string) {
  const stored = localStorage.getItem(SESSION_KEY(apiToken))
  const [session, setSession] = useState<WidgetSession | null>(stored ? JSON.parse(stored) : null)
  const [loading, setLoading] = useState(false)

  async function createSession(name: string, email: string, phone?: string) {
    setLoading(true)
    try {
      const result = await api.createSession(baseUrl, apiToken, name, email, phone)
      localStorage.setItem(SESSION_KEY(apiToken), JSON.stringify(result))
      setSession(result)
    } finally {
      setLoading(false)
    }
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY(apiToken))
    setSession(null)
  }

  return { session, createSession, clearSession, loading }
}

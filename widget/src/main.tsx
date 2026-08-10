import ReactDOM from 'react-dom/client'
import { useState, useEffect, useRef } from 'react'
import { App } from './App'
import { useWidgetSession } from './hooks/useWidgetSession'
import { useWidgetMessages } from './hooks/useWidgetMessages'
import { useWidgetSend } from './hooks/useWidgetSend'
import type { Language } from './types'

const scriptEl = document.currentScript as HTMLScriptElement | null
const baseUrl = scriptEl ? new URL(scriptEl.src).origin : ''
const apiToken = scriptEl?.dataset.licensee ?? ''

// Language resolution: data-language attribute takes precedence over the default.
const rawLang = scriptEl?.dataset.language
const defaultLanguage: Language = rawLang === 'en' ? 'en' : 'pt'

type InitData = { name: string; email: string; phone?: string; language?: Language }
interface AtendioWidgetAPI {
  init: (data: InitData) => void
  reset: () => void
  _handler: ((data: InitData) => void) | null
  _resetHandler: (() => void) | null
  _pending: InitData | null
}

;(window as any).AtendioWidget = {
  init(this: AtendioWidgetAPI, data: InitData) {
    if (this._handler) {
      this._handler(data)
    } else {
      this._pending = data
    }
  },
  reset(this: AtendioWidgetAPI) {
    this._resetHandler?.()
  },
  _handler: null,
  _resetHandler: null,
  _pending: null,
} as AtendioWidgetAPI

function WidgetRoot() {
  const [isOpen, setIsOpen] = useState(false)
  const [language, setLanguage] = useState<Language>(defaultLanguage)
  const { session, createSession, clearSession, loading: sessionLoading } = useWidgetSession(baseUrl, apiToken)
  const { messages, triggerPoll } = useWidgetMessages(baseUrl, apiToken, session)
  const { send, sending } = useWidgetSend(baseUrl, apiToken, session, triggerPoll)

  // Refs keep _handler and _resetHandler pointing at the latest closures
  const createSessionRef = useRef(createSession)
  const clearSessionRef = useRef(clearSession)
  createSessionRef.current = createSession
  clearSessionRef.current = clearSession

  useEffect(() => {
    const api = (window as any).AtendioWidget as AtendioWidgetAPI
    api._handler = (data) => {
      if (data.language) setLanguage(data.language)
      createSessionRef.current(data.name, data.email, data.phone)
    }
    api._resetHandler = () => clearSessionRef.current()
    if (api._pending) {
      const { name, email, phone, language: pendingLang } = api._pending
      api._pending = null
      if (pendingLang) setLanguage(pendingLang)
      createSessionRef.current(name, email, phone)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <App
      licenseeApiToken={apiToken}
      isOpen={isOpen}
      onToggle={() => setIsOpen(o => !o)}
      session={session}
      onSessionCreate={createSession}
      messages={messages}
      onSend={send}
      sessionLoading={sessionLoading}
      sendDisabled={sending}
      language={language}
    />
  )
}

const host = document.createElement('div')
host.id = 'atendio-widget-host'
document.body.appendChild(host)
const shadow = host.attachShadow({ mode: 'open' })
const mountPoint = document.createElement('div')
shadow.appendChild(mountPoint)

ReactDOM.createRoot(mountPoint).render(<WidgetRoot />)

import { useState, useRef } from 'react'
import styles from '../styles.module.scss'
import { useTranslation } from 'react-i18next'

interface MessageInputProps {
  onSend: (text: string) => void
  onSchedule?: (text: string, scheduledAt: string) => void
  onSendFile?: (file: File) => void
  disabled?: boolean
}

export default function MessageInput({ onSend, onSchedule, onSendFile, disabled }: MessageInputProps) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function isScheduleValid() {
    return !!scheduledAt && new Date(scheduledAt).getTime() > Date.now()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setPendingFile(file)
    e.target.value = ''
  }

  function handleSend() {
    if (disabled) return
    if (pendingFile && onSendFile) {
      onSendFile(pendingFile)
      setPendingFile(null)
      return
    }
    if (!text.trim()) return
    onSend(text.trim())
    setText('')
  }

  function handleSchedule() {
    if (!text.trim() || !isScheduleValid() || !onSchedule) return
    onSchedule(text.trim(), new Date(scheduledAt).toISOString())
    setText('')
    setScheduledAt('')
    setShowSchedule(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={styles.messageFooter} role='form' aria-label={t('chat.sendFormAriaLabel')}>
      <div className={styles.inputRow}>
        <input
          type='text'
          className={styles.messageInput}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('chat.messagePlaceholder')}
          disabled={disabled}
          aria-label={t('chat.messageInputAriaLabel')}
          autoComplete='off'
        />
        {onSendFile && !disabled && (
          <>
            <input
              type='file'
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept='image/*,video/*,audio/*,.pdf,.doc,.docx'
              onChange={handleFileChange}
              aria-label={t('chat.attachFileAriaLabel')}
            />
            <button
              type='button'
              className={styles.attachBtn}
              onClick={() => fileInputRef.current?.click()}
              aria-label={t('chat.attachFileAriaLabel')}
            >
              <i className='bi bi-paperclip' aria-hidden='true' />
            </button>
          </>
        )}
        {pendingFile && (
          <span className={styles.filePreview} aria-live='polite'>
            {pendingFile.name}
            <button type='button' onClick={() => setPendingFile(null)} aria-label={t('chat.clearFileAriaLabel')}>
              ×
            </button>
          </span>
        )}
        {onSchedule && (
          <button
            type='button'
            className={styles.clockBtn}
            onClick={() => setShowSchedule((s) => !s)}
            aria-label={t('chat.scheduleToggleAriaLabel')}
          >
            <i className='bi bi-clock' aria-hidden='true' />
          </button>
        )}
        <button
          type='button'
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={disabled || (!pendingFile && !text.trim())}
          aria-label={t('chat.sendAriaLabel')}
        >
          {disabled
            ? <i className='bi bi-hourglass-split' aria-hidden='true' />
            : <i className='bi bi-send-fill' aria-hidden='true' />
          }
        </button>
      </div>
      {showSchedule && (
        <div className={styles.scheduleRow}>
          <input
            type='datetime-local'
            className={styles.schedulePicker}
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            aria-label={t('chat.scheduleDateAriaLabel')}
            disabled={disabled}
          />
          <button
            type='button'
            className={styles.scheduleBtn}
            onClick={handleSchedule}
            disabled={disabled || !text.trim() || !isScheduleValid()}
            aria-label={t('chat.scheduleSubmitLabel')}
          >
            {t('chat.scheduleSubmitLabel')}
          </button>
        </div>
      )}
    </div>
  )
}

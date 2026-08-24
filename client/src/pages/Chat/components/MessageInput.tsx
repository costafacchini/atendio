import { useState } from 'react'
import styles from '../styles.module.scss'
import { useTranslation } from 'react-i18next'

interface MessageInputProps {
  onSend: (text: string) => void
  onSchedule?: (text: string, scheduledAt: string) => void
  disabled?: boolean
}

export default function MessageInput({ onSend, onSchedule, disabled }: MessageInputProps) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')

  function isScheduleValid() {
    return !!scheduledAt && new Date(scheduledAt).getTime() > Date.now()
  }

  function handleSend() {
    if (!text.trim() || disabled) return
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
          disabled={disabled || !text.trim()}
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

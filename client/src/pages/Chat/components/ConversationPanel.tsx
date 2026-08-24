import { useRef, useEffect } from 'react'
import type { IRoom, IMessage } from '../../../types'
import styles from '../styles.module.scss'
import MessageInput from './MessageInput'
import { useTranslation } from 'react-i18next'

interface ConversationPanelProps {
  room: IRoom | null
  messages: IMessage[]
  onSend: (text: string) => void
  onSchedule?: (text: string, scheduledAt: string) => void
  onCancelScheduled?: (messageId: string) => void
  loading: boolean
  onBack: () => void
  onClose: () => void
}

function formatMsgTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function ConversationPanel({ room, messages, onSend, onSchedule, onCancelScheduled, loading, onBack, onClose }: ConversationPanelProps) {
  const { t } = useTranslation()
  const bottomRef = useRef<HTMLDivElement>(null)

  const STATUS_LABEL: Record<string, string> = {
    pending: t('chat.statusPending'),
    open: t('chat.statusOpen'),
    closed: t('chat.statusClosed'),
  }

  const STATUS_CLASS: Record<string, string> = {
    pending: styles.statusPending,
    open: styles.statusOpen,
    closed: styles.statusClosed,
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!room) {
    return (
      <div className={styles.conversationEmpty} role='status' aria-label={t('chat.noRoomAriaLabel')}>
        <i className='bi bi-chat-left-text' aria-hidden='true' />
        <p>{t('chat.selectConversation')}</p>
      </div>
    )
  }

  const statusClass = STATUS_CLASS[room.status] ?? styles.statusClosed
  const statusLabel = STATUS_LABEL[room.status] ?? room.status

  return (
    <>
      <div className={styles.convHeader}>
        <button
          type='button'
          className={styles.backBtn}
          onClick={onBack}
          aria-label={t('chat.backAriaLabel')}
        >
          <i className='bi bi-chevron-left' aria-hidden='true' />
        </button>

        <div className={styles.convHeaderInfo}>
          <span className={styles.convContactName}>{room.contact.name}</span>
          <span className={`${styles.convStatusBadge} ${statusClass}`} aria-label={`${t('common.status')}: ${statusLabel}`}>
            {statusLabel}
          </span>
        </div>

        {!room.closed && (
          <button
            type='button'
            className={styles.closeRoomBtn}
            onClick={onClose}
            aria-label={t('chat.concludeAriaLabel')}
          >
            {t('chat.concludeButton')}
          </button>
        )}
      </div>

      {loading ? (
        <div className={styles.skeletonList} role='status' aria-label={t('chat.loadingMessagesAriaLabel')}>
          <div className={`${styles.skeletonBubble} ${styles.in}`} />
          <div className={`${styles.skeletonBubble} ${styles.out}`} />
          <div className={`${styles.skeletonBubble} ${styles.in}`} />
        </div>
      ) : (
        <div className={styles.messageList} role='log' aria-label={t('chat.messagesAriaLabel')} aria-live='polite'>
          {messages.map((message) => {
            const fromMe = message.destination === 'to-messenger'
            const isPendingScheduled =
              !!message.scheduledAt && !message.sended && new Date(message.scheduledAt) > new Date()
            return (
              <div
                key={message.id}
                className={`${styles.messageGroup} ${fromMe ? styles.outbound : styles.inbound}`}
              >
                <div className={`${styles.bubble} ${fromMe ? styles.bubbleSent : styles.bubbleReceived}`}>
                  <span className={styles.bubbleText}>
                    {message.text || (message.url ? '[arquivo]' : '[mensagem]')}
                  </span>
                  <span className={styles.bubbleTime} aria-hidden='true'>
                    {formatMsgTime(message.createdAt)}
                  </span>
                </div>
                {isPendingScheduled && (
                  <div className={styles.scheduledBadge}>
                    <i className='bi bi-clock' aria-hidden='true' />
                    <span>{t('chat.scheduledFor', { time: formatMsgTime(message.scheduledAt!) })}</span>
                    {onCancelScheduled && (
                      <button
                        type='button'
                        className={styles.cancelScheduledBtn}
                        onClick={() => onCancelScheduled(message.id)}
                        aria-label={t('chat.cancelScheduledAriaLabel')}
                      >
                        ×
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          <div ref={bottomRef} aria-hidden='true' />
        </div>
      )}

      <MessageInput onSend={onSend} onSchedule={onSchedule} disabled={loading || room.closed} />
    </>
  )
}

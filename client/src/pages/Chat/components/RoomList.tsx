import type { IRoom } from '../../../types'
import type { IInbox } from '../../../types/inbox'
import RoomItem from './RoomItem'
import styles from '../styles.module.scss'
import { useTranslation } from 'react-i18next'

interface RoomListProps {
  rooms: IRoom[]
  selectedRoomId: string | undefined
  onSelect: (room: IRoom) => void
  onNewConversation: () => void
  activeInbox?: IInbox | null
  hasMultipleInboxes?: boolean
  onSwitchInbox?: () => void
}

export default function RoomList({ rooms, selectedRoomId, onSelect, onNewConversation, activeInbox, hasMultipleInboxes, onSwitchInbox }: RoomListProps) {
  const { t } = useTranslation()

  return (
    <>
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarTitleRow}>
          <span className={styles.sidebarTitle}>{t('chat.conversationsTitle')}</span>
          {activeInbox && (
            <span className={styles.sidebarInboxName} title={activeInbox.name}>
              {activeInbox.name}
            </span>
          )}
        </div>
        <div className={styles.sidebarActions}>
          {hasMultipleInboxes && onSwitchInbox && (
            <button
              type='button'
              className={styles.switchInboxBtn}
              onClick={onSwitchInbox}
              aria-label={t('chat.switchInboxAriaLabel')}
              title={t('chat.switchInbox')}
            >
              <i className='bi bi-arrow-left-right' aria-hidden='true' />
            </button>
          )}
          <button
            type='button'
            className={styles.newConvoBtn}
            onClick={onNewConversation}
            aria-label={t('chat.newConversationAriaLabel')}
            title={t('chat.newConversationAriaLabel')}
          >
            <i className='bi bi-plus' aria-hidden='true' />
          </button>
        </div>
      </div>

      {rooms.length === 0 ? (
        <div className={styles.sidebarEmpty} role='status'>
          <i className='bi bi-chat-dots' aria-hidden='true' />
          <p>{t('chat.noConversations')}</p>
        </div>
      ) : (
        <ul className={styles.roomList} role='list' aria-label={t('chat.conversationsTitle')}>
          {rooms.map((room) => (
            <RoomItem
              key={room._id}
              room={room}
              isSelected={room._id === selectedRoomId}
              onClick={() => onSelect(room)}
            />
          ))}
        </ul>
      )}
    </>
  )
}

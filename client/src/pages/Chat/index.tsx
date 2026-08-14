import { useState, useEffect, useRef } from 'react'
import { useApp } from '../../contexts/App'
import { getRooms, getRoomMessages, sendRoomMessage, closeRoom } from '../../services/rooms'
import { getInboxes } from '../../services/inbox'
import type { IRoom, IMessage } from '../../types'
import type { IInbox } from '../../types/inbox'
import styles from './styles.module.scss'
import RoomList from './components/RoomList'
import ConversationPanel from './components/ConversationPanel'
import NewConversationModal from './components/NewConversationModal'
import InboxPickerModal from './components/InboxPickerModal'
import { useChatSocket } from '../../hooks/useChatSocket'
import Navbar from '../Navbar'

export default function ChatPage() {
  const { currentUser, activeLicensee } = useApp()
  const effectiveLicenseeId = activeLicensee?.id ??
    (typeof currentUser?.licensee === 'object' && currentUser.licensee !== null
      ? (currentUser.licensee as { id?: string })?.id
      : currentUser?.licensee != null ? String(currentUser.licensee) : undefined)

  const [rooms, setRooms] = useState<IRoom[]>([])
  const [selectedRoom, setSelectedRoom] = useState<IRoom | null>(null)
  const [messages, setMessages] = useState<IMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [showNewConvo, setShowNewConvo] = useState(false)
  const [mobileView, setMobileView] = useState<'rooms' | 'conversation'>('rooms')

  const [chatInboxes, setChatInboxes] = useState<IInbox[]>([])
  const [activeInbox, setActiveInbox] = useState<IInbox | null>(null)
  const [showInboxPicker, setShowInboxPicker] = useState(false)

  // Keep a ref so the socket callback always sees the latest activeInbox
  const activeInboxRef = useRef<IInbox | null>(null)
  useEffect(() => { activeInboxRef.current = activeInbox }, [activeInbox])

  // Load chat inboxes when licensee is known; auto-select if only one
  useEffect(() => {
    if (!effectiveLicenseeId) return
    getInboxes({ licensee: effectiveLicenseeId, kind: 'chat', active: true })
      .then(res => {
        const inboxes = (res.data as IInbox[]) ?? []
        setChatInboxes(inboxes)
        if (inboxes.length === 1) {
          setActiveInbox(inboxes[0])
        } else if (inboxes.length > 1) {
          setShowInboxPicker(true)
        }
      })
      .catch(console.error)
  }, [effectiveLicenseeId])

  // Load rooms whenever the active inbox changes
  useEffect(() => {
    if (!effectiveLicenseeId || !activeInbox) return
    getRooms({ licensee: effectiveLicenseeId, inbox: activeInbox._id })
      .then(res => setRooms(res.data.rooms))
      .catch(console.error)
  }, [effectiveLicenseeId, activeInbox])

  function loadMessages(roomId: string) {
    setMessagesLoading(true)
    getRoomMessages(roomId)
      .then(res => {
        const msgs = res.data.messages
        setMessages(msgs)
        if (msgs.length > 0) {
          const last = msgs[msgs.length - 1]
          setRooms(prev => prev.map(r =>
            r._id === roomId
              ? { ...r, lastMessage: { text: last.text, kind: last.kind, createdAt: last.createdAt } }
              : r
          ))
        }
      })
      .catch(console.error)
      .finally(() => setMessagesLoading(false))
  }

  function handleRoomSelect(room: IRoom) {
    setSelectedRoom({ ...room, unreadCount: 0 })
    setRooms(prev => prev.map(r => r._id === room._id ? { ...r, unreadCount: 0 } : r))
    loadMessages(room._id)
    setMobileView('conversation')
  }

  function handleBack() {
    setMobileView('rooms')
  }

  async function handleSend(text: string) {
    if (!selectedRoom) return
    const optimistic: IMessage = {
      id: `optimistic-${Date.now()}`,
      kind: 'text',
      destination: 'to-messenger',
      text,
      url: null,
      fileName: null,
      latitude: 0,
      longitude: 0,
      sended: true,
      error: null,
      cart: null,
      createdAt: new Date().toISOString(),
      contact: null,
      trigger: null,
      department: null,
    }
    setMessages(prev => [...prev, optimistic])
    try {
      await sendRoomMessage(selectedRoom._id, text)
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    }
  }

  useChatSocket(effectiveLicenseeId, ({ roomId, messageId, text, kind, destination, createdAt, sended, contact }) => {
    const ts = createdAt ?? new Date().toISOString()

    if (selectedRoom && selectedRoom._id === roomId) {
      const incoming: IMessage = {
        id: messageId,
        kind: kind ?? 'text',
        destination: destination ?? 'to-chat',
        text: text ?? null,
        url: null,
        fileName: null,
        latitude: 0,
        longitude: 0,
        sended: sended ?? false,
        error: null,
        cart: null,
        createdAt: ts,
        contact: contact ?? null,
        trigger: null,
        department: null,
      }
      setMessages(prev => {
        if (prev.some(m => m.id === messageId)) return prev
        return [...prev, incoming]
      })
      setRooms(prev => prev.map(r =>
        r._id === roomId ? { ...r, lastMessage: { text: text ?? null, kind: kind ?? 'text', createdAt: ts } } : r
      ))
      return
    }

    setRooms(prev => {
      const roomExists = prev.some(r => r._id === roomId)
      if (!roomExists) {
        if (effectiveLicenseeId) {
          getRooms({ licensee: effectiveLicenseeId, inbox: activeInboxRef.current?._id })
            .then(res => setRooms(res.data.rooms))
            .catch(console.error)
        }
        return prev
      }
      return prev.map(r =>
        r._id === roomId
          ? {
              ...r,
              unreadCount: (r.unreadCount ?? 0) + 1,
              lastMessage: { text: text ?? null, kind: kind ?? 'text', createdAt: ts },
            }
          : r
      )
    })
  })

  async function handleClose() {
    if (!selectedRoom) return
    await closeRoom(selectedRoom._id)
    setRooms(prev => prev.filter(r => r._id !== selectedRoom._id))
    setSelectedRoom(null)
    setMessages([])
    setMobileView('rooms')
  }

  function handleNewConversation() {
    setShowNewConvo(true)
  }

  function handleSwitchInbox() {
    setShowInboxPicker(true)
  }

  function handleInboxSelected(inbox: IInbox) {
    setActiveInbox(inbox)
    setShowInboxPicker(false)
    setSelectedRoom(null)
    setMessages([])
  }

  function handleInboxPickerDismiss() {
    // Only dismissable when an inbox is already active (switching flow)
    if (activeInbox) setShowInboxPicker(false)
  }

  function handleRoomCreated(room: IRoom) {
    setRooms(prev => [room, ...prev.filter(r => r._id !== room._id)])
    handleRoomSelect(room)
    setShowNewConvo(false)
  }

  const sidebarMobileHidden = mobileView === 'conversation'
  const conversationMobileVisible = mobileView === 'conversation'

  return (
    <div className={styles.chatPage}>
      <Navbar currentUser={currentUser} />
      <main className={styles.chatLayout}>
        <div className={`${styles.chatSidebar}${sidebarMobileHidden ? ` ${styles.chatSidebarMobileHidden}` : ''}`}>
          <RoomList
            rooms={rooms}
            selectedRoomId={selectedRoom?._id}
            onSelect={handleRoomSelect}
            onNewConversation={handleNewConversation}
            activeInbox={activeInbox}
            hasMultipleInboxes={chatInboxes.length > 1}
            onSwitchInbox={handleSwitchInbox}
          />
        </div>
        <div className={`${styles.chatConversation}${conversationMobileVisible ? ` ${styles.chatConversationMobileVisible}` : ''}`}>
          <ConversationPanel
            room={selectedRoom}
            messages={messages}
            onSend={handleSend}
            loading={messagesLoading}
            onBack={handleBack}
            onClose={handleClose}
          />
        </div>
      </main>
      <NewConversationModal
        show={showNewConvo}
        onClose={() => setShowNewConvo(false)}
        onRoomCreated={handleRoomCreated}
        inboxId={activeInbox?._id}
      />
      {showInboxPicker && (
        <InboxPickerModal
          inboxes={chatInboxes}
          onSelect={handleInboxSelected}
          onDismiss={handleInboxPickerDismiss}
        />
      )}
    </div>
  )
}

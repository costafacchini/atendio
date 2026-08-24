import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ChatPage from './index'
import { getRooms, getRoomMessages, sendRoomMessage } from '../../services/rooms'
import { scheduleMessage, ignoreMessage } from '../../services/message'
import { getInboxes } from '../../services/inbox'
import { AppContext } from '../../contexts/App'

vi.mock('../../services/rooms')
vi.mock('../../services/inbox', () => ({
  getInboxes: vi.fn(),
}))
vi.mock('../../services/message', () => ({
  scheduleMessage: vi.fn(),
  ignoreMessage: vi.fn(),
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'pt', changeLanguage: vi.fn() },
  }),
}))
vi.mock('./components/NewConversationModal', () => ({
  default: () => null,
}))

const appContextValue = {
  currentUser: { role: 'agent', licensee: { id: 'lic-1' } },
  activeLicensee: { id: 'lic-1', name: 'Licensee' },
  updateActiveLicensee: vi.fn(),
  resetLicenseeModal: vi.fn(),
  setCurrentUser: vi.fn(),
  markLicenseeModalSeen: vi.fn(),
  licenseeModalSeen: false,
}

function mount() {
  return render(
    <AppContext.Provider value={appContextValue}>
      <ChatPage />
    </AppContext.Provider>
  )
}

const sampleRooms = [
  { _id: 'r1', id: 'r1', contact: { _id: 'c1', name: 'Alice', number: '5511999990001' }, status: 'open', closed: false, unreadCount: 0 },
  { _id: 'r2', id: 'r2', contact: { _id: 'c2', name: 'Bob', number: '5511999990002' }, status: 'pending', closed: false, unreadCount: 2 },
]

const sampleMessages = [
  { id: 'm1', kind: 'text', destination: 'to-chat', text: 'Hello', url: '', fileName: '', latitude: 0, longitude: 0, sended: true, error: null, cart: null, createdAt: '2026-06-17T10:00:00.000Z', contact: null, trigger: null, department: null },
]

const singleInbox = { _id: 'ci1', name: 'Chat Inbox 1', kind: 'chat', inboxToken: 'tok-1', webhookUrl: null, active: true }

describe('<ChatPage>', () => {
  beforeEach(() => {
    // One inbox so activeInbox is auto-selected and getRooms is triggered
    ;(getInboxes as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [singleInbox] })
  })

  it('calls getRooms on mount', async () => {
    (getRooms as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { rooms: [], hasMore: false } })

    mount()

    await waitFor(() => {
      expect(getRooms).toHaveBeenCalled()
    })
  })

  it('renders rooms from getRooms', async () => {
    (getRooms as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { rooms: sampleRooms, hasMore: false } })

    mount()

    expect(await screen.findByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('clicking a room calls getRoomMessages', async () => {
    (getRooms as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { rooms: sampleRooms, hasMore: false } })
    ;(getRoomMessages as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { messages: [], total: 0, page: 1, hasMore: false } })

    mount()

    fireEvent.click(await screen.findByText('Alice'))

    await waitFor(() => {
      expect(getRoomMessages).toHaveBeenCalledWith('r1')
    })
  })

  it('submitting the input calls sendRoomMessage', async () => {
    (getRooms as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { rooms: sampleRooms, hasMore: false } })
    ;(getRoomMessages as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { messages: sampleMessages, total: 1, page: 1, hasMore: false } })
    ;(sendRoomMessage as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} })

    mount()

    fireEvent.click(await screen.findByText('Alice'))

    await waitFor(() => expect(getRoomMessages).toHaveBeenCalled())

    fireEvent.change(screen.getByPlaceholderText('chat.messagePlaceholder'), { target: { value: 'Oi!' } })
    fireEvent.click(screen.getByRole('button', { name: 'chat.sendAriaLabel' }))

    await waitFor(() => {
      expect(sendRoomMessage).toHaveBeenCalledWith('r1', 'Oi!')
    })
  })
})

describe('<ChatPage> — schedule-message: Scenarios 3 and 9', () => {
  beforeEach(() => {
    ;(getInboxes as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [singleInbox] })
    ;(getRooms as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { rooms: sampleRooms, hasMore: false } })
  })

  // --- Scenario 3 (page level) ---
  it('calls scheduleMessage with correct payload when handleSchedule fires', async () => {
    ;(getRoomMessages as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { messages: [], total: 0, page: 1, hasMore: false } })
    ;(scheduleMessage as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} })

    mount()

    fireEvent.click(await screen.findByText('Alice'))
    await waitFor(() => expect(getRoomMessages).toHaveBeenCalled())

    fireEvent.change(screen.getByPlaceholderText('chat.messagePlaceholder'), { target: { value: 'Agendada' } })
    fireEvent.click(screen.getByRole('button', { name: 'chat.scheduleToggleAriaLabel' }))

    const futureDate = new Date(Date.now() + 60 * 60 * 1000)
    fireEvent.change(screen.getByLabelText('chat.scheduleDateAriaLabel'), {
      target: { value: futureDate.toISOString().slice(0, 16) },
    })
    fireEvent.click(screen.getByRole('button', { name: 'chat.scheduleSubmitLabel' }))

    await waitFor(() => {
      expect(scheduleMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          licensee: 'lic-1',
          contact: 'c1',
          destination: 'to-messenger',
          kind: 'text',
          text: 'Agendada',
          scheduledAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        }),
      )
    })
  })

  // --- Scenario 9 (page level) ---
  it('calls ignoreMessage and removes the message when handleCancelScheduled fires', async () => {
    const futureScheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const scheduledMsg = {
      id: 'msg-sched',
      kind: 'text',
      destination: 'to-messenger',
      text: 'Para cancelar',
      url: '',
      fileName: '',
      latitude: 0,
      longitude: 0,
      sended: false,
      scheduledAt: futureScheduledAt,
      error: null,
      cart: null,
      createdAt: new Date().toISOString(),
      contact: null,
      trigger: null,
      department: null,
    }
    ;(getRoomMessages as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { messages: [scheduledMsg], total: 1, page: 1, hasMore: false },
    })
    ;(ignoreMessage as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} })

    mount()

    fireEvent.click(await screen.findByText('Alice'))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'chat.cancelScheduledAriaLabel' })).toBeInTheDocument()
    )

    fireEvent.click(screen.getByRole('button', { name: 'chat.cancelScheduledAriaLabel' }))

    await waitFor(() => {
      expect(ignoreMessage).toHaveBeenCalledWith('msg-sched')
    })
    expect(screen.queryByRole('button', { name: 'chat.cancelScheduledAriaLabel' })).not.toBeInTheDocument()
  })
})

const chatInboxes = [
  { _id: 'ci1', name: 'Chat Inbox 1', kind: 'chat', inboxToken: 'tok-1', webhookUrl: null, active: true },
  { _id: 'ci2', name: 'Chat Inbox 2', kind: 'chat', inboxToken: 'tok-2', webhookUrl: null, active: true },
]

describe('<ChatPage> — Story 5: Nova conversa inbox picker', () => {
  beforeEach(() => {
    (getRooms as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { rooms: [], hasMore: false } })
  })

  // Story 5 / Scenario 1
  it('shows InboxPickerModal when licensee has more than one active chat inbox', async () => {
    (getInboxes as ReturnType<typeof vi.fn>).mockResolvedValue({ data: chatInboxes })

    mount()

    fireEvent.click(await screen.findByRole('button', { name: 'chat.newConversationAriaLabel' }))

    await waitFor(() => {
      expect(screen.getByText('Chat Inbox 1')).toBeInTheDocument()
      expect(screen.getByText('Chat Inbox 2')).toBeInTheDocument()
    })
  })

  // Story 5 / Scenario 2
  it('skips inbox picker and does not show it when licensee has exactly one chat inbox', async () => {
    (getInboxes as ReturnType<typeof vi.fn>).mockResolvedValue([chatInboxes[0]])

    mount()

    fireEvent.click(await screen.findByRole('button', { name: 'chat.newConversationAriaLabel' }))

    await waitFor(() => {
      expect(getInboxes).toHaveBeenCalled()
    })

    expect(screen.queryByText('Chat Inbox 1')).not.toBeInTheDocument()
    expect(screen.queryByText('chat.selectInbox')).not.toBeInTheDocument()
  })

  // Story 5 / Scenario 3
  it('dismisses InboxPickerModal and opens NewConversationModal after inbox selection', async () => {
    (getInboxes as ReturnType<typeof vi.fn>).mockResolvedValue({ data: chatInboxes })

    mount()

    fireEvent.click(await screen.findByRole('button', { name: 'chat.newConversationAriaLabel' }))

    await waitFor(() => {
      expect(screen.getByText('Chat Inbox 1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Chat Inbox 1'))
    fireEvent.click(screen.getByRole('button', { name: 'common.confirm' }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'common.confirm' })).not.toBeInTheDocument()
    })
  })
})

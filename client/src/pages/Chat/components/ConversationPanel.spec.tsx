import { render, screen, fireEvent } from '@testing-library/react'
import ConversationPanel from './ConversationPanel'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, opts?: Record<string, unknown>) =>
      opts ? `${k}:${JSON.stringify(opts)}` : k,
    i18n: { language: 'pt', changeLanguage: vi.fn() },
  }),
}))
import type { IRoom } from '../../../types'
import type { IMessage } from '../../../types'

const room: IRoom = {
  _id: 'room-1',
  id: 'room-1',
  contact: { _id: 'c1', name: 'Maria Souza', number: '5511999990002' },
  status: 'open',
  closed: false,
}

const messages: IMessage[] = [
  {
    id: 'msg-1',
    kind: 'text',
    destination: 'to-chat',
    text: 'Olá!',
    url: '',
    fileName: '',
    latitude: 0,
    longitude: 0,
    sended: true,
    error: null,
    cart: null,
    createdAt: '2026-06-17T10:00:00.000Z',
    contact: null,
    trigger: null,
    department: null,
  },
  {
    id: 'msg-2',
    kind: 'text',
    destination: 'to-messenger',
    text: 'Tudo bem?',
    url: '',
    fileName: '',
    latitude: 0,
    longitude: 0,
    sended: false,
    error: null,
    cart: null,
    createdAt: '2026-06-17T10:01:00.000Z',
    contact: null,
    trigger: null,
    department: null,
  },
]

describe('<ConversationPanel>', () => {
  it('shows "Selecione uma conversa." when room is null', () => {
    render(<ConversationPanel room={null} messages={[]} onSend={vi.fn()} onBack={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByText('chat.selectConversation')).toBeInTheDocument()
  })

  it('renders contact name when room is provided', () => {
    render(<ConversationPanel room={room} messages={[]} onSend={vi.fn()} onBack={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByText('Maria Souza')).toBeInTheDocument()
  })

  it('messages are present in the DOM', () => {
    render(<ConversationPanel room={room} messages={messages} onSend={vi.fn()} onBack={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByText('Olá!')).toBeInTheDocument()
    expect(screen.getByText('Tudo bem?')).toBeInTheDocument()
  })

  it('delegates send to onSend callback', () => {
    const handleSend = vi.fn()
    render(<ConversationPanel room={room} messages={[]} onSend={handleSend} onBack={vi.fn()} onClose={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('chat.messagePlaceholder'), { target: { value: 'Nova mensagem' } })
    fireEvent.click(screen.getByRole('button', { name: 'chat.sendAriaLabel' }))

    expect(handleSend).toHaveBeenCalledWith('Nova mensagem')
  })

  it('shows "Concluir" button when room is open', () => {
    render(<ConversationPanel room={room} messages={[]} onSend={vi.fn()} onBack={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'chat.concludeAriaLabel' })).toBeInTheDocument()
  })

  it('calls onClose when "Concluir" is clicked', () => {
    const handleClose = vi.fn()
    render(<ConversationPanel room={room} messages={[]} onSend={vi.fn()} onBack={vi.fn()} onClose={handleClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'chat.concludeAriaLabel' }))

    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('hides "Concluir" button when room is closed', () => {
    const closedRoom = { ...room, status: 'closed' as const, closed: true }
    render(<ConversationPanel room={closedRoom} messages={[]} onSend={vi.fn()} onBack={vi.fn()} onClose={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'chat.concludeAriaLabel' })).not.toBeInTheDocument()
  })

  // --- schedule-message plan: Scenario 3 (component level) ---
  it('delegates onSchedule to MessageInput when prop is provided', () => {
    const handleSchedule = vi.fn()
    render(
      <ConversationPanel
        room={room}
        messages={[]}
        onSend={vi.fn()}
        onSchedule={handleSchedule}
        onBack={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText('chat.messagePlaceholder'), { target: { value: 'Msg' } })
    fireEvent.click(screen.getByRole('button', { name: 'chat.scheduleToggleAriaLabel' }))

    const futureDate = new Date(Date.now() + 60 * 60 * 1000)
    fireEvent.change(screen.getByLabelText('chat.scheduleDateAriaLabel'), {
      target: { value: futureDate.toISOString().slice(0, 16) },
    })
    fireEvent.click(screen.getByRole('button', { name: 'chat.scheduleSubmitLabel' }))

    expect(handleSchedule).toHaveBeenCalledWith('Msg', expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/))
  })

  it('disables message input when room is closed', () => {
    const closedRoom = { ...room, status: 'closed' as const, closed: true }
    render(<ConversationPanel room={closedRoom} messages={[]} onSend={vi.fn()} onBack={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByPlaceholderText('chat.messagePlaceholder')).toBeDisabled()
  })

  // --- schedule-message plan: Scenario 6 ---
  it('shows clock icon on bubble for unsent scheduled message in the future', () => {
    const futureScheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const scheduledMsg: IMessage = {
      id: 'msg-sched',
      kind: 'text',
      destination: 'to-messenger',
      text: 'Mensagem agendada',
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

    render(
      <ConversationPanel
        room={room}
        messages={[scheduledMsg]}
        onSend={vi.fn()}
        onCancelScheduled={vi.fn()}
        onBack={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('chat.cancelScheduledAriaLabel')).toBeInTheDocument()
  })

  // --- schedule-message plan: Scenario 9 ---
  it('calls onCancelScheduled with message id when cancel button is clicked', () => {
    const handleCancel = vi.fn()
    const futureScheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const scheduledMsg: IMessage = {
      id: 'msg-cancel',
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

    render(
      <ConversationPanel
        room={room}
        messages={[scheduledMsg]}
        onSend={vi.fn()}
        onCancelScheduled={handleCancel}
        onBack={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'chat.cancelScheduledAriaLabel' }))

    expect(handleCancel).toHaveBeenCalledWith('msg-cancel')
  })

  it('does not show clock icon for a message that is already sent', () => {
    const sentScheduledMsg: IMessage = {
      id: 'msg-sent',
      kind: 'text',
      destination: 'to-messenger',
      text: 'Enviada',
      url: '',
      fileName: '',
      latitude: 0,
      longitude: 0,
      sended: true,
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      error: null,
      cart: null,
      createdAt: new Date().toISOString(),
      contact: null,
      trigger: null,
      department: null,
    }

    render(
      <ConversationPanel
        room={room}
        messages={[sentScheduledMsg]}
        onSend={vi.fn()}
        onCancelScheduled={vi.fn()}
        onBack={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.queryByLabelText('chat.cancelScheduledAriaLabel')).not.toBeInTheDocument()
  })
})

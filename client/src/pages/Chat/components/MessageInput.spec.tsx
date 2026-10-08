import { render, screen, fireEvent } from '@testing-library/react'
import MessageInput from './MessageInput'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'pt', changeLanguage: vi.fn() },
  }),
}))

describe('<MessageInput>', () => {
  it('calls onSend with input value on button click', () => {
    const handleSend = vi.fn()
    render(<MessageInput onSend={handleSend} />)

    fireEvent.change(screen.getByPlaceholderText('chat.messagePlaceholder'), { target: { value: 'Olá!' } })
    fireEvent.click(screen.getByRole('button', { name: 'chat.sendAriaLabel' }))

    expect(handleSend).toHaveBeenCalledWith('Olá!')
  })

  it('clears input after send', () => {
    render(<MessageInput onSend={vi.fn()} />)

    const input = screen.getByPlaceholderText('chat.messagePlaceholder')
    fireEvent.change(input, { target: { value: 'Mensagem' } })
    fireEvent.click(screen.getByRole('button', { name: 'chat.sendAriaLabel' }))

    expect(input).toHaveValue('')
  })

  it('does NOT call onSend on empty input', () => {
    const handleSend = vi.fn()
    render(<MessageInput onSend={handleSend} />)

    fireEvent.click(screen.getByRole('button', { name: 'chat.sendAriaLabel' }))

    expect(handleSend).not.toHaveBeenCalled()
  })

  // --- schedule-message plan: Scenario 1 ---
  it('shows datetime picker when clock button is clicked', () => {
    render(<MessageInput onSend={vi.fn()} onSchedule={vi.fn()} />)

    expect(screen.queryByLabelText('chat.scheduleDateAriaLabel')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'chat.scheduleToggleAriaLabel' }))

    expect(screen.getByLabelText('chat.scheduleDateAriaLabel')).toBeInTheDocument()
  })

  // --- schedule-message plan: Scenario 2 ---
  it('disables Agendar button when selected datetime is in the past', () => {
    render(<MessageInput onSend={vi.fn()} onSchedule={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('chat.messagePlaceholder'), { target: { value: 'Olá' } })
    fireEvent.click(screen.getByRole('button', { name: 'chat.scheduleToggleAriaLabel' }))

    fireEvent.change(screen.getByLabelText('chat.scheduleDateAriaLabel'), {
      target: { value: '2000-01-01T00:00' },
    })

    expect(screen.getByRole('button', { name: 'chat.scheduleSubmitLabel' })).toBeDisabled()
  })

  // --- schedule-message plan: Scenario 3 ---
  it('calls onSchedule with ISO scheduledAt when datetime is valid and future', () => {
    const handleSchedule = vi.fn()
    render(<MessageInput onSend={vi.fn()} onSchedule={handleSchedule} />)

    fireEvent.change(screen.getByPlaceholderText('chat.messagePlaceholder'), { target: { value: 'Agendada' } })
    fireEvent.click(screen.getByRole('button', { name: 'chat.scheduleToggleAriaLabel' }))

    const futureDate = new Date(Date.now() + 60 * 60 * 1000)
    const localValue = futureDate.toISOString().slice(0, 16)
    fireEvent.change(screen.getByLabelText('chat.scheduleDateAriaLabel'), { target: { value: localValue } })

    fireEvent.click(screen.getByRole('button', { name: 'chat.scheduleSubmitLabel' }))

    expect(handleSchedule).toHaveBeenCalledWith('Agendada', expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/))
  })

  // --- schedule-message plan: Scenario 7 ---
  it('clears text and hides picker after onSchedule is called', () => {
    render(<MessageInput onSend={vi.fn()} onSchedule={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('chat.messagePlaceholder'), { target: { value: 'Msg' } })
    fireEvent.click(screen.getByRole('button', { name: 'chat.scheduleToggleAriaLabel' }))

    const futureDate = new Date(Date.now() + 60 * 60 * 1000)
    const localValue = futureDate.toISOString().slice(0, 16)
    fireEvent.change(screen.getByLabelText('chat.scheduleDateAriaLabel'), { target: { value: localValue } })

    fireEvent.click(screen.getByRole('button', { name: 'chat.scheduleSubmitLabel' }))

    expect(screen.getByPlaceholderText('chat.messagePlaceholder')).toHaveValue('')
    expect(screen.queryByLabelText('chat.scheduleDateAriaLabel')).not.toBeInTheDocument()
  })

  // --- schedule-message plan: additional ---
  it('does not render clock button when onSchedule prop is absent', () => {
    render(<MessageInput onSend={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'chat.scheduleToggleAriaLabel' })).not.toBeInTheDocument()
  })

  it('input and button are disabled when disabled=true', () => {
    render(<MessageInput onSend={vi.fn()} disabled />)

    expect(screen.getByPlaceholderText('chat.messagePlaceholder')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'chat.sendAriaLabel' })).toBeDisabled()
  })

  // --- local-chat-files plan stubs (task-06) ---

  describe('file attachment', () => {
    it.todo('renders an attachment button when onSendFile prop is provided (S1)')
    it.todo('shows filename preview after a file is selected via the attachment button (S1)')
    it.todo('calls onSendFile with the selected File when Send is clicked with a pending file (S2)')
    it.todo('clears the pending file after onSendFile is called (S2)')
    it.todo('does NOT render the attachment button when onSendFile is not provided')
    it.todo('hides the attachment button when disabled=true')
  })
})

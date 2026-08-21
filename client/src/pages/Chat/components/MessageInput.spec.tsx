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
  it.todo('shows datetime picker when clock button is clicked')

  // --- schedule-message plan: Scenario 2 ---
  it.todo('disables Agendar button when selected datetime is in the past')

  // --- schedule-message plan: Scenario 3 ---
  it.todo('calls onSchedule with ISO scheduledAt when datetime is valid and future')

  // --- schedule-message plan: Scenario 7 ---
  it.todo('clears text and hides picker after onSchedule is called')

  // --- schedule-message plan: additional ---
  it.todo('does not render clock button when onSchedule prop is absent')

  it('input and button are disabled when disabled=true', () => {
    render(<MessageInput onSend={vi.fn()} disabled />)

    expect(screen.getByPlaceholderText('chat.messagePlaceholder')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'chat.sendAriaLabel' })).toBeDisabled()
  })
})

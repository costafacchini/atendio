import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import NewConversationModal from './NewConversationModal'
import { createRoom } from '../../../services/rooms'
import { AppContext } from '../../../contexts/App'

vi.mock('../../../services/rooms')
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'pt', changeLanguage: vi.fn() },
  }),
}))
vi.mock('../../../components/SelectContactsWithFilter', () => ({
  default: ({ onChange }: { onChange: (value: { value: string; label: string }) => void }) => (
    <button
      type='button'
      data-testid='mock-select-contact'
      onClick={() => onChange({ value: 'contact-id-1', label: 'Contato Teste' })}
    >
      Selecionar contato
    </button>
  ),
}))

const appContextValue = {
  currentUser: { role: 'agent', licensee: { id: 'lic-1' } },
  activeLicensee: null,
  updateActiveLicensee: vi.fn(),
  resetLicenseeModal: vi.fn(),
  setCurrentUser: vi.fn(),
  markLicenseeModalSeen: vi.fn(),
  licenseeModalSeen: false,
}

function renderModal(show: boolean, onClose = vi.fn(), onRoomCreated = vi.fn()) {
  return render(
    <AppContext.Provider value={appContextValue}>
      <NewConversationModal show={show} onClose={onClose} onRoomCreated={onRoomCreated} />
    </AppContext.Provider>
  )
}

describe('<NewConversationModal>', () => {
  it('modal not visible when show=false', () => {
    renderModal(false)

    expect(screen.queryByText('chat.newConversationModalTitle')).not.toBeInTheDocument()
  })

  it('modal visible when show=true', () => {
    renderModal(true)

    expect(screen.getByText('chat.newConversationModalTitle')).toBeInTheDocument()
  })

  it('calls createRoom when a contact is selected', async () => {
    (createRoom as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { room: { _id: 'r1', id: 'r1', contact: { _id: 'c1', name: 'Contato Teste' }, status: 'open', closed: false } },
    })

    renderModal(true)

    fireEvent.click(screen.getByTestId('mock-select-contact'))

    await waitFor(() => {
      expect(createRoom).toHaveBeenCalledWith('contact-id-1', undefined)
    })
  })

  it('calls onRoomCreated on success and shows error when createRoom rejects', async () => {
    const onRoomCreated = vi.fn()
    const onClose = vi.fn()

    const room = { _id: 'r1', id: 'r1', contact: { _id: 'c1', name: 'Contato Teste' }, status: 'open', closed: false }
    ;(createRoom as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { room } })

    renderModal(true, onClose, onRoomCreated)

    fireEvent.click(screen.getByTestId('mock-select-contact'))

    await waitFor(() => {
      expect(onRoomCreated).toHaveBeenCalledWith(room)
      expect(onClose).toHaveBeenCalled()
    })

    // Now test error path
    ;(createRoom as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('network'))

    render(
      <AppContext.Provider value={appContextValue}>
        <NewConversationModal show={true} onClose={vi.fn()} onRoomCreated={vi.fn()} />
      </AppContext.Provider>
    )

    fireEvent.click(screen.getAllByTestId('mock-select-contact')[1])

    expect(await screen.findByText('chat.createRoomError')).toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import Navbar from './index'
import { AppContext } from '../../contexts/App'
import { getInboxes } from '../../services/inbox'

vi.mock('../../services/inbox', () => ({
  getInboxes: vi.fn().mockResolvedValue({ data: [] }),
}))

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>()
  return {
    ...actual,
    useTranslation: () => ({
      t: (k: string) => k,
      i18n: { language: 'pt', changeLanguage: vi.fn() },
    }),
  }
})

const appContextValue = { updateActiveLicensee: vi.fn() }

function renderWithContext(ui: React.ReactElement) {
  return render(
    <AppContext.Provider value={appContextValue}>
      {ui}
    </AppContext.Provider>
  )
}

describe('<Navbar>', () => {
  it('renders the navbar options', () => {
    renderWithContext(<Navbar />)

    expect(screen.getByText('navbar.dashboard')).toBeInTheDocument()
    expect(screen.getByText('navbar.contacts')).toBeInTheDocument()
    expect(screen.getByText('navbar.triggers')).toBeInTheDocument()
    expect(screen.getByText('navbar.messages')).toBeInTheDocument()
    expect(screen.getByText('navbar.templates')).toBeInTheDocument()
    expect(screen.queryByText('navbar.licensees')).not.toBeInTheDocument()
    expect(screen.queryByText('navbar.users')).not.toBeInTheDocument()
    expect(screen.queryByText('navbar.reports')).not.toBeInTheDocument()
  })

  it('renders the navbar options for admins', () => {
    renderWithContext(<Navbar currentUser={{ role: 'admin' }} />)

    expect(screen.getByText('navbar.licensees')).toBeInTheDocument()
    expect(screen.getByText('navbar.users')).toBeInTheDocument()
    expect(screen.queryByText('navbar.reports')).not.toBeInTheDocument()
  })

  it('renders the navbar options for super users', () => {
    renderWithContext(<Navbar currentUser={{ role: 'super' }} />)
    expect(screen.getByText('navbar.reports')).toBeInTheDocument()
  })

  describe('Chat nav link', () => {
    it('is NOT rendered when there is no chat inbox', () => {
      renderWithContext(<Navbar currentUser={{ role: 'agent', licensee: { id: 'lic-1' } }} />)
      expect(screen.queryByText('navbar.chat')).not.toBeInTheDocument()
    })

    it('is rendered when there is a chat inbox', async () => {
      ;(getInboxes as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [{ id: 'inbox-1', kind: 'chat' }] })
      renderWithContext(<Navbar currentUser={{ role: 'agent', licensee: { id: 'lic-1' } }} />)
      expect(await screen.findByText('navbar.chat')).toBeInTheDocument()
    })
  })

  describe('Inboxes nav item', () => {
    it('is hidden when role is agent', () => {
      renderWithContext(<Navbar currentUser={{ role: 'agent' }} />)
      expect(screen.queryByText('navbar.inboxes')).not.toBeInTheDocument()
    })

    it('is visible for admin', () => {
      renderWithContext(<Navbar currentUser={{ role: 'admin' }} />)
      expect(screen.getByText('navbar.inboxes')).toBeInTheDocument()
    })

    it('is visible for super', () => {
      renderWithContext(<Navbar currentUser={{ role: 'super' }} />)
      expect(screen.getByText('navbar.inboxes')).toBeInTheDocument()
    })
  })

  describe('Setores nav item', () => {
    it('is hidden when useSetores is false', () => {
      renderWithContext(<Navbar currentUser={{ role: 'admin', licensee: { useDepartments: false } }} />)
      expect(screen.queryByText('navbar.departments')).not.toBeInTheDocument()
    })

    it('is hidden when role is agent', () => {
      renderWithContext(<Navbar currentUser={{ role: 'agent', licensee: { useDepartments: true } }} />)
      expect(screen.queryByText('navbar.departments')).not.toBeInTheDocument()
    })

    it('is visible for admin with useSetores enabled', () => {
      renderWithContext(<Navbar currentUser={{ role: 'admin', licensee: { useDepartments: true } }} />)
      expect(screen.getByText('navbar.departments')).toBeInTheDocument()
    })

    it('is visible for supervisor with useSetores enabled', () => {
      renderWithContext(<Navbar currentUser={{ role: 'supervisor', licensee: { useDepartments: true } }} />)
      expect(screen.getByText('navbar.departments')).toBeInTheDocument()
    })
  })
})

import { screen, render } from '@testing-library/react'
import RootRoutes from '../pages/routes'
import * as auth from '../services/auth'
import { AppContextProvider } from '../contexts/App'

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

describe('<RootRoutes>', () => {
  beforeEach(() => { vi.clearAllMocks() })

  afterEach(() => { window.location.hash = '' })

  it('renders the login page if user is not logged in', () => {
    const isAuthenticatedSpy = vi.spyOn(auth, 'isAuthenticated').mockImplementation(() => false)

    render(
      <AppContextProvider>
        <RootRoutes />
      </AppContextProvider>
    )

    const title = screen.getByText(/atend\.io/i)
    const emailField = screen.getByText('login.emailLabel')
    const passwordField = screen.getByText('login.passwordLabel')
    const loginButton = screen.getByText('login.submitButton')

    expect(title).toBeInTheDocument()
    expect(emailField).toBeInTheDocument()
    expect(passwordField).toBeInTheDocument()
    expect(loginButton).toBeInTheDocument()
    expect(isAuthenticatedSpy).toHaveBeenCalled()
  })

  it('renders the dashboard if user is logged in', async () => {
    const isAuthenticatedSpy = vi.spyOn(auth, 'isAuthenticated').mockImplementation(() => true)

    render(
      <AppContextProvider>
        <RootRoutes />
      </AppContextProvider>
    )

    await screen.findByText('navbar.contacts')

    const navbar = screen.getByRole('navigation')

    expect(navbar).toBeInTheDocument()
    expect(isAuthenticatedSpy).toHaveBeenCalled()
  })
})

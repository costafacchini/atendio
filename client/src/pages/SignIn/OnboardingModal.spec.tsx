import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import OnboardingModal from './OnboardingModal'
import { createAccount } from '../../services/onboarding'

vi.mock('../../services/onboarding')

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, opts?: Record<string, unknown>) => {
      // Interpolate {{status}} for the error key
      if (opts && typeof opts.status !== 'undefined') return `${k}:${opts.status}`
      return k
    },
    i18n: { language: 'pt', changeLanguage: vi.fn() },
  }),
}))

// LanguageSwitcher uses useTranslation internally — mock it to render PT/EN buttons
vi.mock('../../components/LanguageSwitcher', () => ({
  LanguageSwitcher: ({ className }: { className?: string }) => (
    <div data-testid='language-switcher' className={className}>
      <button type='button' onClick={() => {}}>PT</button>
      <button type='button' onClick={() => {}}>EN</button>
    </div>
  ),
}))

describe('<OnboardingModal />', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  }

  function mount(props: any = {}) {
    render(<OnboardingModal {...defaultProps} {...props} />)
  }

  async function fillIdentityAndAdvance() {
    fireEvent.change(screen.getByLabelText('onboarding.identity.companyNameLabel'), { target: { value: 'Acme Corp' } })
    fireEvent.change(screen.getByLabelText('onboarding.identity.kindLabel'), { target: { value: 'company' } })
    fireEvent.change(screen.getByLabelText('onboarding.identity.documentLabel'), { target: { value: '12345678000195' } })
    fireEvent.change(screen.getByLabelText('onboarding.identity.phoneLabel'), { target: { value: '11999990000' } })
    fireEvent.change(screen.getByLabelText('onboarding.identity.licenseeEmailLabel'), { target: { value: 'acme@acme.com' } })
    fireEvent.click(screen.getByText('onboarding.buttons.next'))

    await screen.findByText('onboarding.user.userNameLabel')
  }

  describe('onboarding payload', () => {
    it('includes language in the submission payload', async () => {
      ;(createAccount as any).mockResolvedValue({ status: 201 })

      mount()
      await fillIdentityAndAdvance()

      fireEvent.change(screen.getByLabelText('onboarding.user.userNameLabel'), { target: { value: 'John Doe' } })
      fireEvent.change(screen.getByLabelText('onboarding.user.userEmailLabel'), { target: { value: 'john@acme.com' } })
      fireEvent.change(screen.getByLabelText('onboarding.user.passwordLabel'), { target: { value: 'senha123' } })
      fireEvent.change(screen.getByLabelText('onboarding.user.confirmPasswordLabel'), { target: { value: 'senha123' } })

      fireEvent.click(screen.getByRole('button', { name: 'onboarding.buttons.submit' }))

      await waitFor(() =>
        expect(createAccount).toHaveBeenCalledWith(
          expect.objectContaining({ language: 'pt' })
        )
      )
    })

    it('does not include chat or whatsapp fields in the submission payload', async () => {
      ;(createAccount as any).mockResolvedValue({ status: 201 })

      mount()
      await fillIdentityAndAdvance()

      fireEvent.change(screen.getByLabelText('onboarding.user.userNameLabel'), { target: { value: 'John Doe' } })
      fireEvent.change(screen.getByLabelText('onboarding.user.userEmailLabel'), { target: { value: 'john@acme.com' } })
      fireEvent.change(screen.getByLabelText('onboarding.user.passwordLabel'), { target: { value: 'senha123' } })
      fireEvent.change(screen.getByLabelText('onboarding.user.confirmPasswordLabel'), { target: { value: 'senha123' } })

      fireEvent.click(screen.getByRole('button', { name: 'onboarding.buttons.submit' }))

      await waitFor(() => expect(createAccount).toHaveBeenCalled())

      const payload = (createAccount as any).mock.calls[0][0]
      expect(payload).not.toHaveProperty('chatDefault')
      expect(payload).not.toHaveProperty('chatUrl')
      expect(payload).not.toHaveProperty('chatIdentifier')
      expect(payload).not.toHaveProperty('chatKey')
      expect(payload).not.toHaveProperty('whatsappDefault')
      expect(payload).not.toHaveProperty('whatsappToken')
      expect(payload).not.toHaveProperty('whatsappUrl')
    })
  })

  describe('LanguageSwitcher', () => {
    it('renders the language switcher in the modal header', () => {
      mount()
      expect(screen.getByTestId('language-switcher')).toBeInTheDocument()
    })
  })
})

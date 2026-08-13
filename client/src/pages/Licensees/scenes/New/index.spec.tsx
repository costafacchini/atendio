import LicenseeNew from '.'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { createLicensee } from '../../../../services/licensee'

vi.mock('../../../../services/licensee')

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

describe('<LicenseeNew />', () => {
  function mount(props = {}) {
    const currentUser = props.currentUser ?? { isPedidos10: false }
    const Stub = createRoutesStub([
      {
        path: '/licensees/new',
        Component: () => <LicenseeNew currentUser={currentUser} />,
      },
      {
        path: '/licensees',
        Component: () => <div>Licensees Index</div>,
      },
    ])
    render(<Stub initialEntries={['/licensees/new']} />)
  }

  async function fillIdentityStep() {
    fireEvent.change(screen.getByLabelText(/^licensees\.wizard\.identity\.nameLabel/), { target: { value: 'Licensee Test' } })
    fireEvent.change(screen.getByLabelText(/^licensees\.wizard\.identity\.kindLabel/), { target: { value: 'company' } })
    fireEvent.change(screen.getByLabelText(/^licensees\.wizard\.identity\.documentLabel/), { target: { value: '12345678000195' } })
    fireEvent.change(screen.getByLabelText(/^licensees\.wizard\.identity\.emailLabel/), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByLabelText(/^licensees\.wizard\.identity\.phoneLabel/), { target: { value: '48999999999' } })
  }

  async function advanceThroughAllSteps() {
    // Step 1: Identity
    await fillIdentityStep()
    fireEvent.click(screen.getByRole('button', { name: 'licensees.wizard.nextButton' }))

    // Step 2: ChatBot is the last step (shows Salvar, not Next)
    await waitFor(() => expect(screen.getByRole('button', { name: 'common.save' })).toBeInTheDocument())
  }

  it('renders the wizard with Identity step on mount', () => {
    mount()

    expect(screen.getByLabelText(/^licensees\.wizard\.identity\.nameLabel/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^licensees\.wizard\.identity\.kindLabel/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^licensees\.wizard\.identity\.documentLabel/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^licensees\.wizard\.identity\.emailLabel/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^licensees\.wizard\.identity\.licenseKindLabel/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^licensees\.wizard\.identity\.phoneLabel/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'licensees.wizard.nextButton' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'common.save' })).not.toBeInTheDocument()
  })

  it('shows validation errors on Step 1 when Next clicked with empty required fields', async () => {
    mount()

    fireEvent.click(screen.getByRole('button', { name: 'licensees.wizard.nextButton' }))

    await waitFor(() => expect(screen.getByText('licensees.wizard.identity.nameRequired')).toBeInTheDocument())
  })

  it('advances to ChatBot step after filling all required Identity fields', async () => {
    mount()

    await fillIdentityStep()
    fireEvent.click(screen.getByRole('button', { name: 'licensees.wizard.nextButton' }))

    await waitFor(() => expect(screen.getByText('licensees.wizard.chatbotGateLabel')).toBeInTheDocument())
  })

  it('does NOT show chat or whatsapp steps', async () => {
    mount()

    await fillIdentityStep()
    fireEvent.click(screen.getByRole('button', { name: 'licensees.wizard.nextButton' }))

    await waitFor(() => expect(screen.getByText('licensees.wizard.chatbotGateLabel')).toBeInTheDocument())

    expect(screen.queryByText('licensees.wizard.chatGateLabel')).not.toBeInTheDocument()
    expect(screen.queryByText('licensees.wizard.whatsappGateLabel')).not.toBeInTheDocument()
  })

  it('creates a new licensee when chatbot step answered with Não', async () => {
    createLicensee.mockResolvedValue({ status: 201, data: {} })
    mount()

    await advanceThroughAllSteps()
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))

    await waitFor(() => expect(createLicensee).toHaveBeenCalled())
  })

  it('renders backend errors on last step when creation fails', async () => {
    createLicensee.mockResolvedValue({ status: 422, data: { errors: [{ message: 'Erro!' }] } })
    mount()

    await advanceThroughAllSteps()
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))

    await waitFor(() => expect(screen.getByText('Erro!')).toBeInTheDocument())
  })

  it('Cancelar navigates to /licensees from Step 1', async () => {
    mount()

    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }))

    await waitFor(() => expect(screen.getByText('Licensees Index')).toBeInTheDocument())
  })

  it('Voltar from Step 2 returns to Step 1', async () => {
    mount()

    await fillIdentityStep()
    fireEvent.click(screen.getByRole('button', { name: 'licensees.wizard.nextButton' }))

    await waitFor(() => expect(screen.getByText('licensees.wizard.chatbotGateLabel')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'licensees.wizard.backButton' }))

    await waitFor(() => expect(screen.getByLabelText(/^licensees\.wizard\.identity\.nameLabel/)).toBeInTheDocument())
    expect(screen.queryByText('licensees.wizard.chatbotGateLabel')).not.toBeInTheDocument()
  })
})

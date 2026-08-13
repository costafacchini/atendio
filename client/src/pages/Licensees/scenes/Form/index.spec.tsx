import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import LicenseeForm from './'

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

describe('<LicenseeForm />', () => {
  const onSubmit = vi.fn()

  function mount(props = {}) {
    const Stub = createRoutesStub([
      {
        path: '/test',
        Component: () => <LicenseeForm onSubmit={onSubmit} {...props} />,
      },
    ])
    render(<Stub initialEntries={['/test']} />)
  }

  it('is rendered with the default initial values', () => {
    mount({ initialValues: { chatbotDefault: 'landbot' } })

    expect(screen.getByLabelText(/^licensees\.form\.nameLabel/)).toHaveValue('')
    expect(screen.getByLabelText(/^licensees\.form\.kindLabel/)).toHaveValue('')
    expect(screen.getByLabelText(/^licensees\.form\.documentLabel/)).toHaveValue('')
    expect(screen.getByLabelText(/^licensees\.form\.emailLabel/)).toHaveValue('')
    expect(screen.getByLabelText(/^licensees\.form\.licenseKindLabel/)).toHaveValue('demo')
    expect(screen.getByLabelText(/^licensees\.form\.phoneLabel/)).toHaveValue('')
    expect(screen.getByLabelText('licensees.form.apiTokenLabel')).toHaveValue('')
    expect(screen.getByLabelText('licensees.form.activeLabel')).not.toBeChecked()
    expect(screen.getByLabelText('licensees.form.chatbot.chatbotDefaultLabel')).toHaveValue('landbot')
    expect(screen.getByLabelText('licensees.form.chatbot.chatbotUrlLabel')).toHaveValue('')
    expect(screen.getByLabelText('licensees.form.chatbot.chatbotTokenLabel')).toHaveValue('')
    expect(screen.getByLabelText('licensees.form.chatbot.chatbotApiTokenLabel')).toHaveValue('')
    expect(screen.getByLabelText('licensees.form.chatbot.messageOnResetLabel')).toHaveValue('')
    expect(screen.getByLabelText('licensees.form.chatbot.messageOnCloseLabel')).toHaveValue('')
    expect(screen.getByLabelText('licensees.form.webhookChatLabel')).toHaveValue('')
    expect(screen.getByLabelText('licensees.form.webhookChatbotLabel')).toHaveValue('')
    expect(screen.getByLabelText('licensees.form.webhookChatbotTransferLabel')).toHaveValue('')
    expect(screen.getByLabelText('licensees.form.webhookWhatsappLabel')).toHaveValue('')
  })

  it('can receive initial values', () => {
    const licensee = {
      name: 'Name',
      active: true,
      email: 'email@gmail.com',
      phone: '48999999215',
      apiToken: 'token',
      licenseKind: 'paid',
      useChatbot: true,
      chatbotDefault: 'landbot',
      chatbotUrl: 'URL chatbot',
      chatbotAuthorizationToken: 'token chatbot',
      messageOnResetChatbot: 'message',
      messageOnCloseChat: 'on chat',
      chatbotApiToken: 'token api chatbot',
      urlChatWebhook: 'URL para webhook de Chat',
      urlChatbotWebhook: 'URL para webhook de Chatbot',
      urlChatbotTransfer: 'URL de webhook para transferir do Chatbot para o Chat',
      urlWhatsappWebhook: 'URL para webhook de whatsapp',
      document: '3692836715156',
      kind: 'company',
    }

    mount({ initialValues: licensee })

    expect(screen.getByLabelText(/^licensees\.form\.nameLabel/)).toHaveValue('Name')
    expect(screen.getByLabelText('licensees.form.activeLabel')).toBeChecked()
    expect(screen.getByLabelText(/^licensees\.form\.kindLabel/)).toHaveValue('company')
    expect(screen.getByLabelText(/^licensees\.form\.documentLabel/)).toHaveValue('3692836715156')
    expect(screen.getByLabelText(/^licensees\.form\.emailLabel/)).toHaveValue('email@gmail.com')
    expect(screen.getByLabelText(/^licensees\.form\.phoneLabel/)).toHaveValue('48999999215')
    expect(screen.getByLabelText('licensees.form.apiTokenLabel')).toHaveValue('token')
    expect(screen.getByLabelText(/^licensees\.form\.licenseKindLabel/)).toHaveValue('paid')
    expect(screen.getByLabelText('licensees.form.chatbot.chatbotDefaultLabel')).toHaveValue('landbot')
    expect(screen.getByLabelText('licensees.form.chatbot.chatbotUrlLabel')).toHaveValue('URL chatbot')
    expect(screen.getByLabelText('licensees.form.chatbot.chatbotTokenLabel')).toHaveValue('token chatbot')
    expect(screen.getByLabelText('licensees.form.chatbot.chatbotApiTokenLabel')).toHaveValue('token api chatbot')
    expect(screen.getByLabelText('licensees.form.chatbot.messageOnResetLabel')).toHaveValue('message')
    expect(screen.getByLabelText('licensees.form.chatbot.messageOnCloseLabel')).toHaveValue('on chat')
    expect(screen.getByLabelText('licensees.form.webhookChatLabel')).toHaveValue('URL para webhook de Chat')
    expect(screen.getByLabelText('licensees.form.webhookChatbotLabel')).toHaveValue('URL para webhook de Chatbot')
    expect(screen.getByLabelText('licensees.form.webhookChatbotTransferLabel')).toHaveValue('URL de webhook para transferir do Chatbot para o Chat')
    expect(screen.getByLabelText('licensees.form.webhookWhatsappLabel')).toHaveValue('URL para webhook de whatsapp')
  })

  describe('fields', () => {
    it('always shows the ChatBot tab nav item regardless of useChatbot in initialValues', () => {
      mount({ initialValues: { useChatbot: false } })

      expect(screen.getByRole('button', { name: 'licensees.form.tabChatBot' })).toBeInTheDocument()
    })
  })

  describe('tabs', () => {
    it('shows Principal and ChatBot tab nav items', () => {
      mount()

      expect(screen.getByRole('button', { name: 'licensees.form.tabPrincipal' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'licensees.form.tabChatBot' })).toBeInTheDocument()
    })

    it('does NOT show Chat or WhatsApp tab nav items', () => {
      mount()

      expect(screen.queryByRole('button', { name: 'licensees.form.tabChat' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'licensees.form.tabWhatsApp' })).not.toBeInTheDocument()
    })

    it('marks the Principal tab nav button as active on initial render', () => {
      mount()

      expect(screen.getByRole('button', { name: 'licensees.form.tabPrincipal' })).toHaveClass('active')
    })

    it('clicking a tab nav button marks it as active and removes active from Principal', () => {
      mount({ initialValues: { useChatbot: true } })

      const chatbotTab = screen.getByRole('button', { name: 'licensees.form.tabChatBot' })
      expect(chatbotTab).not.toHaveClass('active')

      fireEvent.click(chatbotTab)

      expect(chatbotTab).toHaveClass('active')
      expect(screen.getByRole('button', { name: 'licensees.form.tabPrincipal' })).not.toHaveClass('active')
    })

    it('clicking Principal tab after another tab makes Principal active again', () => {
      mount({ initialValues: { useChatbot: true } })

      fireEvent.click(screen.getByRole('button', { name: 'licensees.form.tabChatBot' }))
      expect(screen.getByRole('button', { name: 'licensees.form.tabChatBot' })).toHaveClass('active')

      fireEvent.click(screen.getByRole('button', { name: 'licensees.form.tabPrincipal' }))
      expect(screen.getByRole('button', { name: 'licensees.form.tabPrincipal' })).toHaveClass('active')
      expect(screen.getByRole('button', { name: 'licensees.form.tabChatBot' })).not.toHaveClass('active')
    })

    it('all tab panes are present in the DOM regardless of which tab is active', () => {
      mount()

      const tabPanes = document.querySelectorAll('.tab-pane')
      expect(tabPanes).toHaveLength(2)
    })
  })

  describe('submit', () => {
    it('is called when the user submits the form', async () => {
      mount()

      expect(onSubmit).not.toHaveBeenCalled()

      fireEvent.click(screen.getByText('common.save'))

      await waitFor(() => expect(onSubmit).toHaveBeenCalled())

      expect(onSubmit).toHaveBeenCalledWith({
        name: '',
        email: '',
        phone: '',
        active: false,
        apiToken: '',
        licenseKind: 'demo',
        useChatbot: false,
        chatbotDefault: '',
        chatbotUrl: '',
        chatbotAuthorizationToken: '',
        messageOnResetChatbot: '',
        chatbotApiToken: '',
        messageOnCloseChat: '',
        document: '',
        kind: '',
        useSenderName: false,
        useFileIDYcloud: false,
        useDepartments: false,
      })
    })
  })
})

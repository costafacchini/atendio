import InboxEdit from './'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  getInbox,
  updateInbox,
  getInboxBaileysStatus,
  getInboxWppconnectServerV2Status,
} from '../../../../services/inbox'
import { createRoutesStub } from 'react-router'

vi.mock('../../../../services/inbox')
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'pt', changeLanguage: vi.fn() },
  }),
}))

describe('<InboxEdit />', () => {
  const currentUser = {
    role: 'admin',
    licensee: { _id: 'lic-1' },
  }

  function mount() {
    ;(getInboxBaileysStatus as any).mockResolvedValue({ data: { connected: false } })
    ;(getInboxWppconnectServerV2Status as any).mockResolvedValue({ data: { connected: false } })

    const Stub = createRoutesStub([
      {
        path: '/inboxes/:id/edit',
        Component: () => <InboxEdit currentUser={currentUser} />,
      },
      {
        path: '/inboxes',
        Component: () => <div>Inboxes Index</div>,
      },
    ])
    render(<Stub initialEntries={['/inboxes/1/edit']} />)
  }

  it('renders the form with the received inbox', async () => {
    ;(getInbox as any).mockResolvedValue({
      status: 200,
      data: { id: '1', name: 'WhatsApp Principal', kind: 'messenger', active: true, whatsappDefault: 'utalk' },
    })

    mount()

    expect(await screen.findByDisplayValue('WhatsApp Principal')).toBeInTheDocument()
  })

  it('updates the inbox on submit', async () => {
    ;(getInbox as any).mockResolvedValue({
      status: 200,
      data: { id: '1', name: 'WhatsApp Principal', kind: 'messenger', active: true, whatsappDefault: 'utalk' },
    })

    mount()

    await screen.findByDisplayValue('WhatsApp Principal')

    fireEvent.change(screen.getByLabelText('common.name'), { target: { value: 'WhatsApp Atualizado' } })

    ;(updateInbox as any).mockResolvedValue({ status: 200 })

    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))

    await waitFor(() =>
      expect(updateInbox).toHaveBeenCalledWith('1', expect.objectContaining({ name: 'WhatsApp Atualizado' }))
    )
  })

  it('shows InboxBaileysPanel when kind is messenger and whatsappDefault is baileys', async () => {
    ;(getInbox as any).mockResolvedValue({
      status: 200,
      data: { id: '1', name: 'Baileys Inbox', kind: 'messenger', active: true, whatsappDefault: 'baileys' },
    })

    mount()

    expect(await screen.findByText('inboxes.baileys.title')).toBeInTheDocument()
  })

  it('does not show InboxBaileysPanel when whatsappDefault is not baileys', async () => {
    ;(getInbox as any).mockResolvedValue({
      status: 200,
      data: { id: '1', name: 'UTalk Inbox', kind: 'messenger', active: true, whatsappDefault: 'utalk' },
    })

    mount()

    await screen.findByDisplayValue('UTalk Inbox')

    expect(screen.queryByText('inboxes.baileys.title')).not.toBeInTheDocument()
  })

  it('shows InboxWppconnectServerV2Panel when kind is messenger and whatsappDefault is wppconnect-server-v2', async () => {
    ;(getInbox as any).mockResolvedValue({
      status: 200,
      data: {
        id: '1',
        name: 'Wppconnect Server v2 Inbox',
        kind: 'messenger',
        active: true,
        whatsappDefault: 'wppconnect-server-v2',
        whatsappUrl: 'https://my-wppconnect-server-v2.com',
        whatsappToken: 'session-token',
      },
    })

    mount()

    expect(await screen.findByText('inboxes.wppconnectServerV2.title')).toBeInTheDocument()
  })

  it('keeps whatsappToken/whatsappUrl fields visible when whatsappDefault is wppconnect-server-v2', async () => {
    ;(getInbox as any).mockResolvedValue({
      status: 200,
      data: {
        id: '1',
        name: 'Wppconnect Server v2 Inbox',
        kind: 'messenger',
        active: true,
        whatsappDefault: 'wppconnect-server-v2',
        whatsappUrl: 'https://my-wppconnect-server-v2.com',
        whatsappToken: 'session-token',
      },
    })

    mount()

    await screen.findByDisplayValue('Wppconnect Server v2 Inbox')

    expect(screen.getByLabelText('inboxes.whatsappToken')).toBeInTheDocument()
    expect(screen.getByLabelText('inboxes.whatsappUrl')).toBeInTheDocument()
  })
})

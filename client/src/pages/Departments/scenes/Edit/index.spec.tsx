import SectorEdit from './'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  getDepartment,
  updateDepartment,
  getDepartmentBaileysStatus,
  getDepartmentWppconnectServerV2Status,
} from '../../../../services/department'
import { getUsers } from '../../../../services/user'
import { getInboxes } from '../../../../services/inbox'
import { createRoutesStub } from 'react-router'
import { AppContext } from '../../../../contexts/App'

vi.mock('../../../../services/department')
vi.mock('../../../../services/user')
vi.mock('../../../../services/inbox', () => ({
  getInboxes: vi.fn(),
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'pt', changeLanguage: vi.fn() },
  }),
}))

describe('<SectorEdit />', () => {
  const currentUser = {
    role: 'admin',
    licensee: { id: 'lic-1' },
  }

  const appContextValue = { activeLicensee: null, updateActiveLicensee: vi.fn() }

  beforeEach(() => {
    ;(getInboxes as any).mockResolvedValue({ data: [] })
  })

  function mount() {
    ;(getUsers as any).mockResolvedValue({ data: [] })
    ;(getDepartmentBaileysStatus as any).mockResolvedValue({ data: { connected: false } })
    ;(getDepartmentWppconnectServerV2Status as any).mockResolvedValue({ data: { connected: false } })

    const Stub = createRoutesStub([
      {
        path: '/departments/:id/edit',
        Component: () => (
          <AppContext.Provider value={appContextValue as any}>
            <SectorEdit currentUser={currentUser} />
          </AppContext.Provider>
        ),
      },
      {
        path: '/departments',
        Component: () => <div>Departments Index</div>,
      },
    ])
    render(<Stub initialEntries={['/departments/1/edit']} />)
  }

  it('renders the form with the received department', async () => {
    ;(getDepartment as any).mockResolvedValue({
      status: 200,
      data: { id: '1', name: 'Suporte', active: true, users: [] },
    })

    mount()

    await screen.findByDisplayValue('Suporte')
  })

  it('updates the department on submit', async () => {
    ;(getDepartment as any).mockResolvedValue({
      status: 200,
      data: { id: '1', name: 'Suporte', active: true, users: [] },
    })

    mount()

    await screen.findByDisplayValue('Suporte')

    fireEvent.change(screen.getByLabelText('common.name'), { target: { value: 'TI' } })

    ;(updateDepartment as any).mockResolvedValue({ status: 200 })

    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))

    await waitFor(() =>
      expect(updateDepartment).toHaveBeenCalledWith(expect.objectContaining({ name: 'TI' }))
    )
  })

  it('shows inbox selector populated with messenger inboxes', async () => {
    ;(getDepartment as any).mockResolvedValue({
      status: 200,
      data: { id: '1', name: 'Suporte', active: true, users: [] },
    })
    ;(getInboxes as any).mockResolvedValue({
      data: [
        { _id: 'i1', name: 'WhatsApp Principal', kind: 'messenger', inboxToken: 'tok-1', webhookUrl: null, active: true },
        { _id: 'i2', name: 'WhatsApp Suporte', kind: 'messenger', inboxToken: 'tok-2', webhookUrl: null, active: true },
      ],
    })

    mount()

    await screen.findByDisplayValue('Suporte')

    expect(await screen.findByText('WhatsApp Principal')).toBeInTheDocument()
    expect(screen.getByText('WhatsApp Suporte')).toBeInTheDocument()
    expect(screen.getByLabelText('departments.inbox')).toBeInTheDocument()
  })

  it('includes inbox in the PUT payload on submit', async () => {
    ;(getDepartment as any).mockResolvedValue({
      status: 200,
      data: { id: '1', name: 'Suporte', active: true, users: [], inbox: null },
    })
    ;(getInboxes as any).mockResolvedValue({
      data: [
        { _id: 'i1', name: 'WhatsApp Principal', kind: 'messenger', inboxToken: 'tok-1', webhookUrl: null, active: true },
      ],
    })
    ;(updateDepartment as any).mockResolvedValue({ status: 200 })

    mount()

    await screen.findByDisplayValue('Suporte')

    const inboxSelect = await screen.findByLabelText('departments.inbox')
    fireEvent.change(inboxSelect, { target: { value: 'i1' } })

    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))

    await waitFor(() =>
      expect(updateDepartment).toHaveBeenCalledWith(expect.objectContaining({ inbox: 'i1' }))
    )
  })

  it('renders the DepartmentWppconnectServerV2Panel alongside the Baileys panel', async () => {
    ;(getDepartment as any).mockResolvedValue({
      status: 200,
      data: { id: '1', name: 'Suporte', active: true, users: [] },
    })

    mount()

    await screen.findByDisplayValue('Suporte')

    expect(await screen.findByText('departments.wppconnectServerV2.title')).toBeInTheDocument()
  })
})

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { logout } from '../../services/auth'
import { getInboxes } from '../../services/inbox'
import { useApp } from '../../contexts/App'
import type { IUser } from '../../types'
import type { IInbox } from '../../types/inbox'

export default function Navbar({ currentUser }: { currentUser?: IUser | null }) {
  const { t } = useTranslation()
  const { resetLicenseeModal, activeLicensee } = useApp()
  const [inboxes, setInboxes] = useState<IInbox[]>([])

  const effectiveLicensee = activeLicensee ?? (typeof currentUser?.licensee === 'object' ? currentUser.licensee : null)
  const licenseeId: string | undefined =
    effectiveLicensee?.id ??
    (currentUser?.licensee != null && typeof currentUser.licensee !== 'object'
      ? String(currentUser.licensee)
      : undefined)

  useEffect(() => {
    if (!licenseeId) { setInboxes([]); return }
    getInboxes({ licensee: licenseeId }).then(res => setInboxes((res.data as IInbox[]) ?? []))
  }, [licenseeId])

  function handleSwitchLicensee() {
    resetLicenseeModal()
  }

  return (
      <nav className='navbar navbar-expand-lg navbar-dark bg-primary'>
        <div className='container-fluid'>
          <button className='navbar-toggler' type='button' data-bs-toggle='collapse' data-bs-target='#navbarSupportedContent' aria-controls='navbarSupportedContent' aria-expanded='false' aria-label='Toggle navigation'>
            <span className='navbar-toggler-icon'></span>
          </button>
          <div className='collapse navbar-collapse' id='navbarSupportedContent'>
            <ul className='navbar-nav me-auto mb-2 mb-lg-0'>
              <li className='nav-item'>
                <a className='nav-link active' aria-current='page' href='/#/'>{t('navbar.dashboard')}</a>
              </li>
              {currentUser && ['admin', 'super'].includes(currentUser.role) && (
                <li className='nav-item dropdown'>
                  <button className='nav-link dropdown-toggle' type='button' data-bs-toggle='dropdown' id='admin-dropdown' aria-expanded='false'>
                    {t('navbar.admin')}
                  </button>

                  <div className='dropdown-menu' aria-labelledby='admin-dropdown'>
                    <a href='/#/licensees' className='dropdown-item'>
                      {t('navbar.licensees')}
                    </a>

                    <a href='/#/users' className='dropdown-item'>
                      {t('navbar.users')}
                    </a>
                  </div>
                </li>
              )}
              <li className='nav-item dropdown'>
                <button className='nav-link dropdown-toggle' type='button' data-bs-toggle='dropdown' id='cadastros-dropdown' aria-expanded='false'>
                  {t('navbar.registrations')}
                </button>

                <div className='dropdown-menu' aria-labelledby='cadastros-dropdown'>
                  <a className='dropdown-item' href='/#/contacts'>
                    {t('navbar.contacts')}
                  </a>

                  {currentUser && ['super', 'admin', 'supervisor'].includes(currentUser.role) && effectiveLicensee?.useDepartments && (
                    <a className='dropdown-item' href='/#/departments'>
                      {t('navbar.departments')}
                    </a>
                  )}

                  {currentUser && ['super', 'admin'].includes(currentUser.role) && (
                    <a className='dropdown-item' href='/#/inboxes'>
                      {t('navbar.inboxes')}
                    </a>
                  )}

                  <a className='dropdown-item' href='/#/triggers'>
                    {t('navbar.triggers')}
                  </a>

                  <a className='dropdown-item' href='/#/templates'>
                    {t('navbar.templates')}
                  </a>
                </div>
              </li>
              <li className='nav-item'>
                <a className='nav-link' href='/#/messages'>{t('navbar.messages')}</a>
              </li>
              {inboxes.some(i => i.kind === 'chat') && (
                <li className='nav-item'>
                  <a className='nav-link' href='/#/chat'>{t('navbar.chat')}</a>
                </li>
              )}
              {currentUser && currentUser.role === 'super' && (
                <li className='nav-item dropdown'>
                  <button className='nav-link dropdown-toggle' type='button' id='reports-menu' data-bs-toggle='dropdown' aria-expanded='false'>
                    {t('navbar.reports')}
                  </button>
                  <div className='dropdown-menu' aria-labelledby='reports-menu'>
                    <a className='dropdown-item' href='/#/reports/message'>{t('navbar.messages')}</a>
                  </div>
                </li>
              )}
            </ul>
            <div className='d-flex align-items-center gap-3'>
              {effectiveLicensee?.name && (
                <span className='d-none d-lg-block text-white-50' style={{ fontSize: '0.85rem' }}>
                  {effectiveLicensee.name}
                </span>
              )}
              <div className='dropdown'>
              <button className='btn btn-primary dropdown-toggle' type='button' data-bs-toggle='dropdown' aria-expanded='false'>
                <i className='bi bi-person-circle'></i>{currentUser?.name ? ` ${currentUser.name}` : ''}
              </button>
              <ul className='dropdown-menu dropdown-menu-end'>
                {currentUser && !currentUser?.licensee && ['super', 'admin'].includes(currentUser.role) && (
                  <li>
                    <button className='dropdown-item' onClick={handleSwitchLicensee}>
                      {t('navbar.switchLicensee')}
                    </button>
                  </li>
                )}
                <li>
                  <a className='dropdown-item' href='/' onClick={logout}>{t('navbar.logout')}</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        </div>
      </nav>
  )
}

import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router'
import { getContacts } from '../../../../services/contact'
import SelectLicenseesWithFilter from '../../../../components/SelectLicenseesWithFilter'
import { useSimpleCrud } from '../../../../contexts/SimpleCrud'
import { useApp } from '../../../../contexts/App'
import isEmpty from 'lodash/isEmpty'
import type { IContact, IContactFilters, IUser } from '../../../../types'
import { useTranslation } from 'react-i18next'

interface ContactsIndexProps {
  currentUser: IUser | null | undefined
}

function ContactsIndex({ currentUser }: ContactsIndexProps) {
  const { t } = useTranslation()
  const { activeLicensee } = useApp()
  const { filters, setFilters, cache } = useSimpleCrud()
  const { addPage } = cache
  const contactFilters = filters as IContactFilters | undefined
  const [expression, setExpression] = useState(contactFilters?.expression ?? '')
  const [loading, setLoading] = useState(false)

  const onFilter = useCallback(
    async (changedFilters: Partial<IContactFilters>) => {
      const newFilters: IContactFilters = { ...contactFilters, ...changedFilters }
      setFilters(newFilters)
      setLoading(true)
      try {
        const { data: contacts } = await getContacts(newFilters)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        addPage(contacts as any, newFilters)
      } finally {
        setLoading(false)
      }
    },
    [contactFilters, setFilters, addPage]
  )

  useEffect(() => {
    let abortController = new AbortController()

    try {
      if (!isEmpty(contactFilters)) return
      if (!currentUser) return

      const initialFilters: IContactFilters = { page: 1 }
      const licenseeObj = currentUser.licensee as { id?: string; _id?: string } | string | number | null | undefined
      const effectiveLicensee = activeLicensee?.id ??
        (typeof licenseeObj === 'object' && licenseeObj !== null
          ? (licenseeObj.id ?? licenseeObj._id)
          : licenseeObj != null ? String(licenseeObj) : undefined)
      if (effectiveLicensee) initialFilters.licensee = effectiveLicensee

      onFilter(initialFilters)
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Handling error thrown by aborting request
      }
    }

    return () => {
      abortController.abort()
    }
  }, [contactFilters, onFilter, currentUser, activeLicensee])

  function changeExpression(event: React.ChangeEvent<HTMLInputElement>) {
    setExpression(event.target.value)
  }

  function nextPage() {
    const newFilters: IContactFilters = { ...contactFilters, page: (contactFilters?.page ?? 1) + 1 }
    onFilter(newFilters)
  }

  function toggleGroupFilter() {
    const isGroup = contactFilters?.isGroup ? undefined : true
    const newFilters: IContactFilters = { ...contactFilters, isGroup, page: 1 }
    onFilter(newFilters)
  }

  return (
    <>
      <div className='row'>
        <div className='d-flex justify-content-between pb-2'>
          <div className=''>
            <h3 className='pe-3'>{t('contacts.title')}</h3>
          </div>
          <div className=''>
            <Link to='/contacts/new' className='btn btn-primary'>{t('contacts.newContact')}</Link>
          </div>
        </div>
      </div>
      <div className='row'>
        <div className='d-flex flex-row justify-content-end pb-2'>
          <div className='flex-column w-50'>
            {currentUser && currentUser.role === 'super' && !activeLicensee && (
              <div className='form-group'>
                <label htmlFor='licensee' id='licensee'>{t('contacts.licenseeFilter')}</label>
                <SelectLicenseesWithFilter
                  name='licensee'
                  aria-labelledby='licensee'
                  selectedItem={contactFilters?.licensee ? null : null}
                  onChange={(e: { value?: string } | null) => {
                    const inputValue = e && e.value ? e.value : ''
                    const newFilters: IContactFilters = { ...contactFilters, licensee: inputValue, page: 1 }
                    onFilter(newFilters)
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <div className='row'>
        <div className='d-flex justify-content-between pb-2'>
          <div className=''>
            <button
              type='button'
              className={`btn btn-sm ${contactFilters?.isGroup ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={toggleGroupFilter}
            >
              {contactFilters?.isGroup ? t('contacts.viewAll') : t('contacts.viewGroups')}
            </button>
          </div>
          <div className=''>
            <div className='input-group'>
              <input
                className='form-control'
                name='expression'
                type='text'
                value={expression}
                placeholder={t('contacts.expressionPlaceholder')}
                onChange={changeExpression}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onFilter({ ...contactFilters, expression, page: 1 })
                  }
                }}
              />
              <button
                className='btn btn-primary'
                title={t('contacts.filterButtonTitle')}
                aria-label={t('contacts.filterButtonAriaLabel')}
                onClick={() => {
                  const newFilters: IContactFilters = { ...contactFilters, expression: expression, page: 1 }
                  onFilter(newFilters)
                }}
              >
                <i className='bi bi-search'></i>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className='row'>
        <table className='table'>
          <thead>
            <tr>
              <th scope='col'>{t('contacts.columnName')}</th>
              <th scope='col'>{t('contacts.columnNumber')}</th>
              <th scope='col'>{t('contacts.columnType')}</th>
              <th scope='col'>{t('contacts.columnEmail')}</th>
              <th scope='col'></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className='text-center text-muted py-4'>
                  <span className='spinner-border spinner-border-sm me-2' role='status' aria-hidden='true' />
                  {t('common.loading')}
                </td>
              </tr>
            ) : (cache.records as unknown as IContact[]).length === 0 ? (
              <tr>
                <td colSpan={5} className='text-center text-muted py-4'>
                  {t('contacts.noContactsFound')}
                </td>
              </tr>
            ) : (cache.records as unknown as IContact[]).map((contact) => (
              <tr key={contact.id}>
                <td>{contact.name}</td>
                <td>{contact.number}</td>
                <td>{contact.type}</td>
                <td>{contact.email}</td>
                <td>
                  <Link to={`/contacts/${contact.id}`} aria-label={t('contacts.editAriaLabel', { name: contact.name })}>
                    <i className='bi bi-pencil' />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section>
        <div className='container'>
          {!cache.lastPage && (
            <div className='row'>
              <div className='col text-center mt-3'>
                <button
                  type='button'
                  className='btn btn-outline-primary d-print-none'
                  onClick={nextPage}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className='spinner-border spinner-border-sm me-2' role='status' aria-hidden='true' />
                      {t('common.loading')}
                    </>
                  ) : t('common.loadMore')}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

export default ContactsIndex

import { useEffect, useState, useCallback } from 'react'
import { getMessages, resendMessage } from '../../../../services/message'
import SelectLicenseesWithFilter from '../../../../components/SelectLicenseesWithFilter'
import SelectContactsWithFilter from '../../../../components/SelectContactsWithFilter'
import CartDescription from './components/cart'
import styles from './styles.module.scss'
import moment from 'moment-timezone'
import isEmpty from 'lodash/isEmpty'
import { toast } from 'react-toastify'
import { useApp } from '../../../../contexts/App'
import type { IMessage, IMessageFilters } from '../../../../types'
import type { IUser } from '../../../../types'
import { useTranslation } from 'react-i18next'

interface MessagesIndexProps {
  currentUser: IUser | null | undefined
}

type RetryStatus = 'idle' | 'loading' | 'success' | 'error'

function getInitialFilters(): IMessageFilters {
  return {
    startDate: moment().subtract(3, 'hours').format('YYYY-MM-DDTHH:mm'),
    endDate: moment().format('YYYY-MM-DDTHH:mm'),
    licensee: '',
    onlyErrors: false,
    contact: '',
    kind: '',
    destination: '',
    page: 1
  }
}

function MessagesIndex({ currentUser }: MessagesIndexProps) {
  const { t } = useTranslation()
  const { activeLicensee } = useApp()
  const [filters, setFilters] = useState<IMessageFilters>(getInitialFilters)

  const [records, setRecords] = useState<IMessage[]>([])
  const [lastPage, setLastPage] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [retryState, setRetryState] = useState<Record<string, RetryStatus>>({})

  const showLicenseeFilter = currentUser?.role === 'super' && !activeLicensee

  const KIND_LABELS: Record<string, string> = {
    text: t('messages.kindText'),
    file: t('messages.kindFile'),
    location: t('messages.kindLocation'),
    interactive: t('messages.kindInteractive'),
    cart: t('messages.kindCart'),
  }

  const DESTINATION_LABELS: Record<string, string> = {
    'to-chatbot': t('messages.destinationChatbot'),
    'to-chat': t('messages.destinationChat'),
    'to-messenger': t('messages.destinationWhatsapp'),
    'to-transfer': t('messages.destinationTransfer'),
  }

  function handleRetry(id: string) {
    setRetryState((prev) => ({ ...prev, [id]: 'loading' }))
    resendMessage(id)
      .then(() => setRetryState((prev) => ({ ...prev, [id]: 'success' })))
      .catch(() => setRetryState((prev) => ({ ...prev, [id]: 'error' })))
  }

  const addPage = useCallback(
    (messages: IMessage[], appliedFilters: IMessageFilters) => {
      if (appliedFilters?.page === 1) {
        setRecords(messages)
      } else {
        setRecords((prevRecords) => [...prevRecords, ...messages])
      }

      setLastPage(isEmpty(messages))
    },
    [setRecords]
  )

  const onFilter = useCallback(
    async (changedFilters: Partial<IMessageFilters>) => {
      const newFilters: IMessageFilters = { ...filters, ...changedFilters }
      setFilters(newFilters)
      setLoading(true)

      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        const apiFilters: IMessageFilters = {
          ...newFilters,
          ...(newFilters.startDate && { startDate: moment.tz(newFilters.startDate, tz).utc().toISOString() }),
          ...(newFilters.endDate && { endDate: moment.tz(newFilters.endDate, tz).utc().toISOString() }),
        }
        const { data: messages } = await getMessages(apiFilters)
        addPage(messages, newFilters)
        setHasSearched(true)
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') return
        toast.error(t('messages.loadError'))
      } finally {
        setLoading(false)
      }
    },
    [filters, setFilters, addPage, t]
  )

  useEffect(() => {
    const licenseeObj = currentUser?.licensee as { id?: string; _id?: string } | string | number | null | undefined
    const effectiveLicensee = activeLicensee?.id ??
      (typeof licenseeObj === 'object' && licenseeObj !== null
        ? (licenseeObj.id ?? licenseeObj._id)
        : licenseeObj != null ? String(licenseeObj) : undefined)
    if (currentUser && effectiveLicensee && filters.licensee !== effectiveLicensee) {
      setFilters({ ...filters, licensee: effectiveLicensee })
    }
  }, [currentUser, activeLicensee, filters, setFilters])

  function handleChange({ target }: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFilters({ ...filters, [target.name]: target.value, page: 1 })
  }

  function handleChangeOnlyErrors({ target }: React.ChangeEvent<HTMLInputElement>) {
    let newFilters: IMessageFilters

    if (target.checked === true) {
      newFilters = { ...filters, sended: false }
    } else {
      const { sended: _removed, ...rest } = filters
      newFilters = rest
    }

    setFilters({ ...newFilters, onlyErrors: target.checked })
  }

  function handleReset() {
    setFilters(getInitialFilters())
    setRecords([])
    setLastPage(false)
    setHasSearched(false)
  }

  function handleSubmitSearch(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()

    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      toast.error(t('messages.dateError'))
      return
    }

    const abortController = new AbortController()

    try {
      onFilter(filters)
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Handling error thrown by aborting request
      }
    }

    return () => {
      abortController.abort()
    }
  }

  return (
    <>
      <div className='d-flex justify-content-between pb-2'>
        <div className=''>
          <h3 className='pe-3'>{t('messages.title')}</h3>
        </div>
      </div>

      <div className='row mb-3'>
        <div className='col-3'>
          <div className='form-group'>
            <label htmlFor='startDate'>{t('messages.startDateLabel')}</label>
            <input
              value={filters.startDate}
              onChange={handleChange}
              className='form-control'
              type='datetime-local'
              name='startDate'
              id='startDate'
            />
          </div>
        </div>

        <div className='col-3'>
          <div className='form-group'>
            <label htmlFor='endDate'>{t('messages.endDateLabel')}</label>
            <input
              value={filters.endDate}
              onChange={handleChange}
              className='form-control'
              type='datetime-local'
              name='endDate'
              id='endDate'
            />
          </div>
        </div>

        <div className='form-group col-3'>
          <label htmlFor='kind'>{t('messages.kindLabel')}</label>
          <select value={filters.kind} name='kind' id='kind' className='form-select' onChange={handleChange}>
            <option value=''>{t('common.actions')}</option>
            <option value='text'>{t('messages.kindText')}</option>
            <option value='file'>{t('messages.kindFile')}</option>
            <option value='location'>{t('messages.kindLocation')}</option>
            <option value='interactive'>{t('messages.kindInteractive')}</option>
            <option value='cart'>{t('messages.kindCart')}</option>
          </select>
        </div>

        <div className='form-group col-3'>
          <label htmlFor='destination'>{t('messages.destinationLabel')}</label>
          <select
            value={filters.destination}
            name='destination'
            id='destination'
            className='form-select'
            onChange={handleChange}
          >
            <option value=''>{t('common.actions')}</option>
            <option value='to-chatbot'>{t('messages.destinationChatbot')}</option>
            <option value='to-chat'>{t('messages.destinationChat')}</option>
            <option value='to-messenger'>{t('messages.destinationWhatsapp')}</option>
            <option value='to-transfer'>{t('messages.destinationTransfer')}</option>
          </select>
        </div>
      </div>

      <div className='row mb-3'>
        {showLicenseeFilter && (
          <div className='col-6'>
            <div className='form-group'>
              <label htmlFor='licensee' id='licensee'>
                {t('messages.licenseeFilter')}
              </label>
              <SelectLicenseesWithFilter
                name='licensee'
                aria-labelledby='licensee'
                selectedItem={null}
                onChange={(e: { value?: string } | null) => {
                  const inputValue = e && e.value ? e.value : ''
                  const newFilters: IMessageFilters = { ...filters, licensee: inputValue, page: 1 }
                  setFilters(newFilters)
                }}
              />
            </div>
          </div>
        )}
        {/* TODO: department filter for admin — deferred */}

        <div className={showLicenseeFilter ? 'col-6' : 'col-12'}>
          <div className='form-group'>
            <label htmlFor='contact' id='contact'>
              {t('messages.contactFilter')}
            </label>
            <SelectContactsWithFilter
              name='contact'
              aria-labelledby='contact'
              selectedItem={filters.contact}
              onChange={(e: { value?: string } | null) => {
                const inputValue = e && e.value ? e.value : ''
                const newFilters: IMessageFilters = { ...filters, contact: inputValue, page: 1 }
                setFilters(newFilters)
              }}
              licensee={filters.licensee}
            />
          </div>
        </div>

        <div className='col-12 mt-3'>
          <div className='form-check'>
            <input
              checked={filters.onlyErrors}
              onChange={handleChangeOnlyErrors}
              type='checkbox'
              className='form-check-input'
              name='onlyErrors'
              id='onlyErrors'
            />
            <label className='form-check-label' htmlFor='onlyErrors'>
              {t('messages.onlyErrorsLabel')}
            </label>
          </div>
        </div>
      </div>

      <div className='row justify-content-end mb-3'>
        <div className='col-auto'>
          <button
            type='button'
            className='btn btn-outline-secondary me-2'
            onClick={handleReset}
          >
            {t('messages.clearFilters')}
          </button>
          <button
            type='button'
            className='btn btn-primary'
            aria-label={t('messages.searchButton')}
            onClick={handleSubmitSearch}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className='spinner-border spinner-border-sm me-2' role='status' aria-hidden='true' />
                {t('messages.searching')}
              </>
            ) : t('messages.searchButton')}
          </button>
        </div>
      </div>

      <div className='row mt-3'>
        <table className={`${styles.stickyHeader} table table-striped table-hover table-bordered`}>
          <thead>
            <tr>
              <th scope='col'>{t('messages.columnContact')}</th>
              <th scope='col'>{t('messages.columnText')}</th>
              <th scope='col'>{t('messages.columnType')}</th>
              <th scope='col'>{t('messages.columnDestination')}</th>
              <th scope='col'>{t('messages.columnDate')}</th>
              <th scope='col'>{t('messages.columnSent')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className='text-center text-muted py-4'>
                  <span className='spinner-border spinner-border-sm me-2' role='status' aria-hidden='true' />
                  {t('common.loading')}
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={6} className='text-center text-muted py-4'>
                  {hasSearched
                    ? t('messages.noMessagesFound')
                    : t('messages.applyFiltersPrompt')}
                </td>
              </tr>
            ) : records.map((message) => (
              <tr key={message.id}>
                <td>
                  <div>
                    {message.contact?.name}
                    {message.department && <span className='badge bg-secondary ms-1'>{message.department.name}</span>}
                  </div>
                  {message.error && (
                    <div>
                      <details className='mt-1'>
                        <summary className='text-muted'>{t('messages.viewError')}</summary>
                        <p className='mb-0'>{message.error}</p>
                      </details>
                      <div className='mt-1'>
                        <button
                          type='button'
                          className='btn btn-sm btn-outline-warning'
                          disabled={retryState[message.id] === 'loading'}
                          onClick={() => handleRetry(message.id)}
                        >
                          {retryState[message.id] === 'loading' ? t('messages.resending') : t('messages.resend')}
                        </button>
                        {retryState[message.id] === 'success' && (
                          <span className='text-success small ms-2'>{t('messages.resendSuccess')}</span>
                        )}
                        {retryState[message.id] === 'error' && (
                          <span className='text-danger small ms-2'>{t('messages.resendError')}</span>
                        )}
                      </div>
                    </div>
                  )}
                </td>
                <td>
                  {message.kind === 'location' && (
                    <>
                      <a
                        href={`http://maps.google.com/maps?q=${message.latitude},${message.longitude}&ll=${message.latitude},${message.longitude}&z=17`}
                        target='_blank'
                        rel='noreferrer'
                      >
                        <i className='bi bi-geo-alt'></i>
                      </a>
                      {` (${message.latitude}, ${message.longitude})`}
                    </>
                  )}
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {message.kind === 'cart' && Boolean(message.cart) && <CartDescription cart={message.cart as any} />}
                  {message.kind !== 'location' && message.kind !== 'cart' && <p className='mb-0'>{message.text}</p>}
                </td>
                <td>
                  <div>{KIND_LABELS[message.kind] ?? message.kind}</div>
                  <div>
                    {message.url && (
                      <a href={message.url} download target='_blank' rel='noreferrer'>
                        {message.fileName}
                      </a>
                    )}
                    {message.trigger && (
                      <a href={`#/triggers/${message.trigger._id.toString()}`} target='_blank' rel='noreferrer'>
                        {message.trigger.name}
                      </a>
                    )}
                  </div>
                </td>
                <td>{DESTINATION_LABELS[message.destination] ?? message.destination}</td>
                <td>{moment(message.createdAt).tz(Intl.DateTimeFormat().resolvedOptions().timeZone).format('DD/MM/YYYY HH:mm:ss')}</td>
                <td>{message.sended ? t('messages.sentYes') : t('messages.sentNo')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <section>
          <div className='container'>
            {!lastPage && hasSearched && (
              <div className='row'>
                <div className='col text-center mt-3'>
                  <button
                    type='button'
                    className='btn btn-outline-primary d-print-none'
                    disabled={loading}
                    onClick={() => {
                      onFilter({ ...filters, page: (filters.page ?? 1) + 1 })
                    }}
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
      </div>
    </>
  )
}

export default MessagesIndex

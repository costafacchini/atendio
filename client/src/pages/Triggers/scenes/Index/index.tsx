import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router'
import { getTriggers } from '../../../../services/trigger'
import SelectLicenseesWithFilter from '../../../../components/SelectLicenseesWithFilter'
import { useSimpleCrud } from '../../../../contexts/SimpleCrud'
import { useApp } from '../../../../contexts/App'
import isEmpty from 'lodash/isEmpty'
import type { IUser, ITriggerFilters } from '../../../../types'
import { useTranslation } from 'react-i18next'

interface TriggersIndexProps {
  currentUser?: IUser | null
}

function TriggersIndex({ currentUser }: TriggersIndexProps) {
  const { t } = useTranslation()
  const { activeLicensee } = useApp()
  const { filters, setFilters, cache } = useSimpleCrud()
  const { addPage } = cache
  const triggerFilters = filters as ITriggerFilters | undefined
  const [expression, setExpression] = useState(triggerFilters?.expression || '')

  const onFilter = useCallback(
    async (changedFilters: any) => {
      const newFilters = { ...triggerFilters, ...changedFilters }
      setFilters(newFilters)
      const { data: records } = await getTriggers(newFilters)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      addPage(records as any, newFilters)
    },
    [triggerFilters, setFilters, addPage]
  )

  useEffect(() => {
    let abortController = new AbortController()

    try {
      if (!isEmpty(triggerFilters)) return

      onFilter({ page: 1 })
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Handling error thrown by aborting request
      }
    }

    return () => {
      abortController.abort()
    }
  }, [triggerFilters, onFilter])

  useEffect(() => {
    if (isEmpty(triggerFilters) || !currentUser) return

    const licenseeObj = currentUser.licensee as { id?: string } | string | number | null
    const effectiveLicensee = activeLicensee?.id ??
      (typeof licenseeObj === 'object' && licenseeObj !== null
        ? licenseeObj.id
        : licenseeObj != null ? String(licenseeObj) : undefined)
    if (effectiveLicensee && triggerFilters?.licensee !== effectiveLicensee) {
      const newFilters = { ...triggerFilters, licensee: effectiveLicensee, page: 1 }
      onFilter(newFilters)
    }
  }, [currentUser, activeLicensee, triggerFilters, onFilter])

  function changeExpression(event: React.ChangeEvent<HTMLInputElement>) {
    setExpression(event.target.value)
  }

  function nextPage() {
    const newFilters = { ...triggerFilters, page: (triggerFilters?.page ?? 1) + 1 }
    onFilter(newFilters)
  }

  return (
    <>
      <div className='row'>
        <div className='d-flex justify-content-between pb-2'>
          <div className=''>
            <h3 className='pr-3'>{t('triggers.title')}</h3>
          </div>
          <div className=''>
            <Link to='/triggers/new' className='btn btn-primary'>{t('triggers.createButton')}</Link>
          </div>
        </div>
      </div>
      <div className='row'>
        <div className='d-flex flex-row justify-content-end pb-2'>
          <div className='flex-column w-50'>
            {currentUser && currentUser.role === 'super' && !activeLicensee && (
              <div className='form-group'>
                <label htmlFor='licensee' id='licensee'>{t('triggers.licenseeFilter')}</label>
                <SelectLicenseesWithFilter
                  name='licensee'
                  aria-labelledby='licensee'
                  selectedItem={null}
                  onChange={(e: any) => {
                    const inputValue = e && e.value ? e.value : ''
                    const newFilters = { ...triggerFilters, licensee: inputValue, page: 1 }
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
          </div>
          <div className=''>
            <div className='input-group'>
              <input
                className='form-control'
                name='expression'
                type='text'
                value={expression}
                placeholder={t('triggers.expressionPlaceholder')}
                onChange={changeExpression}
              />
              <div className='input-group-append'>
                <button className='btn btn-primary' title={t('triggers.filterButtonTitle')} onClick={() => {
                  const newFilters = { ...triggerFilters, expression: expression, page: 1 }
                  onFilter(newFilters)
                }}>
                  <i className='bi bi-search'></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className='row'>
        <table className='table'>
          <thead>
            <tr>
              <th scope='col'>{t('triggers.columnName')}</th>
              <th scope='col'>{t('triggers.columnExpression')}</th>
              <th scope='col'>{t('triggers.columnOrder')}</th>
              <th scope='col'>{t('triggers.columnType')}</th>
              <th scope='col'>{t('triggers.columnContent')}</th>
              <th scope='col'></th>
            </tr>
          </thead>
          <tbody>
            {cache.records.map((trigger: any) => (
              <tr key={trigger.id}>
                <td>{trigger.name}</td>
                <td>{trigger.expression}</td>
                <td>{trigger.order}</td>
                <td>{trigger.triggerKind}</td>
                {trigger.triggerKind === 'multi_product' && (<td>{trigger.catalogMulti}</td>)}
                {trigger.triggerKind === 'single_product' && (<td>{trigger.catalogSingle}</td>)}
                {trigger.triggerKind === 'reply_button' && (<td>{trigger.textReplyButton}</td>)}
                {trigger.triggerKind === 'list_message' && (<td>{trigger.messagesList}</td>)}
                {trigger.triggerKind === 'text' && (<td>{trigger.text}</td>)}
                <td>
                  <Link to={`/triggers/${trigger._id}`}><i className='bi bi-pencil' /></Link>
                  {trigger.triggerKind === 'multi_product' && (<Link to={`/triggers/${trigger.id}/importation`}><i className='bi bi-filetype-csv' /></Link>)}
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
                >
                  {t('common.loadMore')}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

export default TriggersIndex

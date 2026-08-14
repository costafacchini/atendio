import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router'
import { getTemplates } from '../../../../services/template'
import SelectLicenseesWithFilter from '../../../../components/SelectLicenseesWithFilter'
import { useSimpleCrud } from '../../../../contexts/SimpleCrud'
import { useApp } from '../../../../contexts/App'
import isEmpty from 'lodash/isEmpty'
import type { IUser, ITemplateFilters } from '../../../../types'
import { useTranslation } from 'react-i18next'

interface TemplatesIndexProps {
  currentUser?: IUser | null
}

function TemplatesIndex({ currentUser }: TemplatesIndexProps) {
  const { t } = useTranslation()
  const { activeLicensee } = useApp()
  const { filters, setFilters, cache } = useSimpleCrud()
  const { addPage } = cache
  const templateFilters = filters as ITemplateFilters | undefined
  const [expression, setExpression] = useState(templateFilters?.expression || '')

  const onFilter = useCallback(
    async (changedFilters: any) => {
      const newFilters = { ...templateFilters, ...changedFilters }
      setFilters(newFilters)
      const { data: templates } = await getTemplates(newFilters)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      addPage(templates as any, newFilters)
    },
    [templateFilters, setFilters, addPage]
  )

  useEffect(() => {
    let abortController = new AbortController()

    try {
      if (!isEmpty(templateFilters)) return

      onFilter({ page: 1 })
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Handling error thrown by aborting request
      }
    }

    return () => {
      abortController.abort()
    }
  }, [templateFilters, onFilter])

  useEffect(() => {
    if (isEmpty(templateFilters) || !currentUser) return

    const licenseeObj = currentUser.licensee as { id?: string } | string | number | null
    const effectiveLicensee = activeLicensee?.id ??
      (typeof licenseeObj === 'object' && licenseeObj !== null
        ? licenseeObj.id
        : licenseeObj != null ? String(licenseeObj) : undefined)
    if (effectiveLicensee && templateFilters?.licensee !== effectiveLicensee) {
      const newFilters = { ...templateFilters, licensee: effectiveLicensee, page: 1 }
      onFilter(newFilters)
    }
  }, [currentUser, activeLicensee, templateFilters, onFilter])

  function changeExpression(event: React.ChangeEvent<HTMLInputElement>) {
    setExpression(event.target.value)
  }

  function nextPage() {
    const newFilters = { ...templateFilters, page: (templateFilters?.page ?? 1) + 1 }
    onFilter(newFilters)
  }

  return (
    <>
      <div className='row'>
        <div className='d-flex justify-content-between pb-2'>
          <div className=''>
            <h3 className='pr-3'>{t('templates.title')}</h3>
          </div>
        </div>
      </div>
      <div className='row'>
        <div className='d-flex flex-row justify-content-end pb-2'>
          <div className='flex-column w-50'>
            {currentUser && currentUser.role === 'super' && !activeLicensee && (
              <div className='form-group'>
                <label htmlFor='licensee' id='licensee'>{t('templates.licenseeFilter')}</label>
                <SelectLicenseesWithFilter
                  name='licensee'
                  aria-labelledby='licensee'
                  selectedItem={null}
                  onChange={(e: any) => {
                    const inputValue = e && e.value ? e.value : ''
                    const newFilters = { ...templateFilters, licensee: inputValue, page: 1 }
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
                placeholder={t('templates.expressionPlaceholder')}
                onChange={changeExpression}
              />
              <div className='input-group-append'>
                <button className='btn btn-primary' title={t('templates.filterButtonTitle')} onClick={() => {
                  const newFilters = { ...templateFilters, expression: expression, page: 1 }
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
              <th scope='col'>{t('common.name')}</th>
              <th scope='col'>{t('templates.namespaceLabel')}</th>
              <th scope='col'></th>
            </tr>
          </thead>
          <tbody>
            {cache.records.map((template: any) => (
              <tr key={template.id}>
                <td>{template.name}</td>
                <td>{template.namespace}</td>
                <td>
                  <Link to={`/templates/${template._id}`}><i className='bi bi-pencil' /></Link>
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

export default TemplatesIndex

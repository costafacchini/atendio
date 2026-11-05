import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FieldWithError, Form } from '../../../../components/form'
import * as Yup from 'yup'
import { useNavigate } from 'react-router'
import Select from 'react-select'
import { getUsers } from '../../../../services/user'
import { getInboxes } from '../../../../services/inbox'
import type { IInbox } from '../../../../types/inbox'
import DepartmentBaileysPanel from '../Edit/DepartmentBaileysPanel'
import DepartmentWppconnectServerPanel from '../Edit/DepartmentWppconnectServerPanel'
import { useApp } from '../../../../contexts/App'

const sectorInitialValues = {
  name: '',
  users: [] as string[],
  active: true,
  inbox: null as string | null,
}

function SectorForm(props: any) {
  const { onSubmit, errors, initialValues, currentUser, departmentId } = props
  const { t } = useTranslation()
  const { activeLicensee } = useApp()
  let navigate = useNavigate()
  const [userOptions, setUserOptions] = useState<{ value: string; label: string }[]>([])
  const [messengerInboxes, setMessengerInboxes] = useState<IInbox[]>([])

  const sectorSchema = useMemo(
    () =>
      Yup.object().shape({
        name: Yup.string().required(t('departments.validation.nameRequired')),
      }),
    [t]
  )

  useEffect(() => {
    async function fetchUsers() {
      const licenseeId =
        (typeof currentUser?.licensee === 'object' ? currentUser?.licensee?.id : currentUser?.licensee) ??
        activeLicensee?.id
      if (!licenseeId) return
      const { data } = await getUsers({ licensee: licenseeId })
      const users = Array.isArray(data) ? data : []
      setUserOptions(users.map((u: any) => ({ value: u.id, label: u.name })))
    }
    fetchUsers()
  }, [currentUser, activeLicensee])

  useEffect(() => {
    async function fetchMessengerInboxes() {
      const licenseeId =
        (typeof currentUser?.licensee === 'object' ? currentUser?.licensee?.id : currentUser?.licensee) ??
        activeLicensee?.id
      if (!licenseeId) return
      const { data } = await getInboxes({ licensee: licenseeId, kind: 'messenger' })
      setMessengerInboxes(Array.isArray(data) ? data : [])
    }
    fetchMessengerInboxes()
  }, [currentUser, activeLicensee])

  const mergedInitialValues = { ...sectorInitialValues, ...initialValues }

  return (
    <div>
      <Form
        validationSchema={sectorSchema}
        initialValues={mergedInitialValues}
        onSubmit={(values: any) => {
          onSubmit(values)
        }}
      >
        {(formikProps: any) => {
          const selectedUserValues: string[] = formikProps.values.users.map((opt: any) => opt._id) || []
          const selectedOptions = userOptions.filter(opt => selectedUserValues.includes(opt.value))

          return (
            <form onSubmit={formikProps.handleSubmit}>
              <fieldset className='pb-4'>
                <div className='row'>
                  <div className='form-group col-5'>
                    <label htmlFor='name'>{t('common.name')}</label>
                    <FieldWithError
                      id='name'
                      type='text'
                      onChange={formikProps.handleChange}
                      onBlur={formikProps.handleBlur}
                      value={formikProps.values.name}
                      name='name'
                    />
                  </div>
                  <div className='form-group col-5'>
                    <div className='form-check mt-4'>
                      <input
                        checked={formikProps.values.active}
                        onChange={formikProps.handleChange}
                        onBlur={formikProps.handleBlur}
                        type='checkbox'
                        className='form-check-input'
                        id='active'
                        name='active'
                      />
                      <label className='form-check-label' htmlFor='active'>{t('common.active')}</label>
                    </div>
                  </div>
                </div>

                <div className='row'>
                  <div className='form-group col-8'>
                    <label htmlFor='users'>{t('departments.usersLabel')}</label>
                    <Select
                      inputId='users'
                      isMulti
                      options={userOptions}
                      value={selectedOptions}
                      onChange={(selected) => {
                        const ids = selected ? selected.map((opt: any) => opt.value) : []
                        formikProps.setFieldValue('users', ids)
                      }}
                      placeholder={t('departments.usersPlaceholder')}
                    />
                  </div>
                </div>

                <div className='row'>
                  <div className='form-group col-5'>
                    <label htmlFor='inbox'>{t('departments.inbox')}</label>
                    <select
                      id='inbox'
                      className='form-select'
                      value={formikProps.values.inbox ?? ''}
                      onChange={(e) =>
                        formikProps.setFieldValue('inbox', e.target.value || null)
                      }
                    >
                      <option value=''>{t('departments.noInbox')}</option>
                      {messengerInboxes.map(inbox => (
                        <option key={inbox._id} value={inbox._id}>{inbox.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </fieldset>

              {errors && (
                <div className='alert alert-danger'>
                  <ul>
                    {errors.map((error: any) => (<li key={error.message}>{error.message}</li>))}
                  </ul>
                </div>
              )}

              {departmentId && <DepartmentBaileysPanel departmentId={departmentId} isActive={initialValues.active} />}

              {departmentId && (
                <DepartmentWppconnectServerPanel departmentId={departmentId} isActive={initialValues.active} />
              )}

              <div className='row'>
                <div className='col-5'>
                  <div className='mt-4 d-flex justify-content-between'>
                    <button onClick={() => navigate('/departments')} className='btn btn-secondary' type='button'>{t('common.back')}</button>
                    <button className='btn btn-success' type='submit'>{t('common.save')}</button>
                  </div>
                </div>
              </div>
            </form>
          )
        }}
      </Form>
    </div>
  )
}

export default SectorForm

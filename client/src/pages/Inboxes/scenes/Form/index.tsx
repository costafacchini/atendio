import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FieldWithError, Form } from '../../../../components/form'
import * as Yup from 'yup'
import { useNavigate } from 'react-router'
import InboxBaileysPanel from '../Edit/InboxBaileysPanel'
import InboxWppconnectServerPanel from '../Edit/InboxWppconnectServerPanel'

const inboxInitialValues = {
  name: '',
  kind: 'messenger' as const,
  whatsappDefault: '',
  whatsappToken: '',
  whatsappUrl: '',
  chatDefault: '',
  chatUrl: '',
  chatKey: '',
  chatIdentifier: '',
  active: true,
}

const CHAT_PLATFORMS_WITH_URL = ['rocketchat', 'crisp', 'chatwoot', 'cuboup']
const CHAT_PLATFORMS_WITH_KEY = ['crisp', 'chatwoot']

interface InboxFormProps {
  onSubmit: (values: any) => void
  errors?: any[] | null
  initialValues?: Record<string, any>
  inboxId?: string
}

function InboxForm({ onSubmit, errors, initialValues, inboxId }: InboxFormProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const inboxSchema = useMemo(
    () =>
      Yup.object().shape({
        name: Yup.string().required(t('inboxes.validation.nameRequired')),
        kind: Yup.string().required(t('inboxes.validation.kindRequired')),
      }),
    [t]
  )

  const mergedInitialValues = { ...inboxInitialValues, ...initialValues }

  return (
    <div>
      <Form
        validationSchema={inboxSchema}
        initialValues={mergedInitialValues}
        onSubmit={(values: any) => onSubmit(values)}
      >
        {(formikProps: any) => {
          const { values, handleChange, handleBlur } = formikProps
          const isMessenger = values.kind === 'messenger'
          const isChat = values.kind === 'chat'
          const isBaileys = values.whatsappDefault === 'baileys'
          const isWppconnectServer = values.whatsappDefault === 'wppconnect-server'
          const showWhatsappCredentials = isMessenger && values.whatsappDefault !== '' && !isBaileys
          const showChatUrl = isChat && CHAT_PLATFORMS_WITH_URL.includes(values.chatDefault)
          const showChatKey = isChat && CHAT_PLATFORMS_WITH_KEY.includes(values.chatDefault)
          const isBaileysMessenger = inboxId && isMessenger && isBaileys
          const isWppconnectServerMessenger = inboxId && isMessenger && isWppconnectServer

          return (
            <form onSubmit={formikProps.handleSubmit}>
              <fieldset className='pb-4'>
                <div className='row'>
                  <div className='form-group col-5'>
                    <label htmlFor='name'>{t('common.name')}</label>
                    <FieldWithError
                      id='name'
                      type='text'
                      onChange={handleChange}
                      onBlur={handleBlur}
                      value={values.name}
                      name='name'
                    />
                  </div>

                  <div className='form-group col-3'>
                    <label htmlFor='kind'>{t('inboxes.kindLabel')}</label>
                    <select
                      id='kind'
                      name='kind'
                      className='form-select'
                      value={values.kind}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    >
                      <option value='messenger'>{t('inboxes.kind.messenger')}</option>
                      <option value='chat'>{t('inboxes.kind.chat')}</option>
                    </select>
                  </div>

                  <div className='form-group col-4'>
                    <div className='form-check mt-4'>
                      <input
                        checked={values.active}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        type='checkbox'
                        className='form-check-input'
                        id='active'
                        name='active'
                      />
                      <label className='form-check-label' htmlFor='active'>{t('inboxes.active')}</label>
                    </div>
                  </div>
                </div>

                {isMessenger && (
                  <>
                    <div className='row'>
                      <div className='form-group col-5'>
                        <label htmlFor='whatsappDefault'>{t('inboxes.whatsappDefault')}</label>
                        <select
                          id='whatsappDefault'
                          name='whatsappDefault'
                          className='form-select'
                          value={values.whatsappDefault}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        >
                          <option value=''>{t('inboxes.noPlugin')}</option>
                          <option value='utalk'>Utalk</option>
                          <option value='dialog'>Dialog360</option>
                          <option value='ycloud'>YCloud</option>
                          <option value='pabbly'>Pabbly</option>
                          <option value='baileys'>Baileys</option>
                          <option value='wppconnect-server'>Wppconnect Server</option>
                        </select>
                      </div>
                    </div>

                    {showWhatsappCredentials && (
                      <div className='row'>
                        <div className='form-group col-6'>
                          <label htmlFor='whatsappToken'>{t('inboxes.whatsappToken')}</label>
                          <FieldWithError
                            id='whatsappToken'
                            type='text'
                            onChange={handleChange}
                            onBlur={handleBlur}
                            value={values.whatsappToken}
                            name='whatsappToken'
                          />
                        </div>
                        <div className='form-group col-6'>
                          <label htmlFor='whatsappUrl'>{t('inboxes.whatsappUrl')}</label>
                          <FieldWithError
                            id='whatsappUrl'
                            type='text'
                            onChange={handleChange}
                            onBlur={handleBlur}
                            value={values.whatsappUrl}
                            name='whatsappUrl'
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {isChat && (
                  <>
                    <div className='row'>
                      <div className='form-group col-5'>
                        <label htmlFor='chatDefault'>{t('inboxes.chatDefault')}</label>
                        <select
                          id='chatDefault'
                          name='chatDefault'
                          className='form-select'
                          value={values.chatDefault}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        >
                          <option value=''>{t('inboxes.noPlugin')}</option>
                          <option value='rocketchat'>Rocketchat</option>
                          <option value='crisp'>Crisp</option>
                          <option value='cuboup'>CuboUp</option>
                          <option value='chatwoot'>Chatwoot</option>
                          <option value='local'>Local</option>
                        </select>
                      </div>
                    </div>

                    {showChatUrl && (
                      <div className='row'>
                        <div className='form-group col-8'>
                          <label htmlFor='chatUrl'>{t('inboxes.chatUrl')}</label>
                          <FieldWithError
                            id='chatUrl'
                            type='text'
                            onChange={handleChange}
                            onBlur={handleBlur}
                            value={values.chatUrl}
                            name='chatUrl'
                          />
                        </div>
                      </div>
                    )}

                    {showChatKey && (
                      <div className='row'>
                        <div className='form-group col-6'>
                          <label htmlFor='chatIdentifier'>{t('inboxes.chatIdentifier')}</label>
                          <FieldWithError
                            id='chatIdentifier'
                            type='text'
                            onChange={handleChange}
                            onBlur={handleBlur}
                            value={values.chatIdentifier}
                            name='chatIdentifier'
                          />
                        </div>
                        <div className='form-group col-6'>
                          <label htmlFor='chatKey'>{t('inboxes.chatKey')}</label>
                          <FieldWithError
                            id='chatKey'
                            type='text'
                            onChange={handleChange}
                            onBlur={handleBlur}
                            value={values.chatKey}
                            name='chatKey'
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {inboxId && (
                  <div className='row mt-2'>
                    <div className='col-12'>
                      <label className='form-label fw-semibold'>{t('inboxes.inboxToken')}</label>
                      <p className='text-muted font-monospace small'>{mergedInitialValues.inboxToken}</p>
                    </div>
                    {mergedInitialValues.webhookUrl && (
                      <div className='col-12'>
                        <label className='form-label fw-semibold'>{t('inboxes.webhookUrl')}</label>
                        <p className='text-muted font-monospace small'>{mergedInitialValues.webhookUrl}</p>
                      </div>
                    )}
                  </div>
                )}
              </fieldset>

              {errors && (
                <div className='alert alert-danger'>
                  <ul>
                    {errors.map((error: any) => (
                      <li key={error.message}>{error.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {isBaileysMessenger && (
                <InboxBaileysPanel inboxId={inboxId} isActive={values.active} />
              )}

              {isWppconnectServerMessenger && (
                <InboxWppconnectServerPanel inboxId={inboxId} isActive={values.active} />
              )}

              <div className='row'>
                <div className='col-5'>
                  <div className='mt-4 d-flex justify-content-between'>
                    <button onClick={() => navigate('/inboxes')} className='btn btn-secondary' type='button'>
                      {t('common.back')}
                    </button>
                    <button className='btn btn-success' type='submit'>
                      {t('common.save')}
                    </button>
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

export default InboxForm

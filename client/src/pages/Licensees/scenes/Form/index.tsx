import React, { useState } from 'react'
import { Form } from '../../../../components/form'
import * as Yup from 'yup'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import MainPanel from './panels/MainPanel'
import ChatbotPanel from './panels/ChatbotPanel'
import type { ILicensee, ILicenseeFormValues } from '../../../../types'
import type { FormikProps } from 'formik'

const SignupSchema = Yup.object().shape({
  name: Yup.string()
});

/** Form values include apiToken (read-only) and useDepartments (edit form only) */
interface LicenseeEditFormValues extends ILicenseeFormValues {
  apiToken: string
  useDepartments: boolean
  urlChatWebhook?: string
  urlChatbotWebhook?: string
  urlChatbotTransfer?: string
  urlWhatsappWebhook?: string
}

const licenseeInitialValues: LicenseeEditFormValues = {
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
  // Plugin fields kept for type compatibility — UI removed; Phase 3 will drop these from the type.
  whatsappDefault: '',
  whatsappToken: '',
  whatsappUrl: '',
  chatDefault: '',
  chatUrl: '',
  chatKey: '',
  chatIdentifier: '',
  messageOnCloseChat: '',
  document: '',
  kind: '',
  useSenderName: false,
  useFileIDYcloud: false,
  useDepartments: false,
}

interface LicenseeFormProps {
  onSubmit: (values: LicenseeEditFormValues) => void
  errors?: Array<{ message: string }> | null
  initialValues?: Partial<ILicensee>
  currentUser?: unknown
}

function LicenseeForm(props: LicenseeFormProps) {
  const { onSubmit, errors, initialValues, currentUser } = props
  const { t } = useTranslation()
  let navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('principal')

  return (
    <div>
      <Form
        validationSchema={SignupSchema}
        initialValues={{ ...licenseeInitialValues, ...initialValues }}
        onSubmit={(values: LicenseeEditFormValues) => {
          onSubmit(values)
        }}
      >
        {(props: FormikProps<LicenseeEditFormValues>) => (
          <form onSubmit={props.handleSubmit}>
            <p className='text-muted small mb-3'>
              {t('licensees.form.requiredHint').split('*')[0]}
              <span className='text-danger'>*</span>
              {t('licensees.form.requiredHint').split('*')[1]}
            </p>
            <ul className="nav nav-tabs mb-3">
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link ${activeTab === 'principal' ? 'active' : ''}`}
                  onClick={() => setActiveTab('principal')}
                >
                  {t('licensees.form.tabPrincipal')}
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link ${activeTab === 'chatbot' ? 'active' : ''}`}
                  onClick={() => setActiveTab('chatbot')}
                >
                  {t('licensees.form.tabChatBot')}
                </button>
              </li>
            </ul>

            <div className="tab-content">
              <div className={`tab-pane fade ${activeTab === 'principal' ? 'show active' : ''}`}>
                <MainPanel
                  values={props.values}
                  errors={props.errors}
                  touched={props.touched}
                  handleChange={props.handleChange}
                  handleBlur={props.handleBlur}
                  currentUser={currentUser}
                />
              </div>
              <div className={`tab-pane fade ${activeTab === 'chatbot' ? 'show active' : ''}`}>
                <ChatbotPanel
                  values={props.values}
                  errors={props.errors}
                  touched={props.touched}
                  handleChange={props.handleChange}
                  handleBlur={props.handleBlur}
                />
              </div>
            </div>

            {errors && (
              <div className='alert alert-danger'>
                <ul>
                  {errors.map((error) => (
                    <li key={error.message}>{error.message}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className='row'>
              <div className='col-8'>
                <div className='mt-4 d-flex justify-content-between'>
                  <button onClick={() => navigate('/licensees')} className='btn btn-secondary' type='button'>
                    {t('common.cancel')}
                  </button>
                  <button className='btn btn-success' type='submit'>
                    {t('common.save')}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </Form>
    </div>
  )
}

export default LicenseeForm

import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Formik } from 'formik'
import * as Yup from 'yup'
import { useTranslation } from 'react-i18next'
import { FieldWithError } from '../../../../components/form'
import ChatbotPanel from '../Form/panels/ChatbotPanel'
import type { ILicenseeFormValues } from '../../../../types'
import type { FormikErrors, FormikTouched } from 'formik'

const licenseeInitialValues: ILicenseeFormValues = {
  name: '',
  email: '',
  phone: '',
  active: false,
  apiToken: '',
  licenseKind: 'demo',
  useChatbot: false,
  useFileIDYcloud: false,
  chatbotDefault: '',
  chatbotUrl: '',
  chatbotAuthorizationToken: '',
  messageOnResetChatbot: '',
  chatbotApiToken: '',
  messageOnCloseChat: '',
  document: '',
  kind: '',
  useSenderName: false,
  useDepartments: false,
}

interface IdentityStepProps {
  values: ILicenseeFormValues
  errors: FormikErrors<ILicenseeFormValues>
  touched: FormikTouched<ILicenseeFormValues>
  handleChange: React.ChangeEventHandler<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  handleBlur: React.FocusEventHandler<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
}

function Required() {
  return <span className='text-danger ms-1' aria-hidden='true'>*</span>
}

function IdentityStep({ values, errors, touched, handleChange, handleBlur }: IdentityStepProps) {
  const { t } = useTranslation()

  return (
    <>
      <div className='row mb-3'>
        <div className='form-group col-8'>
          <label htmlFor='name'>{t('licensees.wizard.identity.nameLabel')}<Required /></label>
          <FieldWithError id='name' type='text' name='name'
            value={values.name} onChange={handleChange} onBlur={handleBlur} />
        </div>
      </div>
      <div className='row mb-3'>
        <div className='form-group col-2'>
          <label htmlFor='kind'>{t('licensees.wizard.identity.kindLabel')}<Required /></label>
          <select value={values.kind} className='form-select' id='kind'
            onChange={handleChange} onBlur={handleBlur}>
            <option value=''>{t('licensees.wizard.identity.kindSelectPlaceholder')}</option>
            <option value='company'>{t('licensees.wizard.identity.kindCompany')}</option>
            <option value='individual'>{t('licensees.wizard.identity.kindIndividual')}</option>
          </select>
        </div>
        <div className='form-group col-4'>
          <label htmlFor='document'>{t('licensees.wizard.identity.documentLabel')}<Required /></label>
          <FieldWithError id='document' name='document' type='text'
            value={values.document} onChange={handleChange} onBlur={handleBlur} />
        </div>
      </div>
      <div className='row mb-3'>
        <div className='form-group col-8'>
          <label htmlFor='email'>{t('licensees.wizard.identity.emailLabel')}<Required /></label>
          <FieldWithError id='email' name='email' type='text'
            value={values.email} onChange={handleChange} onBlur={handleBlur} />
        </div>
      </div>
      <div className='row mb-3'>
        <div className='form-group col-8'>
          <label htmlFor='licenseKind'>{t('licensees.wizard.identity.licenseKindLabel')}<Required /></label>
          <select value={values.licenseKind} className='form-select' id='licenseKind'
            onChange={handleChange} onBlur={handleBlur}>
            <option value='demo'>{t('licensees.wizard.identity.licenseKindDemo')}</option>
            <option value='free'>{t('licensees.wizard.identity.licenseKindFree')}</option>
            <option value='paid'>{t('licensees.wizard.identity.licenseKindPaid')}</option>
          </select>
        </div>
      </div>
      <div className='row mb-3'>
        <div className='form-group col-8'>
          <label htmlFor='phone'>{t('licensees.wizard.identity.phoneLabel')}<Required /></label>
          <FieldWithError id='phone' name='phone' type='text'
            value={values.phone} onChange={handleChange} onBlur={handleBlur} />
        </div>
      </div>
    </>
  )
}

interface YesNoGateProps {
  label: string
  isYes: boolean | null
  onChange: (value: boolean) => void
}

function YesNoGate({ label, isYes, onChange }: YesNoGateProps) {
  const { t } = useTranslation()

  return (
    <div className='mb-3'>
      <p className='fw-semibold'>{label}</p>
      <div className='btn-group' role='group'>
        <button
          type='button'
          className={`btn ${isYes === true ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => onChange(true)}
        >
          {t('common.yes')}
        </button>
        <button
          type='button'
          className={`btn ${isYes === false ? 'btn-secondary' : 'btn-outline-secondary'}`}
          onClick={() => onChange(false)}
        >
          {t('common.no')}
        </button>
      </div>
    </div>
  )
}

interface ApiError {
  message: string
}

interface LicenseeWizardProps {
  onSubmit: (values: ILicenseeFormValues) => void
  errors?: ApiError[] | null
}

function LicenseeWizard({ onSubmit, errors: backendErrors }: LicenseeWizardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [stepErrors, setStepErrors] = useState<string[] | null>(null)

  const STEPS = useMemo(() => [
    { id: 'identity', title: t('licensees.wizard.stepIdentity') },
    { id: 'chatbot',  title: t('licensees.wizard.stepChatBot') },
  ], [t])

  const identitySchema = useMemo(() => Yup.object().shape({
    name:        Yup.string().required(t('licensees.wizard.identity.nameRequired')),
    kind:        Yup.string().required(t('licensees.wizard.identity.kindRequired')),
    document:    Yup.string().required(t('licensees.wizard.identity.documentRequired')),
    email:       Yup.string().email(t('licensees.wizard.identity.emailInvalid')).required(t('licensees.wizard.identity.emailRequired')),
    licenseKind: Yup.string().required(t('licensees.wizard.identity.licenseKindRequired')),
    phone:       Yup.string().required(t('licensees.wizard.identity.phoneRequired')),
  }), [t])

  const chatbotSchema = useMemo(() => Yup.object().shape({
    chatbotDefault:            Yup.string().required(t('licensees.wizard.chatbot.chatbotDefaultRequired')),
    chatbotUrl:                Yup.string().required(t('licensees.wizard.chatbot.chatbotUrlRequired')),
    chatbotAuthorizationToken: Yup.string().required(t('licensees.wizard.chatbot.chatbotTokenRequired')),
    chatbotApiToken:           Yup.string().required(t('licensees.wizard.chatbot.chatbotApiTokenRequired')),
    messageOnResetChatbot:     Yup.string().required(t('licensees.wizard.chatbot.messageOnResetRequired')),
    messageOnCloseChat:        Yup.string().required(t('licensees.wizard.chatbot.messageOnCloseRequired')),
  }), [t])

  const totalSteps = STEPS.length
  const step = STEPS[currentStep]
  const isLastStep = currentStep === totalSteps - 1
  const progressPct = Math.round(((currentStep + 1) / totalSteps) * 100)

  async function validateStep(values: ILicenseeFormValues) {
    const schemas: Record<string, Yup.ObjectSchema<object> | null> = {
      identity: identitySchema,
      chatbot:  values.useChatbot ? chatbotSchema : null,
    }
    const schema = schemas[step.id]
    if (!schema) return true
    try {
      await schema.validate(values, { abortEarly: false })
      return true
    } catch (err: unknown) {
      if (err instanceof Yup.ValidationError) {
        setStepErrors(err.errors)
      }
      return false
    }
  }

  return (
    <Formik initialValues={licenseeInitialValues} validationSchema={Yup.object()} onSubmit={(values) => {
        if (currentStep !== totalSteps - 1) return
        const cleaned = { ...values }
        if (!cleaned.useChatbot) {
          cleaned.chatbotDefault = ''
          cleaned.chatbotUrl = ''
          cleaned.chatbotAuthorizationToken = ''
          cleaned.chatbotApiToken = ''
          cleaned.messageOnResetChatbot = ''
          cleaned.messageOnCloseChat = ''
        }
        onSubmit(cleaned)
      }}>
      {(formik) => (
        <form>
          <h3>{t('licensees.wizard.title')}</h3>
          <p className='text-muted mb-1'>
            {t('licensees.wizard.stepIndicator', { current: currentStep + 1, total: totalSteps, title: step.title })}
          </p>
          <p className='text-muted small mb-3'>
            {t('licensees.wizard.requiredHint').split('*')[0]}
            <span className='text-danger'>*</span>
            {t('licensees.wizard.requiredHint').split('*')[1]}
          </p>

          <div className='progress mb-4' style={{ height: '6px' }}>
            <div
              className='progress-bar'
              role='progressbar'
              style={{ width: `${progressPct}%` }}
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>

          <div className='mb-4'>
            {step.id === 'identity' && (
              <IdentityStep
                values={formik.values}
                errors={formik.errors}
                touched={formik.touched}
                handleChange={formik.handleChange}
                handleBlur={formik.handleBlur}
              />
            )}
            {step.id === 'chatbot' && (
              <>
                <YesNoGate
                  label={t('licensees.wizard.chatbotGateLabel')}
                  isYes={typeof formik.values.useChatbot === 'boolean' ? formik.values.useChatbot : null}
                  onChange={(val: boolean) => formik.setFieldValue('useChatbot', val)}
                />
                {formik.values.useChatbot && (
                  <ChatbotPanel
                    values={formik.values}
                    errors={formik.errors}
                    touched={formik.touched}
                    handleChange={formik.handleChange}
                    handleBlur={formik.handleBlur}
                  />
                )}
              </>
            )}
          </div>

          {(backendErrors || stepErrors) && (
            <div className='alert alert-danger'>
              <ul className='mb-0'>
                {backendErrors?.map((e) => <li key={e.message}>{e.message}</li>)}
                {stepErrors?.map((e) => <li key={e}>{e}</li>)}
              </ul>
            </div>
          )}

          <div className='d-flex justify-content-between mt-4'>
            <button type='button' className='btn btn-secondary' onClick={() => navigate('/licensees')}>
              {t('common.cancel')}
            </button>
            <div className='d-flex gap-2'>
              {currentStep > 0 && (
                <button
                  type='button'
                  className='btn btn-outline-secondary'
                  onClick={() => { setStepErrors(null); setCurrentStep(s => s - 1) }}
                >
                  {t('licensees.wizard.backButton')}
                </button>
              )}
              {!isLastStep ? (
                <button
                  type='button'
                  className='btn btn-primary'
                  onClick={async () => {
                    const valid = await validateStep(formik.values)
                    if (valid) { setStepErrors(null); setCurrentStep(s => s + 1) }
                  }}
                >
                  {t('licensees.wizard.nextButton')}
                </button>
              ) : (
                <button type='button' className='btn btn-success' onClick={() => formik.submitForm()}>
                  {t('common.save')}
                </button>
              )}
            </div>
          </div>
        </form>
      )}
    </Formik>
  )
}

export default LicenseeWizard

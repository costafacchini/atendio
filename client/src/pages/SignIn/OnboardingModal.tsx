import React, { useState, useRef, useMemo } from 'react'
import { Formik, FormikProps } from 'formik'
import * as Yup from 'yup'
import { useTranslation } from 'react-i18next'
import { createAccount, OnboardingFields } from '../../services/onboarding'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'

type StepId = 'identity' | 'user'

const stepFields: Partial<Record<StepId, string[]>> = {
  identity: ['licenseeName', 'kind', 'document', 'licenseeEmail', 'phone'],
  user:     ['userName', 'userEmail', 'password', 'confirmPassword'],
}

const initialValues = {
  licenseeName:    '',
  kind:            '',
  document:        '',
  licenseeEmail:   '',
  phone:           '',
  userName:        '',
  userEmail:       '',
  password:        '',
  confirmPassword: '',
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

function OnboardingModal({ isOpen, onClose, onSuccess }: Props) {
  const { t, i18n } = useTranslation()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [stepErrors, setStepErrors]             = useState<string[] | null>(null)
  const [submitError, setSubmitError]           = useState('')
  const formikRef                               = useRef<FormikProps<typeof initialValues> | null>(null)

  const steps: StepId[] = ['identity', 'user']

  // Dynamic schemas — re-created when t() changes (i.e. on language switch)
  const identitySchema = useMemo(
    () =>
      Yup.object().shape({
        licenseeName:  Yup.string().required(t('onboarding.identity.companyNameRequired')),
        kind:          Yup.string().required(t('onboarding.identity.kindRequired')),
        document:      Yup.string().required(t('onboarding.identity.documentRequired')),
        licenseeEmail: Yup.string().email(t('onboarding.identity.emailInvalid')).required(t('onboarding.identity.licenseeEmailRequired')),
        phone:         Yup.string().required(t('onboarding.identity.phoneRequired')),
      }),
    [t],
  )

  const userSchema = useMemo(
    () =>
      Yup.object().shape({
        userName:        Yup.string().min(4, t('onboarding.user.userNameMin')).required(t('onboarding.user.userNameRequired')),
        userEmail:       Yup.string().email(t('onboarding.user.userEmailInvalid')).required(t('onboarding.user.userEmailRequired')),
        password:        Yup.string().min(8, t('onboarding.user.passwordMin')).required(t('onboarding.user.passwordRequired')),
        confirmPassword: Yup.string()
          .oneOf([Yup.ref('password')], t('onboarding.user.passwordsMismatch'))
          .required(t('onboarding.user.confirmPasswordRequired')),
      }),
    [t],
  )

  const schemaMap = useMemo<Partial<Record<StepId, Yup.ObjectSchema<any>>>>(
    () => ({
      identity: identitySchema,
      user:     userSchema,
    }),
    [identitySchema, userSchema],
  )

  if (!isOpen) return null

  const stepId  = steps[currentStepIndex]
  const isLast  = currentStepIndex === steps.length - 1

  const stepTitles: Record<StepId, string> = {
    identity: t('onboarding.steps.identity'),
    user:     t('onboarding.steps.user'),
  }

  async function validateCurrentStep(values: typeof initialValues): Promise<boolean> {
    const schema = schemaMap[stepId]
    if (!schema) return true
    try {
      await schema.validate(values, { abortEarly: false })
      setStepErrors(null)
      return true
    } catch (err: any) {
      setStepErrors(err.errors)
      return false
    }
  }

  async function handleNext(formik: FormikProps<typeof initialValues>) {
    const valid = await validateCurrentStep(formik.values)
    if (!valid) {
      const fields = stepFields[stepId]
      if (fields) {
        formik.setTouched(Object.fromEntries(fields.map((f) => [f, true])))
      }
      return
    }
    setStepErrors(null)
    setCurrentStepIndex((i) => i + 1)
  }

  function handleBack() {
    setStepErrors(null)
    setCurrentStepIndex((i) => i - 1)
  }

  async function handleSubmit(
    values: typeof initialValues,
    { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void },
  ) {
    const valid = await validateCurrentStep(values)
    if (!valid) {
      setSubmitting(false)
      const fields = stepFields[stepId]
      if (fields && formikRef.current) {
        formikRef.current.setTouched(Object.fromEntries(fields.map((f) => [f, true])))
      }
      return
    }

    const payload: OnboardingFields = {
      licenseeName:  values.licenseeName,
      kind:          values.kind,
      document:      values.document,
      licenseeEmail: values.licenseeEmail,
      phone:         values.phone,
      userName:      values.userName,
      userEmail:     values.userEmail,
      password:      values.password,
      language:      i18n.language as 'pt' | 'en',
    }

    const response = await createAccount(payload)
    setSubmitting(false)

    if (response.status === 201) {
      onSuccess()
    } else {
      const responseData = response.data as { errors?: Record<string, { message?: string } | string>; message?: string } | undefined
      const errors = responseData?.errors
      if (errors && typeof errors === 'object') {
        const messages = Object.values(errors).map((e) =>
          typeof e === 'object' && e !== null ? e.message || String(e) : String(e),
        )
        setSubmitError(messages.join(', '))
      } else {
        setSubmitError(responseData?.message || t('onboarding.errors.createAccountFailed', { status: response.status }))
      }
    }
  }

  function renderStepContent(formik: FormikProps<typeof initialValues>) {
    if (stepId === 'identity') {
      return (
        <>
          <div className='mb-3'>
            <label htmlFor='licenseeName' className='form-label'>{t('onboarding.identity.companyNameLabel')}</label>
            <input
              id='licenseeName'
              name='licenseeName'
              type='text'
              className='form-control'
              value={formik.values.licenseeName}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {formik.touched.licenseeName && formik.errors.licenseeName && (
              <div className='text-danger small'>{formik.errors.licenseeName as string}</div>
            )}
          </div>

          <div className='row mb-3'>
            <div className='col-3'>
              <label htmlFor='kind' className='form-label'>{t('onboarding.identity.kindLabel')}</label>
              <select
                id='kind'
                name='kind'
                className='form-select'
                value={formik.values.kind}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              >
                <option value='' disabled>{t('onboarding.identity.kindSelectPlaceholder')}</option>
                <option value='company'>{t('onboarding.identity.kindCompany')}</option>
                <option value='individual'>{t('onboarding.identity.kindIndividual')}</option>
              </select>
              {formik.touched.kind && formik.errors.kind && (
                <div className='text-danger small'>{formik.errors.kind as string}</div>
              )}
            </div>

            <div className='col-5'>
              <label htmlFor='document' className='form-label'>{t('onboarding.identity.documentLabel')}</label>
              <input
                id='document'
                name='document'
                type='text'
                className='form-control'
                placeholder={t('onboarding.identity.documentPlaceholder')}
                value={formik.values.document}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              {formik.touched.document && formik.errors.document && (
                <div className='text-danger small'>{formik.errors.document as string}</div>
              )}
            </div>

            <div className='col-4'>
              <label htmlFor='phone' className='form-label'>{t('onboarding.identity.phoneLabel')}</label>
              <input
                id='phone'
                name='phone'
                type='text'
                className='form-control'
                placeholder={t('onboarding.identity.phonePlaceholder')}
                value={formik.values.phone}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              {formik.touched.phone && formik.errors.phone && (
                <div className='text-danger small'>{formik.errors.phone as string}</div>
              )}
            </div>
          </div>

          <div className='mb-3'>
            <label htmlFor='licenseeEmail' className='form-label'>{t('onboarding.identity.licenseeEmailLabel')}</label>
            <input
              id='licenseeEmail'
              name='licenseeEmail'
              type='email'
              className='form-control'
              value={formik.values.licenseeEmail}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {formik.touched.licenseeEmail && formik.errors.licenseeEmail && (
              <div className='text-danger small'>{formik.errors.licenseeEmail as string}</div>
            )}
          </div>
        </>
      )
    }

    if (stepId === 'user') {
      return (
        <>
          <div className='mb-3'>
            <label htmlFor='userName' className='form-label'>{t('onboarding.user.userNameLabel')}</label>
            <input
              id='userName'
              name='userName'
              type='text'
              className='form-control'
              value={formik.values.userName}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {formik.touched.userName && formik.errors.userName && (
              <div className='text-danger small'>{formik.errors.userName as string}</div>
            )}
          </div>

          <div className='mb-3'>
            <label htmlFor='userEmail' className='form-label'>{t('onboarding.user.userEmailLabel')}</label>
            <input
              id='userEmail'
              name='userEmail'
              type='email'
              className='form-control'
              value={formik.values.userEmail}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {formik.touched.userEmail && formik.errors.userEmail && (
              <div className='text-danger small'>{formik.errors.userEmail as string}</div>
            )}
          </div>

          <div className='mb-3'>
            <label htmlFor='password' className='form-label'>{t('onboarding.user.passwordLabel')}</label>
            <input
              id='password'
              name='password'
              type='password'
              className='form-control'
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {formik.touched.password && formik.errors.password && (
              <div className='text-danger small'>{formik.errors.password as string}</div>
            )}
          </div>

          <div className='mb-3'>
            <label htmlFor='confirmPassword' className='form-label'>{t('onboarding.user.confirmPasswordLabel')}</label>
            <input
              id='confirmPassword'
              name='confirmPassword'
              type='password'
              className='form-control'
              value={formik.values.confirmPassword}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {formik.touched.confirmPassword && formik.errors.confirmPassword && (
              <div className='text-danger small'>{formik.errors.confirmPassword as string}</div>
            )}
          </div>
        </>
      )
    }

    return null
  }

  return (
    <div
      className='modal d-block'
      tabIndex={-1}
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
    >
      <div className='modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg'>
        <div className='modal-content'>
          <Formik
            initialValues={initialValues}
            validationSchema={Yup.object()}
            onSubmit={handleSubmit}
          >
            {(formik) => {
              formikRef.current = formik
              return (
                <form
                  className='d-flex flex-column overflow-hidden flex-fill'
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (isLast) {
                      formik.submitForm()
                    } else {
                      handleNext(formik)
                    }
                  }}
                >
                  <div className='modal-header flex-column align-items-start pb-2'>
                    <div className='d-flex justify-content-between align-items-start w-100 mb-3'>
                      <div>
                        <h5 className='modal-title mb-0'>{t('onboarding.modalTitle')}</h5>
                        <p className='text-muted mb-0 small'>{stepTitles[stepId]}</p>
                      </div>
                      <div className='d-flex align-items-center gap-2'>
                        <LanguageSwitcher />
                        <button type='button' className='btn-close' onClick={onClose} />
                      </div>
                    </div>

                    <div className='d-flex align-items-center gap-1'>
                      {steps.map((id, i) => (
                        <React.Fragment key={id}>
                          <div
                            className='rounded-circle d-flex align-items-center justify-content-center'
                            style={{
                              width: 24,
                              height: 24,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              flexShrink: 0,
                              backgroundColor:
                                i < currentStepIndex ? '#18bc9c'
                                : i === currentStepIndex ? '#fa5619'
                                : '#dee2e6',
                              color: i <= currentStepIndex ? '#ffffff' : '#6c757d',
                              transition: 'background-color 200ms ease',
                            }}
                          >
                            {i < currentStepIndex ? '✓' : i + 1}
                          </div>
                          {i < steps.length - 1 && (
                            <div
                              style={{
                                width: 20,
                                height: 2,
                                flexShrink: 0,
                                backgroundColor: i < currentStepIndex ? '#18bc9c' : '#dee2e6',
                                transition: 'background-color 200ms ease',
                              }}
                            />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <div className='modal-body'>
                    {renderStepContent(formik)}
                  </div>

                  <div className='modal-footer flex-column align-items-stretch'>
                    {(stepErrors || submitError) && (
                      <div className='alert alert-danger mb-2'>
                        {stepErrors?.map((e) => <div key={e}>{e}</div>)}
                        {submitError && <div>{submitError}</div>}
                      </div>
                    )}

                    <div className='d-flex justify-content-between'>
                      {currentStepIndex === 0
                        ? <button type='button' className='btn btn-secondary' onClick={onClose}>{t('onboarding.buttons.cancel')}</button>
                        : <button type='button' className='btn btn-outline-secondary' onClick={handleBack}>{t('onboarding.buttons.back')}</button>
                      }
                      {isLast
                        ? (
                          <button
                            type='submit'
                            className='btn btn-success'
                            disabled={formik.isSubmitting}
                          >
                            {formik.isSubmitting
                              ? (
                                <>
                                  <span className='spinner-border spinner-border-sm me-2' role='status' aria-hidden='true' />
                                  {t('onboarding.buttons.submitting')}
                                </>
                              )
                              : t('onboarding.buttons.submit')
                            }
                          </button>
                        )
                        : (
                          <button type='submit' className='btn btn-primary'>
                            {t('onboarding.buttons.next')}
                          </button>
                        )
                      }
                    </div>
                  </div>
                </form>
              )
            }}
          </Formik>
        </div>
      </div>
    </div>
  )
}

export default OnboardingModal

import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { login, fetchLoggedUser } from '../../services/auth'
import styles from './index.module.scss'
import { useApp } from '../../contexts/App'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'
import OnboardingModal from './OnboardingModal'

interface ILoginResponse {
  token: string
  message?: string
}

function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  let navigate = useNavigate()
  const { setCurrentUser } = useApp()
  const { t, i18n } = useTranslation()

  function handleOnboardingSuccess() {
    setIsOnboardingOpen(false)
    setSuccessMessage(t('login.accountCreated'))
  }

  async function handleSignIn(e: React.FormEvent | React.MouseEvent) {
    e.preventDefault()

    if (!email || !password) {
      setError(t('login.emptyFieldsError'))
    } else {
      const body = { email, password }
      const response = await api().post<ILoginResponse>('/login', { body })
      if (response.status === 200) {
        login(email, response.data.token)

        fetchLoggedUser().then(user => {
          setCurrentUser(user ?? undefined)
          if (user?.language) i18n.changeLanguage(user.language)
        })

        navigate('/#/')
      } else {
        console.log(response)
        setError(response.data.message ?? t('login.loginError'))
      }
    }
  }

  return (
    <>
      <div style={{ background: "linear-gradient(135deg, #2c3e50, #3498db)" }} className='h-100'>
        <div className='h-100 container'>
          <div className='row h-100 justify-content-center pb-5'>
            <div className={`col h-100 col-12 col-md-8 col-lg-6 col-xl-4 ${styles.login}`}>
              <div className='h-100 px-4 d-flex justify-content-center flex-column'>
                <h3 className='text-center mb-4'>atend.io</h3>

                <LanguageSwitcher className="mb-3" />

                <div className="">
                  <label htmlFor="email" className="form-label">{t('login.emailLabel')}</label>
                  <div className="input-group mb-3">
                    <div className="input-group-prepend">
                      <span style={{ fontSize: '1.1rem' }} className="input-group-text"><i className="bi bi-person-fill" /></span>
                    </div>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      placeholder={t('login.emailPlaceholder')}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-2">
                  <label htmlFor="password" className="form-label">{t('login.passwordLabel')}</label>
                  <div className="input-group mb-3">
                    <div className="input-group-prepend">
                      <span style={{ fontSize: '1.1rem' }} className="input-group-text"><i className="bi bi-key-fill"></i></span>
                    </div>
                    <input
                      type='password'
                      className="form-control"
                      id="password"
                      onChange={e => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="text-danger mt-3">
                  {error && <p>{error}</p>}
                </div>

                {successMessage && (
                  <div className="alert alert-success mt-3">{successMessage}</div>
                )}

                <button
                  className='btn btn-primary mt-4 w-100'
                  onClick={handleSignIn}>
                  {t('login.submitButton')}
                </button>

                <div className="text-center mt-3 d-flex justify-content-center align-items-center">
                  <span>{t('login.noAccount')}</span>
                  <button
                    type="button"
                    className="btn btn-link p-0 ms-2"
                    onClick={() => setIsOnboardingOpen(true)}
                  >
                    {t('login.createAccount')}
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onSuccess={handleOnboardingSuccess}
      />
    </>
  )
}

export default SignIn

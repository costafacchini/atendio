import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getDepartmentWppconnectServerStatus, getDepartmentWppconnectServerQr } from '../../../../services/department'

interface Props {
  departmentId: string
  isActive: boolean
}

interface WppconnectServerStatusResponse {
  connected?: boolean
}

interface WppconnectServerQrResponse {
  qr?: string
  connected?: boolean
  message?: string
}

function DepartmentWppconnectServerPanel({ departmentId, isActive }: Props) {
  const { t } = useTranslation()
  const [qr, setQr] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!isActive || !departmentId) return

    setChecking(true)
    getDepartmentWppconnectServerStatus({ id: departmentId })
      .then((response) => {
        setConnected((response.data as WppconnectServerStatusResponse)?.connected ?? false)
      })
      .catch(() => {
        setConnected(false)
      })
      .finally(() => {
        setChecking(false)
      })
  }, [isActive, departmentId])

  async function handleReconnect(event: React.MouseEvent) {
    event.preventDefault()
    setConnected(null)
    setQr(null)
    setStatusMessage(null)
    const response = await getDepartmentWppconnectServerQr({ id: departmentId })
    const qrData = response.data as WppconnectServerQrResponse
    if (qrData?.qr) {
      setQr(qrData.qr)
      setConnected(false)
    } else {
      setStatusMessage(qrData?.message ?? t('departments.wppconnectServer.qrError'))
    }
  }

  return (
    <div className='mt-4'>
      <h5>{t('departments.wppconnectServer.title')}</h5>

      {checking && <span className='text-muted'>{t('departments.wppconnectServer.checking')}</span>}

      {!checking && connected && (
        <div className='d-flex align-items-center gap-3'>
          <span className='text-success fw-semibold'>&#10003; {t('departments.wppconnectServer.connected')}</span>
          <button onClick={handleReconnect} className='btn btn-outline-secondary btn-sm'>
            {t('departments.wppconnectServer.reconnect')}
          </button>
        </div>
      )}

      {!checking && connected === false && (
        <div>
          <button onClick={handleReconnect} className='btn btn-info'>
            {t('departments.wppconnectServer.generateQr')}
          </button>
        </div>
      )}

      {qr && (
        <div className='mt-2'>
          {/* wppconnect-server returns the QR as a ready-to-render base64 data URL, unlike
              Baileys' raw QR string — render it directly instead of via a QR-code renderer. */}
          <img src={qr} alt={t('departments.wppconnectServer.title')} width={200} height={200} />
        </div>
      )}

      {statusMessage && (
        <div>
          <p>{statusMessage}</p>
        </div>
      )}
    </div>
  )
}

export default DepartmentWppconnectServerPanel

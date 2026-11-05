import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getInboxWppconnectServerStatus, getInboxWppconnectServerQr } from '../../../../services/inbox'

interface Props {
  inboxId: string
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

function InboxWppconnectServerPanel({ inboxId, isActive }: Props) {
  const { t } = useTranslation()
  const [qr, setQr] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!isActive || !inboxId) return

    setChecking(true)
    getInboxWppconnectServerStatus(inboxId)
      .then((response) => {
        setConnected((response.data as WppconnectServerStatusResponse)?.connected ?? false)
      })
      .catch(() => {
        setConnected(false)
      })
      .finally(() => {
        setChecking(false)
      })
  }, [isActive, inboxId])

  async function handleReconnect(event: React.MouseEvent) {
    event.preventDefault()
    setConnected(null)
    setQr(null)
    setStatusMessage(null)
    const response = await getInboxWppconnectServerQr(inboxId)
    const qrData = response.data as WppconnectServerQrResponse
    if (qrData?.qr) {
      setQr(qrData.qr)
      setConnected(false)
    } else {
      setStatusMessage(qrData?.message ?? t('inboxes.wppconnectServer.qrError'))
    }
  }

  return (
    <div className='mt-4'>
      <h5>{t('inboxes.wppconnectServer.title')}</h5>

      {checking && <span className='text-muted'>{t('inboxes.wppconnectServer.checking')}</span>}

      {!checking && connected && (
        <div className='d-flex align-items-center gap-3'>
          <span className='text-success fw-semibold'>&#10003; {t('inboxes.wppconnectServer.connected')}</span>
          <button onClick={handleReconnect} className='btn btn-outline-secondary btn-sm'>
            {t('inboxes.wppconnectServer.reconnect')}
          </button>
        </div>
      )}

      {!checking && connected === false && (
        <div>
          <button onClick={handleReconnect} className='btn btn-info'>
            {t('inboxes.wppconnectServer.generateQr')}
          </button>
        </div>
      )}

      {qr && (
        <div className='mt-2'>
          {/* wppconnect-server returns the QR as a ready-to-render base64 data URL (data:image/png;base64,...),
              unlike Baileys' raw QR string — render it directly instead of via a QR-code renderer. */}
          <img src={qr} alt={t('inboxes.wppconnectServer.title')} width={200} height={200} />
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

export default InboxWppconnectServerPanel

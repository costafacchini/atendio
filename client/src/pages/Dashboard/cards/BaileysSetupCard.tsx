import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import { getInboxBaileysQr, getInboxBaileysStatus } from '../../../services/inbox'
import type { IInbox } from '../../../types/inbox'
import type { IBaileysStatusResponse, IBaileysQrResponse } from '../../../types'

interface Props {
  inbox: IInbox
  onConnected: () => void
}

export default function BaileysSetupCard({ inbox, onConnected }: Props) {
  const { t } = useTranslation()
  const [qr, setQr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  async function checkStatus(): Promise<boolean> {
    const res = await getInboxBaileysStatus(inbox.id)
    const statusData = res.data as IBaileysStatusResponse
    if (statusData?.connected) {
      stopPolling()
      onConnected()
      return true
    }
    return false
  }

  async function generateQr() {
    setLoading(true)
    setQr(null)
    setStatusMessage('')
    const res = await getInboxBaileysQr(inbox.id)
    setLoading(false)
    const qrData = res.data as IBaileysQrResponse
    if (qrData?.qr) {
      setQr(qrData.qr)
    } else {
      setStatusMessage(qrData?.message || t('dashboard.baileys.qrError'))
    }
  }

  useEffect(() => {
    async function init() {
      const isConnected = await checkStatus()
      if (!isConnected) {
        await generateQr()
        pollingRef.current = setInterval(checkStatus, 5000)
      }
      setLoading(false)
    }

    init()

    return () => stopPolling()
  }, [inbox.id])

  return (
    <div className='card border-warning'>
      <div className='card-header bg-warning text-dark fw-semibold'>
        {t('dashboard.baileys.cardTitle')}
      </div>
      <div className='card-body text-center'>
        {loading && <p className='text-muted'>{t('dashboard.baileys.generatingQr')}</p>}

        {!loading && qr && (
          <>
            <p
              className='text-muted small mb-3'
              dangerouslySetInnerHTML={{ __html: t('dashboard.baileys.scanInstruction') }}
            />
            <QRCodeSVG value={qr} size={200} />
            <p className='text-muted small mt-3'>{t('dashboard.baileys.waitingConnection')}</p>
          </>
        )}

        {!loading && !qr && statusMessage && (
          <p className='text-danger'>{statusMessage}</p>
        )}

        {!loading && (
          <button className='btn btn-outline-warning btn-sm mt-3' onClick={generateQr}>
            {t('dashboard.baileys.generateNewQr')}
          </button>
        )}
      </div>
    </div>
  )
}

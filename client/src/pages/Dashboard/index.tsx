import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../../contexts/App'
import { getInboxes } from '../../services/inbox'
import type { IInbox } from '../../types/inbox'
import SuperLicenseesCard from './cards/SuperLicenseesCard'
import SuperMessageVolumeCard from './cards/SuperMessageVolumeCard'
import SuperDeliveryRateCard from './cards/SuperDeliveryRateCard'
import SuperQueueCard from './cards/SuperQueueCard'
import SuperConversationsCard from './cards/SuperConversationsCard'
import SuperOpenRoomsCard from './cards/SuperOpenRoomsCard'
import LicenseeContactsCard from './cards/LicenseeContactsCard'
import LicenseeMessagesTodayCard from './cards/LicenseeMessagesTodayCard'
import LicenseeMessagesPerDayCard from './cards/LicenseeMessagesPerDayCard'
import BaileysSetupCard from './cards/BaileysSetupCard'

export default function Dashboard() {
  const { t } = useTranslation()
  const { currentUser, activeLicensee } = useApp()

  const licenseeObj = currentUser?.licensee as { id?: string } | string | null | undefined
  const [connectedLicensees, setConnectedLicensees] = useState<Set<string>>(new Set())
  const [inboxes, setInboxes] = useState<IInbox[]>([])

  const licenseeId = activeLicensee?.id
  const licenseeObjId = typeof licenseeObj === 'object' && licenseeObj !== null ? licenseeObj.id : undefined
  const targetLicenseeId = licenseeId ?? licenseeObjId

  useEffect(() => {
    if (!targetLicenseeId) { setInboxes([]); return }
    getInboxes({ licensee: targetLicenseeId }).then(res => setInboxes((res.data as IInbox[]) ?? []))
  }, [targetLicenseeId])

  const baileysInbox = inboxes.find(i => i.whatsappDefault === 'baileys') ?? null

  if (!currentUser) {
    return (
      <div className="d-flex justify-content-center py-5 text-muted">
        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
        {t('common.loading')}
      </div>
    )
  }

  function renderCards() {
    if (currentUser!.role === 'super' && !activeLicensee) {
      return (
        <div className="row g-3">
          <div className="col-12 col-md-8"><SuperMessageVolumeCard /></div>
          <div className="col-12 col-md-4 d-flex flex-column gap-3">
            <SuperDeliveryRateCard />
            <SuperQueueCard />
            <SuperConversationsCard />
          </div>
          <div className="col-12"><SuperLicenseesCard /></div>
          <div className="col-12"><SuperOpenRoomsCard /></div>
        </div>
      )
    }

    if (currentUser!.role === 'super' || currentUser!.role === 'admin') {
      const usesLocalChat = inboxes.some(i => i.kind === 'chat' && i.chatDefault === 'local')
      const showBaileysCard = !!baileysInbox && targetLicenseeId != null && !connectedLicensees.has(targetLicenseeId)
      return (
        <div className="row g-3">
          {showBaileysCard && baileysInbox && (
            <div className="col-12">
              <BaileysSetupCard
                inbox={baileysInbox}
                onConnected={() => setConnectedLicensees((prev) => new Set(prev).add(targetLicenseeId!))}
              />
            </div>
          )}
          <div className="col-12 col-md-8"><SuperMessageVolumeCard licensee={licenseeId} /></div>
          <div className="col-12 col-md-4 d-flex flex-column gap-3">
            <SuperDeliveryRateCard licensee={licenseeId} />
            <SuperQueueCard licensee={licenseeId} />
            <SuperConversationsCard licensee={licenseeId} />
          </div>
          {usesLocalChat && <div className="col-12"><SuperOpenRoomsCard licensee={licenseeId} /></div>}
        </div>
      )
    }

    return (
      <div className="row g-3">
        <div className="col-12 col-md-4"><LicenseeContactsCard /></div>
        <div className="col-12 col-md-4"><LicenseeMessagesTodayCard /></div>
        <div className="col-12 col-md-4"><LicenseeMessagesPerDayCard /></div>
      </div>
    )
  }

  return (
    <>
      <h3 className="mb-3">{t('dashboard.title')}</h3>
      {renderCards()}
    </>
  )
}

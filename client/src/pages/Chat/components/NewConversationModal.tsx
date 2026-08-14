import React, { useState } from 'react'
import type { SingleValue } from 'react-select'
import { createRoom } from '../../../services/rooms'
import type { IRoom } from '../../../types'
import { useApp } from '../../../contexts/App'
import SelectContactsWithFilter from '../../../components/SelectContactsWithFilter'
import { useTranslation } from 'react-i18next'

interface IContactOption {
  value: string
  label: string
  [key: string]: unknown
}

interface NewConversationModalProps {
  show: boolean
  onClose: () => void
  onRoomCreated: (room: IRoom) => void
  inboxId?: string
}

export default function NewConversationModal({ show, onClose, onRoomCreated, inboxId }: NewConversationModalProps) {
  const { t } = useTranslation()
  const { currentUser, activeLicensee } = useApp()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const effectiveLicenseeId = activeLicensee?.id ??
    (typeof currentUser?.licensee === 'object' && currentUser.licensee !== null
      ? (currentUser.licensee as { id?: string })?.id
      : currentUser?.licensee != null ? String(currentUser.licensee) : undefined)

  async function handleContactChange(option: SingleValue<IContactOption>) {
    if (!option) return
    setError(null)
    setLoading(true)
    try {
      const res = await createRoom(option.value, inboxId)
      onRoomCreated(res.data.room)
      onClose()
    } catch (_) {
      setError(t('chat.createRoomError'))
    } finally {
      setLoading(false)
    }
  }

  if (!show) return null

  return (
    <div
      className='modal fade show d-block'
      tabIndex={-1}
      role='dialog'
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className='modal-dialog' role='document'>
        <div className='modal-content'>
          <div className='modal-header'>
            <h5 className='modal-title'>{t('chat.newConversationModalTitle')}</h5>
            <button type='button' className='btn-close' onClick={onClose} aria-label={t('chat.closeModalAriaLabel')} />
          </div>
          <div className='modal-body'>
            {error && <div className='alert alert-danger'>{error}</div>}
            <label className='form-label'>{t('chat.selectContactLabel')}</label>
            <SelectContactsWithFilter
              onChange={handleContactChange}
              licensee={effectiveLicenseeId}
              isDisabled={loading}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import SelectLicenseesWithFilter from '../SelectLicenseesWithFilter'
import type { SingleValue } from 'react-select'

interface LicenseeOption {
  value: string
  label: string
}

interface SelectedLicensee {
  id: string
  _id: string
  name: string
}

interface SelectLicenseeModalProps {
  onSelect: (licensee: SelectedLicensee | null) => void
  required?: boolean
}

export default function SelectLicenseeModal({ onSelect, required = true }: SelectLicenseeModalProps) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<SingleValue<LicenseeOption>>(null)

  function handleConfirm() {
    onSelect(selected ? { id: selected.value, _id: selected.value, name: selected.label } : null)
  }

  return (
    <div
      className='modal d-block'
      tabIndex={-1}
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div className='modal-dialog modal-dialog-centered'>
        <div className='modal-content'>
          <div className='modal-header'>
            <h5 className='modal-title'>{t('navbar.selectLicensee')}</h5>
          </div>
          <div className='modal-body'>
            <SelectLicenseesWithFilter onChange={setSelected} />
            {!selected && required && (
              <small className='text-muted'>{t('navbar.selectLicenseeRequired')}</small>
            )}
            {!selected && !required && (
              <small className='text-muted'>{t('navbar.selectLicenseeOptional')}</small>
            )}
          </div>
          <div className='modal-footer'>
            <button
              className='btn btn-primary'
              onClick={handleConfirm}
              disabled={required && !selected}
            >
              {t('navbar.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

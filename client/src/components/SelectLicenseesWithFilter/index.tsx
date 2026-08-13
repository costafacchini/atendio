import React, { useState } from 'react'
import Select, { createFilter, SingleValue, FilterOptionOption } from 'react-select'
import debounce from 'lodash/debounce'
import { getLicensees } from '../../services/licensee'

interface LicenseeOption {
  value: string
  label: string
}

/** Raw record returned by the API uses MongoDB-style _id */
interface LicenseeRecord {
  _id: string
  name: string
  [key: string]: unknown
}

interface SelectedLicenseeItem {
  _id: string
  name: string
  [key: string]: unknown
}

interface SelectLicenseesWithFilterProps {
  isDisabled?: boolean
  onChange: (value: SingleValue<LicenseeOption>) => void
  selectedItem?: SelectedLicenseeItem | null
  [key: string]: unknown
}

export default function SelectLicenseesWithFilter({ isDisabled, onChange, selectedItem, ...props }: SelectLicenseesWithFilterProps) {
  const [defaultValue, setDefaultValue] = useState<LicenseeOption | null>(null)
  const [selectedOption, setSelectedOption] = useState<LicenseeOption | null>(null)
  const [options, setOptions] = useState<LicenseeOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [optionsLoaded, setOptionsLoaded] = useState(false)

  const filterConfig = {
    ignoreCase: true,
    ignoreAccents: true,
    trim: true,
    matchFrom: 'any' as const,
  }

  function handleOnChange(value: SingleValue<LicenseeOption>) {
    if (value !== selectedOption) {
      setSelectedOption(value)

      onChange(value)
    }
  }

  function transformData(values: LicenseeRecord[]): LicenseeOption[] {
    return values.map((value) => ({ value: value._id, label: value.name }))
  }

  function handleSetSearchInput(value: string) {
    if (value.length > 2) handleFetch(value)
  }

  async function onFetch(value?: string) {
    try {
      setIsLoading(true)
      const { data: licensees } = await getLicensees({ expression: value, active: true })
      setOptions(transformData(licensees as LicenseeRecord[]))
    } catch (_) {}
    setIsLoading(false)
  }

  const handleFetch = debounce(onFetch, 500)

  if (selectedItem && !defaultValue) {
    const newSelectedOption: LicenseeOption = { value: selectedItem._id, label: selectedItem.name }

    const hasItem = options.find(item => item.value === selectedItem._id)
    if (!hasItem) {
      const newOptions = [...options, newSelectedOption]
      setOptions(newOptions)
    }

    setDefaultValue(newSelectedOption)
  }

  if (!isDisabled && !isLoading && !optionsLoaded) {
    onFetch()
    setOptionsLoaded(true)
  }

  return(
      <Select
        defaultValue={defaultValue}
        isClearable
        isSearchable
        isLoading={isLoading}
        isDisabled={isDisabled}
        options={options}
        filterOption={(option: FilterOptionOption<LicenseeOption>, inputValue: string) =>
          createFilter(filterConfig)(option, inputValue)
        }
        onChange={handleOnChange}
        onInputChange={handleSetSearchInput}
        {...props}
      />
  )
}

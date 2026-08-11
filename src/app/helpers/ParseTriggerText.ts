import { IContact } from '../../types'

function parseText(text: string, contact: IContact, _deps: Record<string, unknown> = {}) {
  return text.replace(/\$contact_name/g, contact.name ?? '').replace(/\$contact_number/g, contact.number)
}

export { parseText }

import type { IContact } from './contact'

export interface IMessageTriggerRef {
  _id: string
  name: string
}

export interface IMessageDepartmentRef {
  _id: string
  name: string
}

export interface IMessage {
  id: string
  kind: 'text' | 'file' | 'location' | 'interactive' | 'cart' | string
  destination: 'to-chatbot' | 'to-chat' | 'to-messenger' | 'to-transfer' | string
  text: string | null
  url: string | null
  fileName: string | null
  latitude: number
  longitude: number
  sended: boolean
  scheduledAt?: string | null
  error: string | null
  ignored?: boolean
  cart: unknown
  createdAt: string
  contact: Pick<IContact, 'id' | 'name'> | null
  trigger: IMessageTriggerRef | null
  sector: IMessageDepartmentRef | null
}

export interface IMessageFilters {
  page?: number
  licensee?: string
  contact?: string
  kind?: string
  destination?: string
  onlyErrors?: boolean
  startDate?: string
  endDate?: string
  [key: string]: unknown
}

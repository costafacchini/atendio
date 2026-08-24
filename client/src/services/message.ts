import { getToken } from './auth'
import api from './api'
import parseUrl from './objectToQueryParameter'
import type { IMessage, IMessageFilters } from '../types/message'

interface ScheduleMessagePayload {
  licensee: string
  contact: string
  destination: string
  kind: string
  text?: string
  url?: string
  fileName?: string
  scheduledAt: string
}

function getMessages(queryParams: IMessageFilters) {
  const url = parseUrl('resources/messages/', queryParams)
  return api().get<IMessage[]>(url, { headers: { 'x-access-token': getToken() } })
}

function resendMessage(id: string) {
  return api().post(`resources/messages/${id}/resend`, { headers: { 'x-access-token': getToken() } })
}

function ignoreMessage(id: string) {
  return api().post(`resources/messages/${id}/ignore`, { headers: { 'x-access-token': getToken() } })
}

function scheduleMessage(payload: ScheduleMessagePayload) {
  return api().post('resources/messages', { headers: { 'x-access-token': getToken() }, body: payload })
}

export { getMessages, resendMessage, ignoreMessage, scheduleMessage }

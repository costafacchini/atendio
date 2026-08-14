import api from './api'
import { getToken } from './auth'
import parseUrl from './objectToQueryParameter'
import type { IRoom } from '../types'
import type { IMessage } from '../types'

interface IRoomListResponse { rooms: IRoom[]; hasMore: boolean }
interface IRoomMessagesResponse { messages: IMessage[]; total: number; page: number; hasMore: boolean }

const headers = () => ({ 'x-access-token': getToken() })

export function getRooms(params: { page?: number; licensee?: string; inbox?: string } = {}) {
  const url = parseUrl('resources/rooms', params as Record<string, unknown>)
  return api().get<IRoomListResponse>(url, { headers: headers() })
}

export function createRoom(contactId: string, inboxId?: string) {
  return api().post<{ room: IRoom }>('resources/rooms', { headers: headers(), body: { contactId, inboxId } })
}

export function getRoomMessages(roomId: string, params: { page?: number } = {}) {
  const url = parseUrl(`resources/rooms/${roomId}/messages`, params as Record<string, unknown>)
  return api().get<IRoomMessagesResponse>(url, { headers: headers() })
}

export function sendRoomMessage(roomId: string, text: string) {
  return api().post(`resources/rooms/${roomId}/messages`, { headers: headers(), body: { text } })
}

export function closeRoom(roomId: string) {
  return api().post(`resources/rooms/${roomId}/close`, { headers: headers() })
}

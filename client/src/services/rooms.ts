import api from './api'
import type { IApiResponse } from './api'
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

// Uses fetch directly (not api()) — api() always JSON.stringifies the body and
// forces Content-Type: application/json, which breaks multipart/form-data uploads.
export async function uploadRoomFile(
  roomId: string,
  file: File,
): Promise<IApiResponse<{ url: string; fileName: string }>> {
  const form = new FormData()
  form.append('file', file)

  const response = await fetch(`resources/rooms/${roomId}/upload`, {
    method: 'POST',
    headers: headers() as Record<string, string>,
    body: form,
  })
  const data = await response.json()
  return { status: response.status, data }
}

export function sendRoomFileMessage(roomId: string, payload: { url: string; fileName: string }) {
  return api().post(`resources/rooms/${roomId}/messages`, {
    headers: headers(),
    body: { kind: 'file', url: payload.url, fileName: payload.fileName },
  })
}

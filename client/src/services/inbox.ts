import { getToken } from './auth'
import api from './api'
import parseUrl from './objectToQueryParameter'

const headers = () => ({ 'x-access-token': getToken() })

interface InboxQueryParams {
  licensee: string
  kind?: string
  active?: boolean
}

function getInboxes(queryParams: InboxQueryParams) {
  const url = parseUrl('resources/inboxes/', queryParams as unknown as Record<string, unknown>)
  return api().get(url, { headers: headers() })
}

function getInbox(id: string) {
  return api().get(`resources/inboxes/${id}`, { headers: headers() })
}

function createInbox(data: Record<string, unknown>) {
  return api().post('resources/inboxes/', { body: data, headers: headers() })
}

function updateInbox(id: string, data: Record<string, unknown>) {
  return api().post(`resources/inboxes/${id}`, { headers: headers(), body: data })
}

function deleteInbox(id: string) {
  return api().delete(`resources/inboxes/${id}`, { headers: headers() })
}

function getInboxBaileysStatus(inboxId: string) {
  return api().get(`resources/inboxes/${inboxId}/baileys-status`, { headers: headers() })
}

function getInboxBaileysQr(inboxId: string) {
  return api().post(`resources/inboxes/${inboxId}/baileys-qr`, { headers: headers() })
}

function syncInboxBaileys(inboxId: string) {
  return api().post(`resources/inboxes/${inboxId}/baileys-sync`, { headers: headers() })
}

export {
  getInboxes,
  getInbox,
  createInbox,
  updateInbox,
  deleteInbox,
  getInboxBaileysStatus,
  getInboxBaileysQr,
  syncInboxBaileys,
}

import api from './api'
import type { IUser } from '../types'

const TOKEN_KEY = "@atendio-bearer"
const EMAIL_KEY = "@atendio-mail"
const ACTIVE_LICENSEE_KEY = "@atendio-active-licensee"
const LICENSEE_MODAL_SEEN_KEY = "@atendio-licensee-modal-seen"

export function isAuthenticated(): boolean {
  return localStorage.getItem(TOKEN_KEY) !== null
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getEmail(): string | null {
  return localStorage.getItem(EMAIL_KEY)
}

export function login(email: string, token: string): void {
  localStorage.setItem(EMAIL_KEY, email)
  localStorage.setItem(TOKEN_KEY, token)
}

export function logout(): void {
  localStorage.removeItem(EMAIL_KEY)
  localStorage.removeItem(TOKEN_KEY)
  clearActiveLicensee()
  localStorage.removeItem(LICENSEE_MODAL_SEEN_KEY)
}

export function saveLicenseeModalSeen(seen: boolean): void {
  localStorage.setItem(LICENSEE_MODAL_SEEN_KEY, JSON.stringify(seen))
}

export function loadLicenseeModalSeen(): boolean {
  return localStorage.getItem(LICENSEE_MODAL_SEEN_KEY) === 'true'
}

export function saveActiveLicensee(licensee: object | null): void {
  localStorage.setItem(ACTIVE_LICENSEE_KEY, JSON.stringify(licensee))
}

export function loadActiveLicensee(): unknown {
  try {
    return JSON.parse(localStorage.getItem(ACTIVE_LICENSEE_KEY) as string)
  } catch {
    return null
  }
}

export function clearActiveLicensee(): void {
  localStorage.removeItem(ACTIVE_LICENSEE_KEY)
}

export async function fetchLoggedUser(): Promise<IUser | null> {
  const email = getEmail()
  const token = getToken()
  if (token) {
    const headers = { 'x-access-token': `${token}` }
    const response = await api().get<IUser>(`/resources/users/${email}`, { headers })
    return response.data
  }
  return null
}

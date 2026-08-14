import type { ILicensee } from './licensee'

export type UserRole = 'agent' | 'supervisor' | 'admin' | 'super'

export type Language = 'pt' | 'en'

export interface IUser {
  id: string
  name: string
  email: string
  active: boolean
  role: UserRole
  language: Language
  licensee: Pick<ILicensee, 'id' | 'name' | 'useDepartments'> | string | null
}

export interface IUserFilters {
  page?: number
  expression?: string
  licensee?: string
  [key: string]: unknown
}

export type IUserInput = {
  name: string
  email: string
  password?: string
  active: boolean
  role: UserRole
  licensee?: string
}

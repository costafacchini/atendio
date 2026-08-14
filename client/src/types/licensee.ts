export interface ILicensee {
  id: string
  name: string
  email: string
  phone: string
  active: boolean
  apiToken: string
  licenseKind: string
  document: string
  kind: string
  useChatbot: boolean
  chatbotDefault: string
  chatbotUrl: string
  chatbotAuthorizationToken: string
  messageOnResetChatbot: string
  chatbotApiToken: string
  messageOnCloseChat: string
  useSenderName: boolean
  useFileIDYcloud: boolean
  useDepartments: boolean
  // Read-only webhook URLs returned by the API
  urlChatWebhook?: string
  urlChatbotWebhook?: string
  urlChatbotTransfer?: string
  urlWhatsappWebhook?: string
}

/** Form values used by both the edit form and the new-licensee wizard. */
export interface ILicenseeFormValues {
  name: string
  email: string
  phone: string
  active: boolean
  apiToken: string
  licenseKind: string
  useChatbot: boolean
  useFileIDYcloud: boolean
  chatbotDefault: string
  chatbotUrl: string
  chatbotAuthorizationToken: string
  messageOnResetChatbot: string
  chatbotApiToken: string
  messageOnCloseChat: string
  document: string
  kind: string
  useSenderName: boolean
  useDepartments: boolean
}

export interface ILicenseeFilters {
  page?: number
  expression?: string
  pedidos10_active?: boolean
  active?: boolean
  [key: string]: unknown
}

export type ILicenseeInput = Omit<ILicensee, 'id'>

export interface IBaileysStatusResponse {
  connected?: boolean
}

export interface IBaileysQrResponse {
  qr?: string
  connected?: boolean
  message?: string
}

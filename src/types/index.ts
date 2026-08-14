// --- Enums ---

export enum LicenseKind {
  Demo = 'demo',
  Free = 'free',
  Paid = 'paid',
}

export enum ChatbotDefault {
  Landbot = 'landbot',
  None = '',
}

export enum WhatsappDefault {
  Utalk = 'utalk',
  Dialog = 'dialog',
  Ycloud = 'ycloud',
  Pabbly = 'pabbly',
  Baileys = 'baileys',
  None = '',
}

export enum ChatDefault {
  Rocketchat = 'rocketchat',
  Crisp = 'crisp',
  Cuboup = 'cuboup',
  Chatwoot = 'chatwoot',
  None = '',
}

export enum MessageKind {
  Text = 'text',
  File = 'file',
  Location = 'location',
  Interactive = 'interactive',
  Template = 'template',
}

export enum MessageDestination {
  ToChatbot = 'to-chatbot',
  ToChat = 'to-chat',
  ToMessenger = 'to-messenger',
  ToTransfer = 'to-transfer',
}

export enum TriggerKind {
  MultiProduct = 'multi_product',
  SingleProduct = 'single_product',
  ReplyButton = 'reply_button',
  ListMessage = 'list_message',
  Text = 'text',
}

// --- Interfaces ---

export interface ILicensee {
  _id: string
  name: string
  email?: string
  phone?: string
  active: boolean
  apiToken: string
  licenseKind: LicenseKind
  useChatbot: boolean
  chatbotDefault?: ChatbotDefault
  chatbotUrl?: string
  chatbotApiToken?: string
  messageOnResetChatbot?: string
  messageOnCloseChat?: string
  chatbotAuthorizationToken?: string
  unidadeId?: string
  statusId?: string
  useWhatsappWindow: boolean
  document?: string
  useSenderName: boolean
  useFileIDYcloud: boolean
  urlWhatsappWebhook?: string
  createdAt: Date
  updatedAt: Date
}

export interface IContact {
  _id: string
  name?: string
  number: string
  type?: string
  talkingWithChatBot: boolean
  email?: string
  licensee: string | ILicensee
  waId?: string
  isGroup: boolean
  active: boolean
  landbotId?: string
  chatwootId?: string
  chatwootSourceId?: string
  wa_start_chat?: string
  document?: string
  customer_id?: string
  createdAt: Date
  updatedAt: Date
}

export interface IMessage {
  _id: string
  number: string
  fromMe: boolean
  text?: string
  url?: string
  fileName?: string
  kind: MessageKind
  destination: MessageDestination
  latitude?: number
  longitude?: number
  departament?: string
  department?: string | null
  senderName?: string
  sended: boolean
  ignored?: boolean
  licensee: string | ILicensee
  contact: string | IContact
  room?: string | IRoom
  messageWaId?: string
  messageChatId?: string
  attachmentWaId?: string
  trigger?: string
  sendedAt?: Date | null
  readAt?: Date
  deliveredAt?: Date
  error?: string | null
  payload?: string
  replyMessageId?: string
  createdAt: Date
  updatedAt: Date
}

export interface IRoom {
  _id: string
  roomId?: string
  token?: string
  status?: string
  closed: boolean
  closedAt?: Date
  contact: string | IContact
  createdAt: Date
  updatedAt: Date
}

export interface ITrigger {
  _id: string
  name?: string
  triggerKind: TriggerKind
  expression: string
  catalogId?: string
  catalogMulti?: string
  catalogSingle?: string
  textReplyButton?: string
  messagesList?: string
  text?: string
  licensee: string | ILicensee
  order: number
  createdAt: Date
  updatedAt: Date
}

export interface IBody {
  _id: string
  content: Record<string, unknown>
  licensee: string | ILicensee
  kind: 'normal' | 'webhook'
  department?: string | null
  inbox?: string | null
  concluded: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IDepartment {
  _id: string
  name: string
  licensee: string | ILicensee
  users: string[]
  active: boolean
  departmentToken: string
  inbox?: string | IInbox
  createdAt: Date
  updatedAt: Date
}

export interface IInbox {
  _id: string
  name: string
  licensee: string | ILicensee
  kind: 'messenger' | 'chat'
  whatsappDefault?: string
  whatsappToken?: string
  whatsappUrl?: string
  chatDefault?: string
  chatUrl?: string
  chatKey?: string
  chatIdentifier?: string
  inboxToken?: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IUser {
  _id: string
  name: string
  email: string
  password?: string
  active: boolean
  role: 'agent' | 'supervisor' | 'admin' | 'super'
  language: 'pt' | 'en'
  licensee?: string | ILicensee
  blockedLicensees: (string | ILicensee)[]
  createdAt: Date
  updatedAt: Date
}

interface ITemplateParam {
  number?: string
  format?: string
}

export interface ITemplate {
  _id: string
  name: string
  namespace?: string
  language?: string
  category?: string
  waId?: string
  licensee: string | ILicensee
  headerParams?: ITemplateParam[]
  bodyParams?: ITemplateParam[]
  footerParams?: ITemplateParam[]
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ITrafficlight {
  _id: string
  key: string
  token: string
  expiresAt: Date
}

export interface IWhatsappSession {
  _id: string
  licensee: string | ILicensee
  inbox?: string | IInbox | null
  creds?: Record<string, unknown>
  keys?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

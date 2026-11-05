import { NormalizePhone } from '../../helpers/NormalizePhone'
import request from '../../services/request'
import { logger } from '../../helpers/logger'
import { MessengersBase } from './Base'
import { ILicensee, IContact } from '../../../types'

const GROUP_SUFFIX = '@g.us'

// Session name sent to wppconnect-server's own REST API (/api/:session/...).
// Deterministic per Inbox so re-authenticating always targets the same session.
function sessionNameFor(inboxId: string | undefined | null) {
  return `atendio-inbox-${inboxId}`
}

class WppconnectServerV2 extends MessengersBase {
  constructor(licensee: ILicensee, dependencies: Record<string, unknown> = {}) {
    super(licensee, dependencies)
  }

  action(messageDestination: any) {
    if (messageDestination === 'to-chat') {
      return 'send-message-to-chat'
    } else {
      return 'send-message-to-chatbot'
    }
  }

  parseMessageStatus() {
    // Delivery/read receipts (wppconnect-server's "onack" webhook event) are not handled
    // in this plan's scope — mirrors Utalk's initial-scope behavior.
    this.messageStatus = null
  }

  parseMessage(responseBody: any) {
    if (!responseBody || responseBody.event !== 'onmessage') {
      this.messageData = null
      return
    }

    if (responseBody.fromMe) {
      this.messageData = null
      return
    }

    // Only plain text ("chat") is supported in this plan's scope — mirrors the
    // Baileys/Wppconnect initial-scope limitation.
    if (responseBody.type !== 'chat' || !responseBody.body) {
      this.messageData = null
      return
    }

    this.messageData = {
      kind: 'text',
      waId: responseBody.id,
      text: { body: responseBody.body },
    }
  }

  parseContactData(responseBody: any) {
    if (!responseBody || responseBody.event !== 'onmessage') {
      this.contactData = null
      return
    }

    if (responseBody.fromMe) {
      this.contactData = null
      return
    }

    const normalizePhone = new NormalizePhone(responseBody.from)
    if (!normalizePhone.number) {
      this.contactData = null
      return
    }

    const name =
      responseBody.notifyName || responseBody.sender?.pushname || responseBody.sender?.name || normalizePhone.number

    this.contactData = {
      name,
      number: normalizePhone.number,
      type: normalizePhone.type,
      waId: responseBody.from,
      wa_start_chat: new Date(),
    }
  }

  contactWithDifferentData(contact: any) {
    return Boolean(this.contactData?.name && this.contactData.name !== contact.name)
  }

  shouldUpdateWaStartChat(contact: any) {
    return !contact.wa_start_chat
  }

  // Phone number as wppconnect-server's /send-message expects it: digits only,
  // no @c.us/@g.us suffix (confirmed against wppconnect-team/wppconnect-server's
  // messageController.ts — the suffix is appended internally by the library).
  phoneForSend(messageContact: IContact): { phone: string; isGroup: boolean } {
    const rawId = messageContact.waId || `${messageContact.number}${messageContact.type}`
    const isGroup = rawId.endsWith(GROUP_SUFFIX)
    const phone = rawId.replace(/@.*$/, '')
    return { phone, isGroup }
  }

  async sendMessage(messageId: string, url?: string, token?: string): Promise<void> {
    const messageToSend = await this.messageRepository.findFirst({ _id: messageId }, ['contact'])
    if (!messageToSend) {
      logger.error(`WppconnectServerV2: mensagem ${messageId} não encontrada.`)
      return
    }

    if (messageToSend.kind !== 'text') {
      logger.warn(
        `WppconnectServerV2: tipo de mensagem '${messageToSend.kind}' não suportado. Mensagem ${messageId} ignorada.`,
      )
      return
    }

    const messageContact = messageToSend.contact as IContact
    const { phone, isGroup } = this.phoneForSend(messageContact)
    const session = sessionNameFor(this.inbox?._id)

    const headers = { Authorization: `Bearer ${token}` }
    const body = { phone: [phone], isGroup, message: messageToSend.text }

    const response = await request.post(`${url}/api/${session}/send-message`, { headers, body })

    if (response.status === 201) {
      messageToSend.sended = true
      await this.messageRepository.save(messageToSend)
      logger.info(
        `Mensagem ${messageToSend._id} enviada para Wppconnect Server v2 com sucesso! ${JSON.stringify(response.data)}`,
      )
    } else {
      messageToSend.error = JSON.stringify(response.data)
      await this.messageRepository.save(messageToSend)
      logger.error(
        `Mensagem ${messageToSend._id} não enviada para Wppconnect Server v2. ${JSON.stringify(response.data)}`,
      )
    }
  }

  // Starts (or resumes) the session and returns the pending QR as a base64 data URL,
  // or null when already connected. Consumed by GetWppconnectServerV2QrForInbox (task-02).
  async getQrCode(url: string, token: string): Promise<string | null> {
    const session = sessionNameFor(this.inbox?._id)
    const headers = { Authorization: `Bearer ${token}` }

    await request.post(`${url}/api/${session}/start-session`, { headers, body: { waitQrCode: false } })

    const response = await request.get(`${url}/api/${session}/status-session`, { headers })
    const { status, qrcode } = response.data || {}

    if (status === 'CONNECTED') return null

    return qrcode ?? null
  }

  // Consumed by GetWppconnectServerV2StatusForInbox (task-02).
  async getConnectionStatus(url: string, token: string): Promise<boolean> {
    const session = sessionNameFor(this.inbox?._id)
    const headers = { Authorization: `Bearer ${token}` }

    const response = await request.get(`${url}/api/${session}/status-session`, { headers })

    return response.data?.status === 'CONNECTED'
  }
}

export { WppconnectServerV2 }

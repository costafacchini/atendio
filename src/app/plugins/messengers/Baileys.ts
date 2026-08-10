import { NormalizePhone } from '../../helpers/NormalizePhone'
import { MessengersBase } from './Base'
import { logger } from '../../helpers/logger'
import { requireDependency } from '../../helpers/RequireDependency'
import { isPhoto, isVideo } from '../../helpers/Files'
import { ILicensee, IInbox, IWhatsappSession } from '../../../types'
import { IRepository } from '../../repositories/repository'

const JID_GROUP_SUFFIX = '@g.us'

class Baileys extends MessengersBase {
  _whatsappSessionRepository: IRepository<IWhatsappSession>
  _inbox: IInbox | null

  constructor(
    licensee: ILicensee,
    {
      whatsappSessionRepository,
      inbox,
      ...dependencies
    }: {
      whatsappSessionRepository?: IRepository<IWhatsappSession>
      inbox?: IInbox | null
      [key: string]: unknown
    } = {},
  ) {
    super(licensee, dependencies)
    this._whatsappSessionRepository = whatsappSessionRepository!
    this._inbox = inbox ?? null
  }

  get whatsappSessionRepository() {
    return requireDependency(this._whatsappSessionRepository, 'whatsappSessionRepository', this.constructor.name)
  }

  action(messageDestination: any) {
    if (messageDestination === 'to-chat') {
      return 'send-message-to-chat'
    } else if (messageDestination === 'to-messenger') {
      return 'send-message-to-messenger'
    } else {
      return 'send-message-to-chatbot'
    }
  }

  parseMessageStatus(body: any) {
    if (!body?.key?.id || !body?.key?.fromMe || body.update?.status == null) {
      this.messageStatus = null
      return
    }

    const statusMap: Record<number, string> = {
      1: 'sent', // SERVER_ACK
      2: 'delivered', // DELIVERY_ACK
      3: 'read', // READ
      4: 'read', // PLAYED (audio)
    }

    const mapped = statusMap[body.update.status]
    if (!mapped) {
      this.messageStatus = null
      return
    }

    this.messageStatus = {
      id: body.key.id,
      status: mapped,
    }
  }

  parseMessage(body: any) {
    if (!body || !body.key) {
      this.messageData = null
      return
    }

    const text = body.message?.conversation || body.message?.extendedTextMessage?.text || null

    if (!text) {
      // Non-text message types (sticker, image, audio, etc.) — not handled in initial scope
      this.messageData = null
      return
    }

    this.messageData = {
      kind: 'text',
      waId: body.key.id,
      text: { body: text },
    }
  }

  parseContactData(body: any) {
    if (!body || !body.key) {
      this.contactData = null
      return
    }

    let phone: NormalizePhone
    phone = this.getPhone(body.key.remoteJidAlt)
    if (!phone.number) {
      phone = this.getPhone(body.key.remoteJid)
    }
    if (!phone.number) {
      phone = this.getPhone(body.key.participant)
    }

    if (!phone.number) {
      this.contactData = null
      return
    }

    this.contactData = {
      number: phone.number,
      type: phone.type,
      name: body.pushName || phone.number,
      wa_start_chat: new Date(),
    }
  }

  getPhone(number: string | undefined): NormalizePhone {
    if (!number) return new NormalizePhone('')

    return new NormalizePhone(number)
  }

  contactWithDifferentData(contact: any) {
    return (
      (this.contactData.name && this.contactData.name !== contact.name) ||
      (this.contactData.waId && this.contactData.waId !== contact.waId)
    )
  }

  shouldUpdateWaStartChat(contact: any) {
    return !contact.wa_start_chat
  }

  async loadOrCreateSession() {
    const filter: Record<string, any> = { licensee: this.licensee._id, inbox: this._inbox?._id ?? null }
    let session = await this.whatsappSessionRepository.findFirst(filter)
    if (!session) {
      session = await this.whatsappSessionRepository.create({
        licensee: this.licensee._id,
        inbox: this._inbox?._id ?? null,
      })
    }
    return session
  }

  async saveSession(session: any, creds: any, keys: any, BufferJSON: any) {
    // Serialize Buffers to { type: 'Buffer', data: '<base64>' } before storing in JSON,
    // so BufferJSON.reviver can restore them correctly on the next load.
    const serialized = JSON.parse(JSON.stringify({ creds, keys }, BufferJSON.replacer))
    await this.whatsappSessionRepository.update(session._id, serialized)
  }

  buildAuthState(session: any, initAuthCreds: any, BufferJSON: any) {
    // Deserialize creds and keys from JSON storage — plain objects must become real Buffer instances
    // so Baileys crypto operations receive the correct types.
    const creds =
      session.creds && Object.keys(session.creds).length > 0
        ? JSON.parse(JSON.stringify(session.creds), BufferJSON.reviver)
        : initAuthCreds()

    const keys = session.keys ? JSON.parse(JSON.stringify(session.keys), BufferJSON.reviver) : {}

    return {
      state: {
        creds,
        keys: {
          get: (type: any, ids: any) => {
            const keyMap = keys[type] ?? {}
            return ids.reduce((acc: any, id: any) => {
              if (keyMap[id] !== undefined) acc[id] = keyMap[id]
              return acc
            }, {})
          },
          set: (data: any) => {
            for (const category of Object.keys(data)) {
              keys[category] = { ...(keys[category] ?? {}), ...data[category] }
            }
          },
        },
      },
      rawKeys: keys,
    }
  }

  // Shared socket bootstrap — opens a connected Baileys socket and registers creds persistence.
  // Callers are responsible for socket lifecycle (socket.end()).
  async _openSocket(session: any, state: any, rawKeys: any, BufferJSON: any) {
    const { default: makeWASocket, Browsers, fetchLatestBaileysVersion } = await import('@whiskeysockets/baileys')
    const { version } = await fetchLatestBaileysVersion()

    const socket = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Chrome'),
    })

    socket.ev.on('creds.update', () => {
      this.saveSession(session, state.creds, rawKeys, BufferJSON).catch((err) => {
        logger.error(`Baileys: erro ao salvar sessão: ${err.message ?? err}`)
      })
    })

    return socket
  }

  // Waits for the socket to reach the 'open' connection state.
  // Rejects if the connection closes before opening.
  _waitForConnection(socket: any) {
    return new Promise<void>((resolve, reject) => {
      socket.ev.on('connection.update', ({ connection, lastDisconnect }: any) => {
        if (connection === 'open') resolve()
        if (connection === 'close') reject(lastDisconnect?.error ?? new Error('Connection Closed'))
      })
    })
  }

  async sendMessage(messageId: string): Promise<void> {
    const { initAuthCreds, BufferJSON } = await import('@whiskeysockets/baileys')

    const messageToSend = await this.messageRepository.findFirst({ _id: messageId }, ['contact'])

    if (!messageToSend) {
      logger.error(`Baileys: mensagem ${messageId} não encontrada.`)
      return
    }

    if (!['text', 'file'].includes(messageToSend.kind)) {
      logger.warn(`Baileys: tipo de mensagem '${messageToSend.kind}' não suportado. Mensagem ${messageId} ignorada.`)
      return
    }

    const session = await this.loadOrCreateSession()
    const { state, rawKeys } = this.buildAuthState(session, initAuthCreds, BufferJSON)

    let socket: any
    try {
      socket = await this._openSocket(session, state, rawKeys, BufferJSON)

      await this._waitForConnection(socket)

      const rawId = messageToSend.contact.waId || messageToSend.contact.number
      let jid

      if (rawId.endsWith(JID_GROUP_SUFFIX)) {
        // Group JIDs are stored verbatim — bypass person-number resolution.
        jid = rawId
        logger.info(`Baileys: enviando mensagem ${messageId} para grupo JID: ${jid}`)
      } else {
        const [registeredAccount] = await socket.onWhatsApp(rawId)
        if (!registeredAccount?.exists) {
          throw new Error(`Número ${rawId} não encontrado no WhatsApp`)
        }
        jid = registeredAccount.jid
        logger.info(`Baileys: enviando mensagem ${messageId} para JID resolvido: ${jid}`)
      }

      let messageContent
      if (messageToSend.kind === 'file') {
        if (isPhoto(messageToSend.url)) {
          messageContent = { image: { url: messageToSend.url }, caption: messageToSend.text ?? '' }
        } else if (isVideo(messageToSend.url)) {
          messageContent = { video: { url: messageToSend.url }, caption: messageToSend.text ?? '' }
        } else {
          messageContent = {
            document: { url: messageToSend.url },
            fileName: messageToSend.fileName ?? '',
            caption: messageToSend.text ?? '',
          }
        }
      } else {
        messageContent = { text: messageToSend.text }
      }

      const result = await socket.sendMessage(jid, messageContent as any)

      // Wait for Baileys to flush the message over the WebSocket before closing.
      // sendMessage() resolves when the message is queued, not yet transmitted.
      await new Promise((resolve) => setTimeout(resolve, 3000))

      messageToSend.messageWaId = result?.key?.id ?? null
      messageToSend.sended = true
      await this.messageRepository.save(messageToSend)
      logger.info(`Mensagem ${messageId} enviada via Baileys com sucesso!`)
    } catch (error: any) {
      const statusCode = error?.output?.statusCode
      if (statusCode === 401) {
        // Session was logged out — clear stale creds so the next status check reflects disconnected.
        await this.whatsappSessionRepository.update(session._id, { creds: {}, keys: {} }).catch(() => {})
      }
      messageToSend.error = error.message ?? String(error)
      await this.messageRepository.save(messageToSend)
      logger.error(`Mensagem ${messageId} não enviada via Baileys. Erro: ${error.message ?? error}`)
    } finally {
      if (socket) {
        socket.end()
      }
    }
  }

  // Fetches all WhatsApp groups the connected account is a member of.
  // Returns a normalized payload: { groups: [{ waId, name, number, type }] }
  // Does NOT enable or consume chat/message history.
  async fetchGroups() {
    const { initAuthCreds, BufferJSON } = await import('@whiskeysockets/baileys')

    const session = await this.loadOrCreateSession()
    const { state, rawKeys } = this.buildAuthState(session, initAuthCreds, BufferJSON)

    let socket: any
    try {
      socket = await this._openSocket(session, state, rawKeys, BufferJSON)
      await this._waitForConnection(socket)

      const groupMap = await socket.groupFetchAllParticipating()

      const groups = Object.values(groupMap).map((group: any) => {
        const waId = group.id
        const number = waId.replace(new RegExp(`${JID_GROUP_SUFFIX}$`), '')
        return {
          waId,
          name: group.subject ?? waId,
          number,
          type: JID_GROUP_SUFFIX,
        }
      })

      logger.info(`Baileys: ${groups.length} grupos obtidos para licensee ${this.licensee._id}`)
      return { groups }
    } finally {
      if (socket) {
        socket.end()
      }
    }
  }

  async _reconnectAfterPairing(session: any, state: any, rawKeys: any, BufferJSON: any) {
    const socket: any = await this._openSocket(session, state, rawKeys, BufferJSON)

    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        socket.end()
        resolve()
      }, 15000)

      socket.ev.on('connection.update', ({ connection }: any) => {
        if (connection === 'open' || connection === 'close') {
          clearTimeout(timeout)
          socket.end()
          resolve()
        }
      })
    })
  }

  getQrCode(timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      this.loadOrCreateSession()
        .then((session) => {
          let socket: any
          const timer = setTimeout(() => {
            if (socket) socket.end()
            reject(new Error('Timeout ao gerar QR Code'))
          }, timeoutMs)

          import('@whiskeysockets/baileys')
            .then(({ initAuthCreds, BufferJSON, fetchLatestBaileysVersion }) => {
              const { state, rawKeys } = this.buildAuthState(session, initAuthCreds, BufferJSON)

              fetchLatestBaileysVersion()
                .then(() => {
                  return this._openSocket(session, state, rawKeys, BufferJSON)
                })
                .then((openedSocket) => {
                  socket = openedSocket

                  socket.ev.on('connection.update', (update: any) => {
                    const { qr, connection } = update

                    if (qr) {
                      resolve(qr)
                      return
                    }

                    if (connection === 'open') {
                      clearTimeout(timer)
                      socket.end()
                      resolve(null)
                    }

                    if (connection === 'close') {
                      clearTimeout(timer)
                      const statusCode = (update.lastDisconnect?.error as any)?.output?.statusCode
                      if (statusCode === 515) {
                        // 515 = Restart Required — WhatsApp closes the stream after QR pairing and
                        // expects the client to reconnect with the fresh credentials to complete
                        // device linking (otherwise the phone stays at "Connecting...").
                        socket.end()
                        resolve(null)
                        this._reconnectAfterPairing(session, state, rawKeys, BufferJSON).catch(() => {})
                      } else if (statusCode === 401) {
                        // 401 = Logged Out — device was removed from WhatsApp linked devices.
                        // Clear the stale credentials and retry to produce a fresh QR code.
                        socket.end()
                        this.whatsappSessionRepository
                          .update(session._id, { creds: {}, keys: {} })
                          .then(() => this.getQrCode(timeoutMs))
                          .then(resolve)
                          .catch(reject)
                      } else {
                        reject(new Error('Conexão encerrada antes de receber o QR'))
                      }
                    }
                  })
                })
                .catch((err) => {
                  clearTimeout(timer)
                  reject(err)
                })
            })
            .catch((err) => {
              clearTimeout(timer)
              reject(err)
            })
        })
        .catch(reject)
    })
  }
}

export { Baileys }

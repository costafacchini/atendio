import moment from 'moment-timezone'

const WINDOW_HOURS = 24
const WARNING_MINUTES = 10

async function sendMessageToChat(licensee: any, chatInbox: any, messageToSend: any, { createChatPlugin }: Record<string, any> = {}) {
  const chatPlugin = createChatPlugin(licensee, { inbox: chatInbox })
  await chatPlugin.sendMessage(messageToSend._id, chatInbox.chatUrl)
}

async function clearWaStartChatOnContact(contact: any, { contactRepository }: Record<string, any> = {}) {
  await contactRepository.update(contact._id, { wa_start_chat: null })
  return
}

async function warningAboutChatsEnding(
  licensee: any,
  chatInbox: any,
  { contactRepository, messageRepository, createChatPlugin }: Record<string, any> = {},
) {
  if (licensee.useWhatsappWindow !== true) return

  const warningWindowStart = moment().subtract(WINDOW_HOURS, 'hours')
  const warningWindowEnd = moment(warningWindowStart).add(WARNING_MINUTES, 'minutes')

  const contacts = await contactRepository.find({
    licensee: licensee._id,
    wa_start_chat: {
      $ne: null,
      $gt: warningWindowStart.toDate(),
      $lte: warningWindowEnd.toDate(),
    },
  })

  for (const contact of contacts) {
    const messageToSend = await messageRepository.createMessageToWarnAboutWindowOfWhatsassIsEnding(contact, licensee)
    await sendMessageToChat(licensee, chatInbox, messageToSend, { createChatPlugin })
  }
}

async function warningAboutChatsExpired(
  licensee: any,
  chatInbox: any,
  { contactRepository, messageRepository, createChatPlugin }: Record<string, any> = {},
) {
  const contacts = await contactRepository.find({
    licensee: licensee._id,
    wa_start_chat: {
      $ne: null,
      $lte: moment().subtract(WINDOW_HOURS, 'hours').toDate(),
    },
  })

  for (const contact of contacts) {
    await clearWaStartChatOnContact(contact, { contactRepository })

    if (licensee.useWhatsappWindow === true) {
      const messageToSend = await messageRepository.createMessageToWarnAboutWindowOfWhatsassHasExpired(
        contact,
        licensee,
      )
      await sendMessageToChat(licensee, chatInbox, messageToSend, { createChatPlugin })
    }
  }
}

async function resetChats({
  licenseeRepository,
  inboxRepository,
  contactRepository,
  messageRepository,
  createChatPlugin,
}: Record<string, any> = {}) {
  const dialogInboxes = await inboxRepository.find({ whatsappDefault: 'dialog', kind: 'messenger' })

  for (const messengerInbox of dialogInboxes) {
    const licensee = await licenseeRepository.findFirst({ _id: messengerInbox.licensee, active: true, useWhatsappWindow: true })
    if (!licensee) continue

    const chatInbox = await inboxRepository.findFirst({ licensee: licensee._id, kind: 'chat' })
    if (!chatInbox) continue

    await warningAboutChatsEnding(licensee, chatInbox, { contactRepository, messageRepository, createChatPlugin })
    await warningAboutChatsExpired(licensee, chatInbox, { contactRepository, messageRepository, createChatPlugin })
  }
}

export { resetChats }

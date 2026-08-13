import moment from 'moment-timezone'
import { v4 as uuidv4 } from 'uuid'
import { sortRecords } from '../repositories/repository'

const ONE_HOUR = 1
const TO_MESSENGER = 'to-messenger'

async function getLastMessageOfContact(contactId: any, { messageRepository }: Record<string, any> = {}) {
  const messages = sortRecords(
    await messageRepository.find({
      contact: contactId,
      destination: TO_MESSENGER,
    }),
    { createdAt: 'desc' },
  )

  return messages[0]
}

function getTimeLimit() {
  return moment().tz('UTC').subtract(ONE_HOUR, 'hour')
}

async function sendMessageToMessegner(
  licensee: any,
  messengerInbox: any,
  contactId: any,
  text: any,
  { messageRepository, createMessengerPlugin }: Record<string, any> = {},
) {
  const messageToSend = await messageRepository.create({
    number: uuidv4(),
    text: text,
    kind: 'text',
    licensee: licensee._id,
    contact: contactId,
    destination: 'to-messenger',
  })

  const messegnerPlugin = createMessengerPlugin(licensee, { inbox: messengerInbox })
  await messegnerPlugin.sendMessage(messageToSend._id.toString(), messengerInbox.whatsappUrl, messengerInbox.whatsappToken)
}

async function resetChatbots({
  licenseeRepository,
  inboxRepository,
  contactRepository,
  messageRepository,
  createChatbotPlugin,
  createMessengerPlugin,
}: Record<string, any> = {}) {
  const licensees = await licenseeRepository.find({ useChatbot: true, chatbotApiToken: { $ne: null } })
  for (const licensee of licensees) {
    const messengerInbox = await inboxRepository.findFirst({ licensee: licensee._id, kind: 'messenger' })
    if (!messengerInbox) continue

    const contacts = (
      await contactRepository.find({
        licensee: licensee._id,
        talkingWithChatBot: true,
      })
    ).filter((contact: any) => contact.landbotId != null)

    for (const contact of contacts) {
      const message = await getLastMessageOfContact(contact._id, { messageRepository })

      if (!message) continue

      if (message.destination === TO_MESSENGER && message.createdAt < getTimeLimit() && message.sended === true) {
        const chatPlugin = createChatbotPlugin(licensee)

        await chatPlugin.dropConversation(contact._id.toString())

        contact.landbotId = null
        await contactRepository.save(contact)

        if (licensee.messageOnResetChatbot && licensee.messageOnResetChatbot !== '') {
          await sendMessageToMessegner(licensee, messengerInbox, contact._id, licensee.messageOnResetChatbot, {
            messageRepository,
            createMessengerPlugin,
          })
        }
      }
    }
  }
}

export { resetChatbots }

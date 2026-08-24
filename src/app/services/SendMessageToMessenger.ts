async function sendMessageToMessenger(
  data: any,
  {
    messageRepository,
    inboxRepository,
    licenseeRepository,
    contactRepository,
    createMessengerPlugin,
  }: Record<string, any> = {},
) {
  const { messageId, url, token } = data
  const message = await messageRepository.findFirst({ _id: messageId })
  if (!message) return
  if (message.ignored) return
  if (message.sended) return
  const [licensee, contact] = await Promise.all([
    licenseeRepository.findFirst({ _id: message.licensee }),
    message.contact ? contactRepository.findFirst({ _id: message.contact }) : null,
  ])
  if (!licensee) return

  if (contact?.type === 'web') {
    message.sended = true
    await messageRepository.save(message)
    return
  }

  const inbox = await inboxRepository.findFirst({ licensee: licensee._id, kind: 'messenger' })
  const extras: any = {}
  if (message.department) {
    extras.department = message.department
  }
  if (inbox) {
    extras.inbox = inbox
  }
  const messegnerPlugin = createMessengerPlugin(licensee, extras)

  await messegnerPlugin.sendMessage(messageId, url ?? inbox?.whatsappUrl, token ?? inbox?.whatsappToken)
}

export { sendMessageToMessenger }

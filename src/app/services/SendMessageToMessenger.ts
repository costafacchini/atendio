async function sendMessageToMessenger(
  data: any,
  { messageRepository, inboxRepository, createMessengerPlugin }: Record<string, any> = {},
) {
  const { messageId, url, token } = data
  const message = await messageRepository.findFirst({ _id: messageId }, ['licensee', 'contact'])
  const licensee = message.licensee

  if (message.contact?.type === 'web') {
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

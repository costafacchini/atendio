async function sendMessageToChat(
  data: any,
  { messageRepository, inboxRepository, licenseeRepository, createChatPlugin }: Record<string, any> = {},
) {
  const { messageId, url } = data
  const message = await messageRepository.findFirst({ _id: messageId })
  if (!message) return
  if (message.sended) return
  const licensee = await licenseeRepository.findFirst({ _id: message.licensee })
  if (!licensee) return

  const chatInbox = await inboxRepository.findFirst({ licensee: licensee._id, kind: 'chat' })
  const chatPlugin = createChatPlugin(licensee, { inbox: chatInbox })

  await chatPlugin.sendMessage(messageId, url)
}

export { sendMessageToChat }

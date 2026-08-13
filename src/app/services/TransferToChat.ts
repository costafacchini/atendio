async function transferToChat(
  data: any,
  { messageRepository, inboxRepository, createChatPlugin }: Record<string, any> = {},
) {
  const { messageId, url } = data
  const message = await messageRepository.findFirst({ _id: messageId }, ['licensee'])
  const licensee = message.licensee

  const chatInbox = await inboxRepository.findFirst({ licensee: licensee._id, kind: 'chat' })
  const chatPlugin = createChatPlugin(licensee, { inbox: chatInbox })

  await chatPlugin.transfer(messageId, url)
}

export { transferToChat }

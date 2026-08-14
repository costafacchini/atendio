async function closeChat(
  data: any,
  { messageRepository, inboxRepository, licenseeRepository, createChatPlugin }: Record<string, any> = {},
) {
  const { messageId } = data
  const message = await messageRepository.findFirst({ _id: messageId })
  if (!message) return []
  const licensee = await licenseeRepository.findFirst({ _id: message.licensee })
  if (!licensee) return []
  const actions: Record<string, any>[] = []

  const chatInbox = await inboxRepository.findFirst({ licensee: licensee._id, kind: 'chat' })
  if (!chatInbox) return actions

  const chatPlugin = createChatPlugin(licensee, { inbox: chatInbox })

  const messagesOnCloseChat = await chatPlugin.closeChat(messageId)

  if (messagesOnCloseChat.length > 0) {
    const messengerInbox = await inboxRepository.findFirst({ licensee: licensee._id, kind: 'messenger' })
    if (!messengerInbox) return actions

    for (const messageCloseChat of messagesOnCloseChat) {
      const contactId = message.contact?._id ?? message.contact

      const bodyToSend = {
        messageId: messageCloseChat._id,
        contactId,
        licenseeId: licensee._id,
        url: messengerInbox.whatsappUrl,
        token: messengerInbox.whatsappToken,
      }

      actions.push({
        action: 'send-message-to-messenger',
        body: bodyToSend,
      })
    }
  }

  return actions
}

export { closeChat }

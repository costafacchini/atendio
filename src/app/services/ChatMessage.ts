async function transformChatBody(
  data: any,
  { bodyRepository, contactRepository, messageRepository, createChatPlugin }: Record<string, any> = {},
) {
  const { bodyId } = data
  const body = await bodyRepository.findFirst({ _id: bodyId }, ['licensee', 'inbox'])
  if (!body) {
    return []
  }
  const licensee = body.licensee
  const inbox = body.inbox

  if (!inbox) {
    return []
  }

  const chatPlugin = createChatPlugin(licensee, { inbox })

  const actions = []
  const messages = await chatPlugin.responseToMessages(body.content)

  for (const message of messages) {
    if (licensee.useWhatsappWindow) {
      const messageDoesNotHaveSended = await contactRepository.contactWithWhatsappWindowClosed(message.contact._id)
      if (messageDoesNotHaveSended && message.kind !== 'template') {
        const messageToSend = await messageRepository.createMessageToWarnAboutWindowOfWhatsassHasExpired(
          message.contact,
          licensee,
        )

        const bodyToSend = {
          messageId: messageToSend._id,
          contactId: message.contact._id,
          licenseeId: licensee._id,
          url: inbox.chatUrl,
          token: '',
        }

        actions.push({
          action: 'send-message-to-chat',
          body: bodyToSend,
        })

        break
      }
    }

    const bodyToSend = {
      messageId: message._id,
      contactId: message.contact._id,
      licenseeId: licensee._id,
      url: inbox.whatsappUrl,
      token: inbox.whatsappToken,
    }

    actions.push({
      action: chatPlugin.action(body.content),
      body: bodyToSend,
    })
  }

  await bodyRepository.update({ _id: bodyId }, { concluded: true })

  return actions
}

export { transformChatBody }

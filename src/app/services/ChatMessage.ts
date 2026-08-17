async function transformChatBody(
  data: any,
  {
    bodyRepository,
    inboxRepository,
    licenseeRepository,
    contactRepository,
    messageRepository,
    createChatPlugin,
  }: Record<string, any> = {},
) {
  const { bodyId } = data
  const body = await bodyRepository.findFirst({ _id: bodyId })
  if (!body) {
    return []
  }

  const [licensee, inbox] = await Promise.all([
    licenseeRepository.findFirst({ _id: body.licensee }),
    body.inbox
      ? inboxRepository.findFirst({ _id: body.inbox })
      : inboxRepository.findFirst({ licensee: body.licensee, kind: 'chat' }),
  ])

  if (!inbox) {
    return []
  }

  const chatPlugin = createChatPlugin(licensee, { inbox })

  const actions = []
  const messages = await chatPlugin.responseToMessages(body.content)

  for (const message of messages) {
    if (licensee.useWhatsappWindow) {
      const contactId = (message.contact as any)?._id ?? String(message.contact)
      const messageDoesNotHaveSended = await contactRepository.contactWithWhatsappWindowClosed(contactId)
      if (messageDoesNotHaveSended && message.kind !== 'template') {
        const messageToSend = await messageRepository.createMessageToWarnAboutWindowOfWhatsassHasExpired(
          contactId,
          licensee,
        )

        const bodyToSend = {
          messageId: messageToSend._id,
          contactId,
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

    const contactId = (message.contact as any)?._id ?? String(message.contact)
    const bodyToSend = {
      messageId: message._id,
      contactId,
      licenseeId: licensee._id,
      kind: message.kind,
      url: inbox.whatsappUrl,
      token: inbox.whatsappToken,
    }

    actions.push({
      action: chatPlugin.action(body.content),
      body: bodyToSend,
    })
  }

  await bodyRepository.update(bodyId, { concluded: true })

  return actions
}

export { transformChatBody }

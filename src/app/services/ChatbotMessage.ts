async function transformChatbotBody(
  data: any,
  { bodyRepository, inboxRepository, licenseeRepository, createChatbotPlugin }: Record<string, any> = {},
) {
  const { bodyId } = data
  const body = await bodyRepository.findFirst({ _id: bodyId })
  if (!body) return []

  const [licensee, inbox] = await Promise.all([
    licenseeRepository.findFirst({ _id: body.licensee }),
    body.inbox ? inboxRepository.findFirst({ _id: body.inbox }) : null,
  ])

  if (!inbox) {
    return []
  }

  const chatbotPlugin = createChatbotPlugin(licensee)

  const actions = []
  const messages = await chatbotPlugin.responseToMessages(body.content)

  for (const message of messages) {
    const bodyToSend = {
      messageId: message._id,
      contactId: (message.contact as any)?._id ?? String(message.contact),
      licenseeId: licensee._id,
      url: inbox.whatsappUrl,
      token: inbox.whatsappToken,
    }

    actions.push({
      action: 'send-message-to-messenger',
      body: bodyToSend,
    })
  }

  await bodyRepository.update(bodyId, { concluded: true })

  return actions
}

export { transformChatbotBody }

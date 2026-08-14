async function transformChatbotTransferBody(
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
  const message = await chatbotPlugin.responseTransferToMessage(body.content)

  if (message) {
    const bodyToSend = {
      messageId: message._id,
      contactId: (message.contact as any)?._id ?? String(message.contact),
      licenseeId: licensee._id,
      url: inbox.chatUrl,
    }

    actions.push({
      action: 'transfer-to-chat',
      body: bodyToSend,
    })
  }

  await bodyRepository.update(bodyId, { concluded: true })

  return actions
}

export { transformChatbotTransferBody }

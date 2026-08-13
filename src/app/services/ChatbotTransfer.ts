async function transformChatbotTransferBody(
  data: any,
  { bodyRepository, createChatbotPlugin }: Record<string, any> = {},
) {
  const { bodyId } = data
  const body = await bodyRepository.findFirst({ _id: bodyId }, ['licensee', 'inbox'])
  const licensee = body.licensee
  const inbox = body.inbox

  if (!inbox) {
    return []
  }

  const chatbotPlugin = createChatbotPlugin(licensee)

  const actions = []
  const message = await chatbotPlugin.responseTransferToMessage(body.content)

  if (message) {
    const bodyToSend = {
      messageId: message._id,
      contactId: message.contact._id,
      licenseeId: licensee._id,
      url: inbox.chatUrl,
    }

    actions.push({
      action: 'transfer-to-chat',
      body: bodyToSend,
    })
  }

  await bodyRepository.update({ _id: bodyId }, { concluded: true })

  return actions
}

export { transformChatbotTransferBody }

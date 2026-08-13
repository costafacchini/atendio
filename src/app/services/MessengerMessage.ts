async function transformMessengerBody(data: any, { bodyRepository, createMessengerPlugin }: Record<string, any> = {}) {
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

  const departmentId = body.department ?? null
  const extras: any = { inbox }
  if (departmentId) {
    extras.department = departmentId
  }

  const messengerPlugin = createMessengerPlugin(licensee, extras)

  const actions = []
  const messages = await messengerPlugin.responseToMessages(body.content, { departmentId })

  for (const message of messages) {
    const action = messengerPlugin.action(message.destination)
    let url, token
    if (message.destination === 'to-chat') {
      url = inbox.chatUrl
      token = ''
    } else if (message.destination === 'to-messenger') {
      url = inbox.whatsappUrl
      token = inbox.whatsappToken
    } else {
      url = licensee.chatbotUrl
      token = licensee.chatbotAuthorizationToken
    }

    const bodyToSend = {
      messageId: message._id,
      contactId: message.contact._id,
      licenseeId: licensee._id,
      url,
      token,
    }

    actions.push({
      action,
      body: bodyToSend,
    })
  }

  await bodyRepository.update({ _id: bodyId }, { concluded: true })

  return actions
}

export { transformMessengerBody }

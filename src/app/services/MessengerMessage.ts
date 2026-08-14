async function transformMessengerBody(
  data: any,
  { bodyRepository, inboxRepository, licenseeRepository, createMessengerPlugin }: Record<string, any> = {},
) {
  const { bodyId } = data
  const body = await bodyRepository.findFirst({ _id: bodyId })
  if (!body) {
    return []
  }

  const [licensee, inbox] = await Promise.all([
    licenseeRepository.findFirst({ _id: body.licensee }),
    body.inbox ? inboxRepository.findFirst({ _id: body.inbox }) : null,
  ])

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
      contactId: (message.contact as any)?._id ?? String(message.contact),
      licenseeId: licensee._id,
      url,
      token,
    }

    actions.push({
      action,
      body: bodyToSend,
    })
  }

  await bodyRepository.update(bodyId, { concluded: true })

  return actions
}

export { transformMessengerBody }

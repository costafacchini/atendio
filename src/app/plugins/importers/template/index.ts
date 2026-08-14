class TemplatesImporter {
  licenseeId: any
  licenseeRepository: any
  inboxRepository: any
  templateRepository: any
  createMessengerPlugin: any

  constructor(
    licenseeId: any,
    {
      licenseeRepository,
      inboxRepository,
      templateRepository,
      createMessengerPlugin,
    }: { licenseeRepository?: any; inboxRepository?: any; templateRepository?: any; createMessengerPlugin?: any } = {},
  ) {
    this.licenseeId = licenseeId
    this.licenseeRepository = licenseeRepository
    this.inboxRepository = inboxRepository
    this.templateRepository = templateRepository
    this.createMessengerPlugin = createMessengerPlugin
  }

  async import() {
    const licensee = await this.licenseeRepository.findFirst({ _id: this.licenseeId })

    await this.templateRepository.delete({})

    if (!licensee) return

    const inbox = await this.inboxRepository.findFirst({ licensee: String(this.licenseeId), kind: 'messenger' })
    if (!inbox) return

    if (!['dialog', 'ycloud', 'pabbly'].includes(inbox.whatsappDefault)) {
      return
    }

    const messengerPlugin = this.createMessengerPlugin(licensee, { inbox })
    const templates = await messengerPlugin.searchTemplates(inbox.whatsappUrl, inbox.whatsappToken)

    for (const template of templates) {
      await this.templateRepository.create(template)
    }
  }
}

export { TemplatesImporter }

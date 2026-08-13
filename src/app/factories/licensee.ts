import { Factory } from 'fishery'

const licensee = Factory.define(({ sequence }) => ({
  name: 'Alcateia Ltds',
  active: true,
  licenseKind: 'demo',
  apiToken: sequence,
  useChatbot: false,
  chatbotDefault: '',
}))

const licenseeComplete = Factory.define(() => ({
  name: 'Alcateia Ltds',
  email: 'alcateia@alcateia.com',
  phone: '11098538273',
  active: true,
  licenseKind: 'demo',
  useChatbot: true,
  chatbotDefault: 'landbot',
  chatbotUrl: 'https://chatbot.url',
  chatbotAuthorizationToken: 'chat-bot-token',
}))

export { licensee, licenseeComplete }

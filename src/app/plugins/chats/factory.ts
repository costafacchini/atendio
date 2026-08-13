import { Rocketchat } from './Rocketchat'
import { Crisp } from './Crisp'
import { Cuboup } from './Cuboup'
import { Chatwoot } from './Chatwoot'
import { LocalChat } from './LocalChat'
import { IChatPlugin } from './Base'
import { ILicensee, IInbox } from '../../../types'

function createChatPlugin(
  licensee: ILicensee,
  dependencies: Record<string, unknown> = {},
  inbox: IInbox | null = null,
): IChatPlugin {
  const plugin = inbox?.chatDefault
  const deps = { ...dependencies, inbox }
  switch (plugin) {
    case 'rocketchat':
      return new Rocketchat(licensee, deps)
    case 'crisp':
      return new Crisp(licensee, deps)
    case 'cuboup':
      return new Cuboup(licensee, deps)
    case 'chatwoot':
      return new Chatwoot(licensee, deps)
    case 'local':
      return new LocalChat(licensee, deps)
    default:
      throw `Plugin de chat não configurado: ${plugin}`
  }
}

export { createChatPlugin }

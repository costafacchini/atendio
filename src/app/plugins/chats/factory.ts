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
  switch (plugin) {
    case 'rocketchat':
      return new Rocketchat(licensee, dependencies)
    case 'crisp':
      return new Crisp(licensee, dependencies)
    case 'cuboup':
      return new Cuboup(licensee, dependencies)
    case 'chatwoot':
      return new Chatwoot(licensee, dependencies)
    case 'local':
      return new LocalChat(licensee, dependencies)
    default:
      throw `Plugin de chat não configurado: ${plugin}`
  }
}

export { createChatPlugin }

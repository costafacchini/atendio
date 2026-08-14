import { createChatPlugin } from './factory'
import { Rocketchat } from './Rocketchat'
import { Cuboup } from './Cuboup'
import { Crisp } from './Crisp'
import { Chatwoot } from './Chatwoot'
import { licensee as licenseeFactory } from '@factories/licensee'

describe('createChatPlugin', () => {
  it('returns the rocketchat plugin if it is configured on inbox', () => {
    const licensee = licenseeFactory.build()

    const plugin = createChatPlugin(licensee, {}, { chatDefault: 'rocketchat' } as any)

    expect(plugin).toBeInstanceOf(Rocketchat)
  })

  it('returns the crisp plugin if it is configured on inbox', () => {
    const licensee = licenseeFactory.build()

    const plugin = createChatPlugin(licensee, {}, { chatDefault: 'crisp' } as any)

    expect(plugin).toBeInstanceOf(Crisp)
  })

  it('returns the chatwooty plugin if it is configured on inbox', () => {
    const licensee = licenseeFactory.build()

    const plugin = createChatPlugin(licensee, {}, { chatDefault: 'chatwoot' } as any)

    expect(plugin).toBeInstanceOf(Chatwoot)
  })

  it('returns the cuboup plugin if it is configured on inbox', () => {
    const licensee = licenseeFactory.build()

    const plugin = createChatPlugin(licensee, {}, { chatDefault: 'cuboup' } as any)

    expect(plugin).toBeInstanceOf(Cuboup)
  })

  it('throws if option plugin is unknow', () => {
    const licensee = licenseeFactory.build()

    expect(() => {
      createChatPlugin(licensee, {}, { chatDefault: 'something' } as any)
    }).toThrow('Plugin de chat não configurado: something')
  })
})

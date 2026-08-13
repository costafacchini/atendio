import { createMessengerPlugin } from './factory'
import { Utalk } from './Utalk'
import { Dialog } from './Dialog'
import { YCloud } from './YCloud'
import { Pabbly } from './Pabbly'
import { licensee as licenseeFactory } from '@factories/licensee'

describe('createMessengerPlugin', () => {
  it('returns the utalk plugin if it is configured on inbox', () => {
    const licensee = licenseeFactory.build()

    const plugin = createMessengerPlugin(licensee, {}, { whatsappDefault: 'utalk' } as any)

    expect(plugin).toBeInstanceOf(Utalk)
  })

  it('returns the dialog plugin if it is configured on inbox', () => {
    const licensee = licenseeFactory.build()

    const plugin = createMessengerPlugin(licensee, {}, { whatsappDefault: 'dialog' } as any)

    expect(plugin).toBeInstanceOf(Dialog)
  })

  it('returns the ycloud plugin if it is configured on inbox', () => {
    const licensee = licenseeFactory.build()

    const plugin = createMessengerPlugin(licensee, {}, { whatsappDefault: 'ycloud' } as any)

    expect(plugin).toBeInstanceOf(YCloud)
  })

  it('returns the pabbly plugin if it is configured on inbox', () => {
    const licensee = licenseeFactory.build()

    const plugin = createMessengerPlugin(licensee, {}, { whatsappDefault: 'pabbly' } as any)

    expect(plugin).toBeInstanceOf(Pabbly)
  })

  it('throws if option plugin is unknow', () => {
    const licensee = licenseeFactory.build()

    expect(() => {
      createMessengerPlugin(licensee, {}, { whatsappDefault: 'something' } as any)
    }).toThrow('Plugin de messenger não configurado: something')
  })
})

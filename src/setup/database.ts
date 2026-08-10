import { PrismaUserDatabaseRepository } from '../app/repositories/user'

const DEFAULT_USER = process.env.DEFAULT_USER
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD
const userRepository = new PrismaUserDatabaseRepository()

async function createDefaultUser() {
  try {
    const existingUser = await userRepository.findFirst({ email: DEFAULT_USER })
    if (existingUser) {
      return existingUser
    }

    try {
      return await userRepository.create({
        name: 'Default user',
        email: DEFAULT_USER,
        password: DEFAULT_PASSWORD,
        role: 'super',
      })
    } catch (err: any) {
      if (err?.code === 11000) {
        return await userRepository.findFirst({ email: DEFAULT_USER })
      }

      throw err
    }
  } catch (err: any) {
    throw new Error(`Não foi possível criar o usuário padrão. Erro: ${err}`, { cause: err })
  }
}

export { createDefaultUser }

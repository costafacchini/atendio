import express from 'express'
import { rateLimit } from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis'
import jwt from 'jsonwebtoken'
import { LoginController } from '../controllers/LoginController'
import { OnboardingController } from '../controllers/OnboardingController'
import { PrismaUserDatabaseRepository } from '../repositories/user'
import { PrismaLicenseeDatabaseRepository } from '../repositories/licensee'
import { PrismaInboxDatabaseRepository } from '../repositories/inbox'
import { AuthenticateUser } from '../usecases/auth/AuthenticateUser'
import { OnboardAccount } from '../usecases/onboarding/OnboardAccount'
import { redisConnection } from '../../config/redis'

const router = express.Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  store:
    process.env.NODE_ENV !== 'test'
      ? new RedisStore({
          sendCommand: (command, ...args) => redisConnection.call(command, ...args) as any,
          prefix: 'rl:login:',
        })
      : undefined,
})

const onboardingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Muitas tentativas de cadastro. Tente novamente em 1 hora.' },
  store:
    process.env.NODE_ENV !== 'test'
      ? new RedisStore({
          sendCommand: (command, ...args) => redisConnection.call(command, ...args) as any,
          prefix: 'rl:onboarding:',
        })
      : undefined,
})

const SECRET = process.env.SECRET
const userRepository = new PrismaUserDatabaseRepository()
const licenseeRepository = new PrismaLicenseeDatabaseRepository()
const inboxRepository = new PrismaInboxDatabaseRepository()
const tokenService = {
  sign: jwt.sign,
  secret: SECRET,
}
const authenticateUser = new AuthenticateUser({ userRepository, tokenService })
const loginController = new LoginController({ authenticateUser })

const onboardAccount = new OnboardAccount({ licenseeRepository, userRepository, inboxRepository })
const onboardingController = new OnboardingController({ onboardAccount })

router.post('/', loginLimiter, loginController.login)
router.post('/onboarding', onboardingLimiter, ...onboardingController.validations(), onboardingController.onboard)

export { router }

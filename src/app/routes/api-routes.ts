import express from 'express'
import v1Routes from './v1/v1-routes'
import { PrismaLicenseeDatabaseRepository } from '../repositories/licensee'
import { PrismaDepartmentDatabaseRepository } from '../repositories/department'
import { PrismaInboxDatabaseRepository } from '../repositories/inbox'
import { buildAuthenticateLicensee } from './authenticate-licensee'

export { buildAuthenticateLicensee }

const router = express.Router()
const licenseeRepository = new PrismaLicenseeDatabaseRepository()
const departmentRepository = new PrismaDepartmentDatabaseRepository()
const inboxRepository = new PrismaInboxDatabaseRepository()

router.use(buildAuthenticateLicensee({ licenseeRepository, departmentRepository, inboxRepository }))

router.use('/v1', v1Routes)

export default router

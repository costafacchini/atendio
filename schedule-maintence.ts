import 'dotenv/config'
import 'module-alias/register'
import moment from 'moment'

import { getPrismaClient } from './src/config/postgres'

async function schedule() {
  // Destroys bodies older than 3 days that are concluded, to avoid unbounded DB growth.
  // Scheduled to run every day at 3am.

  try {
    const threeDaysAgo = moment().subtract(3, 'days')
    const end = moment(threeDaysAgo).endOf('day')

    const prisma = getPrismaClient()
    const res = await prisma.body.deleteMany({
      where: {
        createdAt: { lt: end.toDate() },
        kind: 'normal',
        concluded: true,
      },
    })
    console.log(`Bodies concluded destroyed: ${res.count}`)
  } catch (err) {
    console.log(err)
  }
  process.exit()
}

schedule()

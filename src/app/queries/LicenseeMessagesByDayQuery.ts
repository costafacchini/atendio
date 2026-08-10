import moment from 'moment-timezone'
import { IQueryableRepository } from './QueryBuilder'
import { IRepository } from '@repositories/repository'
import { ILicensee, IMessage } from '../../types'

interface LicenseeMessagesByDayResult {
  _id: string
  name: string
  days: Array<{ date: string; count: number }>
}

class LicenseeMessagesByDayQuery {
  startDate: Date | string
  endDate: Date | string
  messageRepository: IQueryableRepository<IMessage> | undefined
  licenseeRepository: IRepository<ILicensee> | undefined
  licenseeClause: string | undefined

  constructor(
    startDate: Date | string,
    endDate: Date | string,
    {
      messageRepository,
      licenseeRepository,
    }: {
      messageRepository?: IQueryableRepository<IMessage>
      licenseeRepository?: IRepository<ILicensee>
    } = {},
  ) {
    this.startDate = startDate
    this.endDate = endDate
    this.messageRepository = messageRepository
    this.licenseeRepository = licenseeRepository
  }

  filterByLicensee(value: string) {
    this.licenseeClause = value
  }

  validateDates() {
    if (!this.startDate || !this.endDate) {
      throw new Error('startDate and endDate must be provided')
    }

    if (this.startDate > this.endDate) {
      throw new Error('startDate must be less than or equal to endDate')
    }
  }

  buildRange() {
    const cursor = moment.tz(this.startDate, 'UTC').startOf('day')
    const end = moment.tz(this.endDate, 'UTC').endOf('day')
    const days = []

    while (cursor.isSameOrBefore(end, 'day')) {
      days.push(cursor.format('YYYY-MM-DD'))
      cursor.add(1, 'day')
    }

    return days
  }

  buildAggregation() {
    const match: Record<string, any> = {
      createdAt: {
        $gte: this.startDate,
        $lte: this.endDate,
      },
    }

    if (this.licenseeClause) {
      match.licensee = this.licenseeClause.toString()
    }

    return [
      {
        $match: match,
      },
      {
        $group: {
          _id: {
            licensee: '$licensee',
            day: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
                timezone: 'UTC',
              },
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          '_id.licensee': 1,
          '_id.day': 1,
        },
      },
      {
        $group: {
          _id: '$_id.licensee',
          days: {
            $push: {
              date: '$_id.day',
              count: '$count',
            },
          },
        },
      },
    ]
  }

  async all(): Promise<LicenseeMessagesByDayResult[]> {
    this.validateDates()

    const aggregation = this.buildAggregation()
    const rawCounts = await this.messageRepository!.model().aggregate(aggregation)

    const mapDays = rawCounts.reduce((acc: Record<string, Array<{ date: string; count: number }>>, current: any) => {
      acc[current._id.toString()] = current.days
      return acc
    }, {})

    const licenseeFilter = this.licenseeClause ? { _id: this.licenseeClause } : {}
    const licensees = await this.licenseeRepository!.find(licenseeFilter)
    licensees.sort((left, right) => left.name.localeCompare(right.name))

    const range = this.buildRange()

    return licensees.map((licensee) => {
      const licenseeDays = mapDays[licensee._id.toString()] || []
      const normalized = licenseeDays.reduce(
        (acc: Record<string, number>, current: { date: string; count: number }) => {
          acc[current.date] = current.count
          return acc
        },
        {},
      )

      return {
        _id: licensee._id,
        name: licensee.name,
        days: range.map((day) => ({
          date: day,
          count: normalized[day] || 0,
        })),
      }
    })
  }
}

export { LicenseeMessagesByDayQuery }

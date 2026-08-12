import moment from 'moment-timezone'
import { IRepository } from '@repositories/repository'
import { ILicensee, IMessage } from '../../types'

interface LicenseeMessagesByDayResult {
  _id: string
  name: string
  days: Array<{ date: string; count: number }>
}

interface IMessageGroupRepository extends IRepository<IMessage> {
  groupByLicenseeAndDay(
    startDate: Date | string,
    endDate: Date | string,
    licenseeId?: string,
  ): Promise<{ _id: string; days: { date: string; count: number }[] }[]>
}

class LicenseeMessagesByDayQuery {
  startDate: Date | string
  endDate: Date | string
  messageRepository: IMessageGroupRepository | undefined
  licenseeRepository: IRepository<ILicensee> | undefined
  licenseeClause: string | undefined

  constructor(
    startDate: Date | string,
    endDate: Date | string,
    {
      messageRepository,
      licenseeRepository,
    }: {
      messageRepository?: IMessageGroupRepository
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

  async all(): Promise<LicenseeMessagesByDayResult[]> {
    this.validateDates()

    const rawCounts = await this.messageRepository!.groupByLicenseeAndDay(
      this.startDate,
      this.endDate,
      this.licenseeClause,
    )

    const mapDays = rawCounts.reduce((acc: Record<string, Array<{ date: string; count: number }>>, current) => {
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

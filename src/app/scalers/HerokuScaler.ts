import type { IScalerProvider } from './IScalerProvider'

const HEROKU_API = 'https://api.heroku.com'

interface HerokuScalerConfig {
  appName: string
  token: string
  workerTypes: string[]
}

class HerokuScaler implements IScalerProvider {
  private appName: string
  private workerTypes: string[]
  private headers: Record<string, string>

  constructor({ appName, token, workerTypes }: HerokuScalerConfig) {
    this.appName = appName
    this.workerTypes = workerTypes
    this.headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.heroku+json; version=3',
      'Content-Type': 'application/json',
    }
  }

  async getCurrentWorkerCount(): Promise<number> {
    let total = 0

    for (const type of this.workerTypes) {
      const url = `${HEROKU_API}/apps/${encodeURIComponent(this.appName)}/formation/${encodeURIComponent(type)}`
      const res = await fetch(url, { method: 'GET', headers: this.headers })
      const text = await res.text()

      if (!res.ok) {
        throw new Error(`Heroku GET formation ${type} error ${res.status}: ${text}`)
      }

      const data = JSON.parse(text)
      total += Number(data.quantity ?? 0)
    }

    return total
  }

  async setWorkerCount(target: number): Promise<void> {
    const updates = this.workerTypes.map((type, i) => {
      const quantity = i < target ? 1 : 0
      const url = `${HEROKU_API}/apps/${encodeURIComponent(this.appName)}/formation/${encodeURIComponent(type)}`

      return fetch(url, {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify({ quantity }),
      }).then(async (res) => {
        const text = await res.text()
        if (!res.ok) {
          throw new Error(`Heroku PATCH formation ${type} error ${res.status}: ${text}`)
        }
      })
    })

    await Promise.all(updates)
  }
}

export { HerokuScaler }
export type { HerokuScalerConfig }

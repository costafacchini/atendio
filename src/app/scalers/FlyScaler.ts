import type { IScalerProvider } from './IScalerProvider'

// Fly.io Machines REST API — https://fly.io/docs/machines/api/
const FLY_API = 'https://api.machines.dev/v1'

interface FlyScalerConfig {
  appName: string
  apiToken: string
  // Pre-created machine IDs dedicated to worker processes, in priority order.
  // Create them once with `flyctl machine create` and store the IDs here.
  workerMachineIds: string[]
}

interface FlyMachine {
  id: string
  state: 'started' | 'stopped' | 'created' | 'destroyed' | string
}

class FlyScaler implements IScalerProvider {
  private appName: string
  private machineIds: string[]
  private headers: Record<string, string>

  constructor({ appName, apiToken, workerMachineIds }: FlyScalerConfig) {
    this.appName = appName
    this.machineIds = workerMachineIds
    this.headers = {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    }
  }

  async getCurrentWorkerCount(): Promise<number> {
    const url = `${FLY_API}/apps/${encodeURIComponent(this.appName)}/machines`
    const res = await fetch(url, { method: 'GET', headers: this.headers })
    const text = await res.text()

    if (!res.ok) {
      throw new Error(`Fly GET machines error ${res.status}: ${text}`)
    }

    const machines: FlyMachine[] = JSON.parse(text)
    const workerSet = new Set(this.machineIds)

    return machines.filter((m) => workerSet.has(m.id) && m.state === 'started').length
  }

  async setWorkerCount(target: number): Promise<void> {
    const ops = this.machineIds.map((id, i) => {
      const action = i < target ? 'start' : 'stop'
      const url = `${FLY_API}/apps/${encodeURIComponent(this.appName)}/machines/${id}/${action}`

      return fetch(url, { method: 'POST', headers: this.headers }).then(async (res) => {
        const text = await res.text()
        if (!res.ok) {
          throw new Error(`Fly ${action} machine ${id} error ${res.status}: ${text}`)
        }
      })
    })

    await Promise.all(ops)
  }
}

export { FlyScaler }
export type { FlyScalerConfig }

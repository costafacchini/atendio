import { ECSClient, DescribeServicesCommand, UpdateServiceCommand } from '@aws-sdk/client-ecs'
import type { IScalerProvider } from './IScalerProvider'

interface ECSScalerConfig {
  cluster: string
  service: string
  region: string
}

class ECSScaler implements IScalerProvider {
  private client: ECSClient
  private cluster: string
  private service: string

  constructor({ cluster, service, region }: ECSScalerConfig) {
    this.cluster = cluster
    this.service = service
    this.client = new ECSClient({ region })
  }

  async getCurrentWorkerCount(): Promise<number> {
    const res = await this.client.send(new DescribeServicesCommand({ cluster: this.cluster, services: [this.service] }))

    const svc = res.services?.[0]
    if (!svc) {
      throw new Error(`ECS service "${this.service}" not found in cluster "${this.cluster}"`)
    }

    return svc.runningCount ?? 0
  }

  async setWorkerCount(target: number): Promise<void> {
    await this.client.send(
      new UpdateServiceCommand({
        cluster: this.cluster,
        service: this.service,
        desiredCount: target,
      }),
    )
  }
}

export { ECSScaler }
export type { ECSScalerConfig }

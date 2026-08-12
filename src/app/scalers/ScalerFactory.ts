import type { IScalerProvider } from './IScalerProvider'
import { HerokuScaler } from './HerokuScaler'
import { FlyScaler } from './FlyScaler'
import { ECSScaler } from './ECSScaler'
import { FakeScaler } from './FakeScaler'

type DeployProvider = 'heroku' | 'fly' | 'ecs' | 'fake'

function createScalerProvider(): IScalerProvider {
  const provider = process.env.DEPLOY_PROVIDER as DeployProvider | undefined

  switch (provider) {
    case 'heroku': {
      const { HEROKU_APP_NAME, HEROKU_TOKEN, WORKER_TYPES } = process.env
      if (!HEROKU_APP_NAME || !HEROKU_TOKEN || !WORKER_TYPES) {
        throw new Error('HerokuScaler requires env vars: HEROKU_APP_NAME, HEROKU_TOKEN, WORKER_TYPES')
      }
      const workerTypes = WORKER_TYPES.split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      return new HerokuScaler({ appName: HEROKU_APP_NAME, token: HEROKU_TOKEN, workerTypes })
    }

    case 'fly': {
      const { FLY_APP_NAME, FLY_API_TOKEN, FLY_WORKER_MACHINE_IDS } = process.env
      if (!FLY_APP_NAME || !FLY_API_TOKEN || !FLY_WORKER_MACHINE_IDS) {
        throw new Error('FlyScaler requires env vars: FLY_APP_NAME, FLY_API_TOKEN, FLY_WORKER_MACHINE_IDS')
      }
      const workerMachineIds = FLY_WORKER_MACHINE_IDS.split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      return new FlyScaler({ appName: FLY_APP_NAME, apiToken: FLY_API_TOKEN, workerMachineIds })
    }

    case 'ecs': {
      const { ECS_CLUSTER, ECS_SERVICE, AWS_DEFAULT_REGION } = process.env
      if (!ECS_CLUSTER || !ECS_SERVICE) {
        throw new Error('ECSScaler requires env vars: ECS_CLUSTER, ECS_SERVICE')
      }
      return new ECSScaler({
        cluster: ECS_CLUSTER,
        service: ECS_SERVICE,
        region: AWS_DEFAULT_REGION ?? 'us-east-1',
      })
    }

    default:
      return new FakeScaler()
  }
}

export { createScalerProvider }
export type { DeployProvider }

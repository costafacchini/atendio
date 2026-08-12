import type { IScalerProvider } from './IScalerProvider'
import { logger } from '../helpers/logger'

class FakeScaler implements IScalerProvider {
  getCurrentWorkerCount(): Promise<number> {
    return Promise.resolve(0)
  }

  setWorkerCount(target: number): Promise<void> {
    logger.info(`[FakeScaler] setWorkerCount(${target}) — no-op, no provider configured`)
    return Promise.resolve()
  }
}

export { FakeScaler }

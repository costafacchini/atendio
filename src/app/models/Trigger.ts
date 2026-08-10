// Stub: Mongoose has been removed. This shim delegates to the active RepositoryMemory
// so that spec files using Trigger.create(...) continue to work during test runs.
import { getActiveRepositories } from '@repositories/testing'

const Trigger = {
  create: async (fields: Record<string, any> = {}) => {
    return await getActiveRepositories().triggerRepository.create(fields)
  },
}

export default Trigger

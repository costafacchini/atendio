// Stub: Mongoose has been removed. This shim delegates to the active RepositoryMemory
// so that spec files using Body.create/findById continue to work during test runs.
import { getActiveRepositories, createMemoryModelAdapter } from '@repositories/testing'

const Body = {
  create: async (fields: Record<string, any> = {}) => {
    return await getActiveRepositories().bodyRepository.create(fields)
  },
  findById: (id: any) => {
    return createMemoryModelAdapter(getActiveRepositories().bodyRepository).findById(id)
  },
}

export default Body

// Stub: Mongoose has been removed. This shim delegates to the active RepositoryMemory
// so that spec files using Room.create/findById/findOne continue to work during test runs.
import { getActiveRepositories, createMemoryModelAdapter } from '@repositories/testing'

const Room = {
  create: async (fields: Record<string, any> = {}) => {
    return await getActiveRepositories().roomRepository.create(fields)
  },
  findById: (id: any) => {
    return createMemoryModelAdapter(getActiveRepositories().roomRepository).findById(id)
  },
  findOne: (params: Record<string, any> = {}) => {
    return createMemoryModelAdapter(getActiveRepositories().roomRepository).findOne(params)
  },
  where: (params: Record<string, any> = {}) => {
    return createMemoryModelAdapter(getActiveRepositories().roomRepository).where(params)
  },
}

export default Room

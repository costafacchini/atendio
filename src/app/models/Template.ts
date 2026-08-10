// Stub: Mongoose has been removed. This shim delegates to the active RepositoryMemory
// so that spec files using Template.create/findById/where continue to work during test runs.
import { getActiveRepositories, createMemoryModelAdapter } from '@repositories/testing'

const Template = {
  create: async (fields: Record<string, any> = {}) => {
    return await getActiveRepositories().templateRepository.create(fields)
  },
  findById: (id: any) => {
    return createMemoryModelAdapter(getActiveRepositories().templateRepository).findById(id)
  },
  where: (params: Record<string, any> = {}) => {
    return createMemoryModelAdapter(getActiveRepositories().templateRepository).where(params)
  },
}

export default Template

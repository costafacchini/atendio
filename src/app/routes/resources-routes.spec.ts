import request from 'supertest'
import express from 'express'
import jwt from 'jsonwebtoken'

jest.mock('../../config/queue', () => ({ queueServer: {} }))
jest.mock('../../config/redis', () => ({ redisConnection: {} }))
jest.mock('../plugins/storage/upload', () => ({ uploadFile: jest.fn() }))

// All stubs are defined inside the factory so they exist before the route module is imported.
// The userRepository object is shared by reference — tests mutate findFirst/find per case.
jest.mock('../runtime/dependencies', () => {
  const userRepository = {
    findFirst: jest.fn(),
    find: jest.fn(),
  }
  const deps = {
    userRepository,
    licenseeRepository: { findFirst: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn() },
    contactRepository: { findFirst: jest.fn(), find: jest.fn() },
    triggerRepository: { findFirst: jest.fn(), find: jest.fn() },
    templateRepository: { findFirst: jest.fn(), find: jest.fn() },
    messageRepository: { findFirst: jest.fn(), find: jest.fn() },
    roomRepository: { findFirst: jest.fn(), find: jest.fn() },
    whatsappSessionRepository: { findFirst: jest.fn() },
    createMessengerPlugin: jest.fn(),
    createTemplatesImporter: jest.fn(),
  }
  return {
    createRuntimeDependencies: jest.fn(() => deps),
  }
})

import { createRuntimeDependencies } from '../runtime/dependencies'
import { uploadFile } from '../plugins/storage/upload'
import resourcesRouter from './resources-routes'

// Extract the shared stubs object from the mock's first (and only) call result.
// The route module called createRuntimeDependencies() at import time.
const deps = createRuntimeDependencies.mock.results[0].value
const { userRepository, roomRepository, contactRepository } = deps

// Use the SECRET already loaded from .env by the test environment.
// The route module captures process.env.SECRET at import time, so we must use the same value.
const SECRET = process.env.SECRET

function signToken(payload) {
  return jwt.sign(payload, SECRET)
}

const app = express()
app.use(express.json())
app.use('/resources', resourcesRouter)

beforeEach(() => {
  jest.clearAllMocks()
  userRepository.find.mockResolvedValue([])
  deps.licenseeRepository.find.mockResolvedValue([])
})

describe('authenticate middleware', () => {
  it('returns 401 when no token header is provided', async () => {
    const res = await request(app).get('/resources/users')
    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ auth: false })
  })

  it('returns 401 (not 500) when the token is invalid or expired', async () => {
    const res = await request(app).get('/resources/users').set('x-access-token', 'bad.token.value')
    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ auth: false, message: 'Falha na autenticação com token.' })
  })
})

describe('requireSuper middleware — POST /users', () => {
  it('returns 403 when the authenticated user does not have super role', async () => {
    userRepository.findFirst.mockResolvedValue({ _id: 'uid-1', role: 'agent' })
    const token = signToken({ id: 'uid-1' })

    const res = await request(app).post('/resources/users').set('x-access-token', token).send({})

    expect(res.status).toBe(403)
    expect(res.body).toMatchObject({ message: 'Acesso negado.' })
  })

  it('returns 403 when the user is not found in the database', async () => {
    userRepository.findFirst.mockResolvedValue(null)
    const token = signToken({ id: 'ghost-id' })

    const res = await request(app).post('/resources/users').set('x-access-token', token).send({})

    expect(res.status).toBe(403)
    expect(res.body).toMatchObject({ message: 'Acesso negado.' })
  })

  it('passes requireSuper and reaches controller validation when user is super', async () => {
    userRepository.findFirst.mockResolvedValue({ _id: 'super-id', role: 'super' })
    const token = signToken({ id: 'super-id' })

    // Controller will reject an empty body — but NOT with 403
    const res = await request(app).post('/resources/users').set('x-access-token', token).send({})

    expect(res.status).not.toBe(403)
  })
})

describe('requireSuper middleware — POST /licensees', () => {
  it('returns 403 for non-super user on POST /licensees', async () => {
    userRepository.findFirst.mockResolvedValue({ _id: 'uid-2', role: 'agent' })
    const token = signToken({ id: 'uid-2' })

    const res = await request(app).post('/resources/licensees').set('x-access-token', token).send({})

    expect(res.status).toBe(403)
    expect(res.body).toMatchObject({ message: 'Acesso negado.' })
  })

  it('returns 403 for non-super user on POST /licensees/:id', async () => {
    userRepository.findFirst.mockResolvedValue({ _id: 'uid-3', role: 'agent' })
    const token = signToken({ id: 'uid-3' })

    const res = await request(app).post('/resources/licensees/some-id').set('x-access-token', token).send({})

    expect(res.status).toBe(403)
  })
})

describe('GET endpoints — accessible to admin users', () => {
  it('GET /resources/users is accessible to admin users', async () => {
    userRepository.findFirst.mockResolvedValue({ _id: 'uid-4', role: 'admin' })
    userRepository.find.mockResolvedValue([])
    const token = signToken({ id: 'uid-4' })

    const res = await request(app).get('/resources/users').set('x-access-token', token)

    expect(res.status).not.toBe(403)
  })

  it('GET /resources/licensees is accessible to admin users', async () => {
    userRepository.findFirst.mockResolvedValue({ _id: 'uid-5', role: 'admin' })
    const token = signToken({ id: 'uid-5' })

    const res = await request(app).get('/resources/licensees').set('x-access-token', token)

    expect(res.status).not.toBe(403)
  })
})

describe('POST /licensees/:id/baileys-sync', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).post('/resources/licensees/some-id/baileys-sync')

    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ auth: false })
  })

  it('is accessible to authenticated users and reaches the controller', async () => {
    userRepository.findFirst.mockResolvedValue({ _id: 'uid-6', role: 'agent' })
    deps.licenseeRepository.findFirst.mockResolvedValue(null)
    const token = signToken({ id: 'uid-6' })

    const res = await request(app).post('/resources/licensees/some-id/baileys-sync').set('x-access-token', token)

    expect(res.status).not.toBe(401)
    expect(res.status).not.toBe(403)
  })
})

describe('POST /rooms/:roomId/upload', () => {
  const token = signToken({ id: 'agent-1' })
  const openRoom = { _id: 'room-1', closed: false, contact: { _id: 'contact-1' } }

  beforeEach(() => {
    userRepository.findFirst.mockResolvedValue({ _id: 'agent-1', role: 'agent' })
    roomRepository.findFirst.mockResolvedValue(openRoom)
    contactRepository.findFirst.mockResolvedValue({ _id: 'contact-1', number: '5511999990000' })
    ;(uploadFile as jest.Mock).mockResolvedValue('http://localhost:5001/uploads/photo.jpg')
  })

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).post('/resources/rooms/room-1/upload').attach('file', Buffer.from('x'), 'photo.jpg')

    expect(res.status).toBe(401)
  })

  it('returns 422 when no file is attached', async () => {
    const res = await request(app).post('/resources/rooms/room-1/upload').set('x-access-token', token)

    expect(res.status).toBe(422)
  })

  it('returns 422 when the file extension is not accepted (S3)', async () => {
    const res = await request(app)
      .post('/resources/rooms/room-1/upload')
      .set('x-access-token', token)
      .attach('file', Buffer.from('binary'), 'malware.exe')

    expect(res.status).toBe(422)
    expect(uploadFile).not.toHaveBeenCalled()
  })

  it('returns 404 when the room is not found', async () => {
    roomRepository.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .post('/resources/rooms/room-1/upload')
      .set('x-access-token', token)
      .attach('file', Buffer.from('x'), 'photo.jpg')

    expect(res.status).toBe(404)
  })

  it('returns 404 when the room is closed', async () => {
    roomRepository.findFirst.mockResolvedValue({ ...openRoom, closed: true })

    const res = await request(app)
      .post('/resources/rooms/room-1/upload')
      .set('x-access-token', token)
      .attach('file', Buffer.from('x'), 'photo.jpg')

    expect(res.status).toBe(404)
  })

  it('uploads a valid file and returns { url, fileName } (S2)', async () => {
    const res = await request(app)
      .post('/resources/rooms/room-1/upload')
      .set('x-access-token', token)
      .attach('file', Buffer.from('fake-image-bytes'), 'photo.jpg')

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ url: 'http://localhost:5001/uploads/photo.jpg', fileName: 'photo.jpg' })
    expect(uploadFile).toHaveBeenCalledWith(expect.any(Buffer), 'photo.jpg', {
      _id: 'contact-1',
      number: '5511999990000',
    })
  })
})

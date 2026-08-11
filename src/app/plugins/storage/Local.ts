import fs from 'fs'
import path from 'path'
import { logger } from '../../helpers/logger'

const LOCAL_STORAGE_PATH = process.env.LOCAL_STORAGE_PATH ?? '/app/uploads'
const APP_URL = process.env.APP_URL ?? 'http://localhost:5001'

const getFilePath = (contactNumber: any, fileName: string) => {
  const date = new Date()
  const folder = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  return path.join(folder, String(contactNumber), fileName)
}

const base64ToBuffer = (fileBase64: string) => {
  let data = fileBase64
  if (data.indexOf(',') > -1) data = data.substr(data.indexOf(',') + 1)
  return Buffer.from(data, 'base64')
}

class LocalStorage {
  licensee: any
  contact: any
  fileName: string
  fileBase64: string
  _relativePath: string

  constructor(licensee: any, contact: any, fileName: string, fileBase64: string) {
    this.licensee = licensee
    this.contact = contact
    this.fileName = fileName
    this.fileBase64 = fileBase64
    this._relativePath = getFilePath(contact.number, fileName)
  }

  // eslint-disable-next-line require-await
  async uploadFile() {
    const fullPath = path.join(LOCAL_STORAGE_PATH, this._relativePath)
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    fs.writeFileSync(fullPath, base64ToBuffer(this.fileBase64))
    logger.info(`LocalStorage: arquivo salvo em ${fullPath}`)
  }

  // eslint-disable-next-line require-await
  async presignedUrl(): Promise<string> {
    return `${APP_URL}/uploads/${this._relativePath}`
  }
}

export { LocalStorage }

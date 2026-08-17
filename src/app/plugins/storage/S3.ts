import mime from 'mime-types'
import { logger } from '../../helpers/logger'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const getBucketPath = (number: any) => {
  const date = new Date()
  const folderDate = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`

  return folderDate + '/' + number + '/'
}

const base64ToBuffer = (fileBase64: any) => {
  let streamFileBase64 = fileBase64

  //O base64 da utalk tem umas informações do arquivo que deves ser removidas.
  // Essas informações vão até a ",".
  if (streamFileBase64.indexOf(',') > -1) {
    streamFileBase64 = streamFileBase64.substr(streamFileBase64.indexOf(',') + 1)
  }

  return Buffer.from(streamFileBase64, 'base64')
}

class S3 {
  licensee: any
  contact: any
  fileName: any
  fileBase64: any
  aws: any
  bucketName: any

  constructor(licensee: any, contact: any, fileName: any, fileBase64: any) {
    this.licensee = licensee
    this.contact = contact
    this.fileName = fileName
    this.fileBase64 = fileBase64

    this.aws = new S3Client({
      region: process.env.AWS_DEFAULT_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      },
      ...(process.env.AWS_ENDPOINT_URL && {
        endpoint: process.env.AWS_ENDPOINT_URL,
        forcePathStyle: true,
      }),
    })

    this.bucketName = process.env.AWS_BUCKET_NAME
  }

  async presignedUrl() {
    const fileFullPath = getBucketPath(this.contact.number) + this.fileName

    const command = new GetObjectCommand({ Bucket: this.bucketName, Key: fileFullPath })
    const fileURL = await getSignedUrl(this.aws, command, { expiresIn: 3600 })

    return fileURL.substr(0, fileURL.indexOf('?'))
  }

  async uploadFile() {
    const fileFullPath = getBucketPath(this.contact.number) + this.fileName
    const buffer = base64ToBuffer(this.fileBase64)

    const params: Record<string, any> = {
      Bucket: this.bucketName,
      Key: fileFullPath,
      Body: buffer,
      ACL: 'public-read',
      ContentType: mime.lookup(fileFullPath),
    }

    try {
      const results = await this.aws.send(new PutObjectCommand(params as any))
      logger.info(`AWS: Arquivo enviado para S3 com sucesso. ${results}`)

      return results
    } catch (error) {
      logger.error('AWS: Erro ao enviar arquivo para S3', error)
      throw new Error('Erro ao enviar arquivo para S3', { cause: error })
    }
  }
}

export { S3 }

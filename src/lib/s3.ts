import
{ 
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3'

export const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT,
  credentials:
  {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true, 
})

export async function uploadToS3(file: File)
{
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer) 

  const fileKey = `${Date.now()}-${file.name}`

  const request = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileKey,
    Body: buffer,
    ContentType: file.type,
  })

  try
  {
    await s3Client.send(request)
    console.log('Upload Successfully')
    return fileKey
  }
  catch(error)
  {
    console.error('S3 upload error', error)
    throw new Error('Failed to upload image to S3')
  }
}

export async function deleteFromS3(fileKey: string)
{
  const request = new DeleteObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileKey,
  })
  
  try
  {
    await s3Client.send(request)
    console.log('Delete Successfully')
  }
  catch(error)
  {
    console.error('S3 delete error', error)
    throw new Error('Failed to delete image from S3')
  }
}

export async function getFromS3(fileKey: string)
{
  const request = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileKey,
  })

  const respond = await s3Client.send(request)
  return respond
}
import { createHash, randomUUID } from 'node:crypto'

const cloudName = process.env.CLOUDINARY_CLOUD_NAME
const apiKey = process.env.CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET

const uploadFolders = {
  customer_avatar: 'mando/customers/avatar',
  restaurant_logo: 'mando/restaurants/logo',
  restaurant_cover: 'mando/restaurants/cover',
  menu_item_image: 'mando/restaurants/menu-items',
  combo_image: 'mando/combos',
  vendor_document: 'mando/vendors/documents',
} as const

export type CloudinaryUploadType = keyof typeof uploadFolders

export function getCloudinaryConfig() {
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Cloudinary config is missing. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to apps/api/.env.',
    )
  }

  return {
    cloudName,
    apiKey,
    apiSecret,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
  }
}

export function createCloudinaryUploadSignature(type: CloudinaryUploadType) {
  const config = getCloudinaryConfig()
  const timestamp = Math.floor(Date.now() / 1000)
  const folder = uploadFolders[type]
  const publicId = randomUUID()

  const paramsToSign = {
    folder,
    public_id: publicId,
    timestamp,
  }

  const signatureBase = Object.entries(paramsToSign)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  const signature = createHash('sha1')
    .update(`${signatureBase}${config.apiSecret}`)
    .digest('hex')

  return {
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    uploadUrl: config.uploadUrl,
    folder,
    publicId,
    timestamp,
    signature,
  }
}

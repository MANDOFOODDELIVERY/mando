import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'

import { getCurrentSessionContext } from '../auth/current-session.js'
import { serializeClearSessionCookie } from '../auth/index.js'
import {
  createCloudinaryUploadSignature,
  type CloudinaryUploadType,
} from '../config/cloudinary.js'

const uploadSignatureBodySchema = z.object({
  type: z.enum([
    'customer_avatar',
    'restaurant_logo',
    'restaurant_cover',
    'menu_item_image',
    'combo_image',
    'vendor_document',
  ]),
})

export async function uploadRoutes(app: FastifyInstance) {
  app.post('/signature', async (request, reply) => {
    const sessionContext = await getCurrentSessionContext(request.headers.cookie)

    if (!sessionContext) {
      return sendUnauthenticated(reply)
    }

    const parsedBody = uploadSignatureBodySchema.safeParse(request.body)

    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please choose a valid upload type.',
        issues: parsedBody.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      })
    }

    const type = parsedBody.data.type

    if (!canCreateUpload(type, sessionContext.authPayload.roles)) {
      return reply.status(403).send({
        error: 'upload_not_allowed',
        message: 'You are not allowed to upload this image.',
      })
    }

    try {
      return reply.status(200).send({
        upload: createCloudinaryUploadSignature(type),
      })
    } catch (error) {
      request.log.error(error)

      return reply.status(500).send({
        error: 'upload_signature_failed',
        message: 'Unable to prepare image upload. Please try again.',
      })
    }
  })
}

function canCreateUpload(type: CloudinaryUploadType, roles: string[]) {
  if (type === 'customer_avatar') return true

  return roles.includes('admin')
}

function sendUnauthenticated(reply: FastifyReply) {
  return reply
    .status(401)
    .header('Set-Cookie', serializeClearSessionCookie())
    .send({
      error: 'unauthenticated',
      message: 'Please log in to continue.',
    })
}

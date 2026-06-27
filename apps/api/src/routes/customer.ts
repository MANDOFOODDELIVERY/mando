import type { FastifyInstance, FastifyReply } from 'fastify'
import { and, asc, desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { getCurrentSessionContext } from '../auth/current-session.js'
import { serializeClearSessionCookie } from '../auth/index.js'
import { database } from '../db/client.js'
import { addresses, profiles, serviceAreas } from '../db/schema.js'

const updateProfileBodySchema = z
  .object({
    fullName: z.string().trim().min(1).max(120).optional(),
    phone: z.string().trim().min(1).max(40).nullable().optional(),
    birthday: z
      .string()
      .regex(/^(?:\d{4}-)?\d{2}-\d{2}$/, 'Birthday must include a valid month and day.')
      .refine(isValidBirthdayInput, 'Birthday must be a real month and day.')
      .nullable()
      .optional(),
    avatarUrl: z.url().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one profile field to update.',
  })

const addressParamsSchema = z.object({
  addressId: z.uuid(),
})

const addressBodySchema = z.object({
  serviceAreaId: z.uuid(),
  label: z.string().trim().min(1).max(60).default('Home'),
  streetAddress: z.string().trim().min(3).max(240),
  landmark: z.string().trim().max(160).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  isDefault: z.boolean().optional(),
})

const updateAddressBodySchema = addressBodySchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: 'Provide at least one address field to update.',
  },
)

const MAX_CUSTOMER_ADDRESSES = 3

type ProfileUpdateValues = {
  fullName?: string
  phone?: string | null
  birthday?: string | null
  avatarUrl?: string | null
  updatedAt: Date
}

type AddressUpdateValues = {
  serviceAreaId?: string
  label?: string
  streetAddress?: string
  landmark?: string | null
  latitude?: number | null
  longitude?: number | null
  updatedAt: Date
}

export async function customerRoutes(app: FastifyInstance) {
  app.get('/service-areas', async (_request, reply) => {
    const activeServiceAreas = await database
      .select({
        id: serviceAreas.id,
        name: serviceAreas.name,
        city: serviceAreas.city,
        state: serviceAreas.state,
      })
      .from(serviceAreas)
      .where(eq(serviceAreas.isActive, true))
      .orderBy(asc(serviceAreas.name), asc(serviceAreas.city))

    return reply.status(200).send({
      serviceAreas: activeServiceAreas,
    })
  })

  app.patch('/profile', async (request, reply) => {
    const sessionContext = await getCurrentSessionContext(request.headers.cookie)

    if (!sessionContext) {
      return sendUnauthenticated(reply)
    }

    const parsedBody = updateProfileBodySchema.safeParse(request.body)

    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please check the profile details and try again.',
        issues: parsedBody.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      })
    }

    const updates = parsedBody.data
    const values: ProfileUpdateValues = {
      updatedAt: new Date(),
    }

    if (updates.fullName !== undefined) {
      values.fullName = updates.fullName
    }

    if (updates.phone !== undefined) {
      values.phone = updates.phone
    }

    if (updates.birthday !== undefined) {
      values.birthday =
        updates.birthday && updates.birthday.length === 5
          ? `2000-${updates.birthday}`
          : updates.birthday
    }

    if (updates.avatarUrl !== undefined) {
      values.avatarUrl = updates.avatarUrl
    }

    const [updatedProfile] = await database
      .update(profiles)
      .set(values)
      .where(eq(profiles.userId, sessionContext.userId))
      .returning({
        fullName: profiles.fullName,
        phone: profiles.phone,
        birthday: profiles.birthday,
        avatarUrl: profiles.avatarUrl,
      })

    return reply.status(200).send({
      user: sessionContext.authPayload.user,
      profile: updatedProfile,
      roles: sessionContext.authPayload.roles,
    })
  })

  app.get('/addresses', async (request, reply) => {
    const sessionContext = await getCurrentSessionContext(request.headers.cookie)

    if (!sessionContext) {
      return sendUnauthenticated(reply)
    }

    const userAddresses = await selectUserAddresses(sessionContext.userId)

    return reply.status(200).send({
      addresses: userAddresses,
    })
  })

  app.post('/addresses', async (request, reply) => {
    const sessionContext = await getCurrentSessionContext(request.headers.cookie)

    if (!sessionContext) {
      return sendUnauthenticated(reply)
    }

    const parsedBody = addressBodySchema.safeParse(request.body)

    if (!parsedBody.success) {
      return sendValidationError(reply, 'Please check the address details and try again.', parsedBody.error.issues)
    }

    const body = parsedBody.data
    const serviceArea = await getActiveServiceArea(body.serviceAreaId)

    if (!serviceArea) {
      return reply.status(400).send({
        error: 'invalid_service_area',
        message: 'Please choose a valid delivery location.',
      })
    }

    const [existingAddress] = await database
      .select({ id: addresses.id })
      .from(addresses)
      .where(eq(addresses.userId, sessionContext.userId))
      .limit(1)

    const existingAddresses = await database
      .select({ id: addresses.id })
      .from(addresses)
      .where(eq(addresses.userId, sessionContext.userId))
      .limit(MAX_CUSTOMER_ADDRESSES)

    if (existingAddresses.length >= MAX_CUSTOMER_ADDRESSES) {
      return reply.status(409).send({
        error: 'address_limit_reached',
        message: 'You can save up to 3 delivery addresses.',
      })
    }

    const shouldBeDefault = body.isDefault ?? !existingAddress

    const createdAddress = await database.transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx
          .update(addresses)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(addresses.userId, sessionContext.userId))
      }

      const [address] = await tx
        .insert(addresses)
        .values({
          userId: sessionContext.userId,
          serviceAreaId: body.serviceAreaId,
          label: body.label,
          streetAddress: body.streetAddress,
          landmark: body.landmark ?? null,
          latitude: body.latitude ?? null,
          longitude: body.longitude ?? null,
          isDefault: shouldBeDefault,
        })
        .returning(addressReturnColumns)

      return address
    })

    return reply.status(201).send({
      address: createdAddress,
    })
  })

  app.patch('/addresses/:addressId', async (request, reply) => {
    const sessionContext = await getCurrentSessionContext(request.headers.cookie)

    if (!sessionContext) {
      return sendUnauthenticated(reply)
    }

    const parsedParams = addressParamsSchema.safeParse(request.params)

    if (!parsedParams.success) {
      return sendValidationError(reply, 'Please choose a valid address.', parsedParams.error.issues)
    }

    const parsedBody = updateAddressBodySchema.safeParse(request.body)

    if (!parsedBody.success) {
      return sendValidationError(reply, 'Please check the address details and try again.', parsedBody.error.issues)
    }

    const existingAddress = await getUserAddress(
      sessionContext.userId,
      parsedParams.data.addressId,
    )

    if (!existingAddress) {
      return sendAddressNotFound(reply)
    }

    const updates = parsedBody.data

    if (updates.serviceAreaId !== undefined) {
      const serviceArea = await getActiveServiceArea(updates.serviceAreaId)

      if (!serviceArea) {
        return reply.status(400).send({
          error: 'invalid_service_area',
          message: 'Please choose a valid delivery location.',
        })
      }
    }

    const values: AddressUpdateValues = {
      updatedAt: new Date(),
    }

    if (updates.serviceAreaId !== undefined) values.serviceAreaId = updates.serviceAreaId
    if (updates.label !== undefined) values.label = updates.label
    if (updates.streetAddress !== undefined) values.streetAddress = updates.streetAddress
    if (updates.landmark !== undefined) values.landmark = updates.landmark
    if (updates.latitude !== undefined) values.latitude = updates.latitude
    if (updates.longitude !== undefined) values.longitude = updates.longitude

    const updatedAddress = await database.transaction(async (tx) => {
      if (updates.isDefault) {
        await tx
          .update(addresses)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(addresses.userId, sessionContext.userId))
      }

      const [address] = await tx
        .update(addresses)
        .set({
          ...values,
          ...(updates.isDefault !== undefined
            ? { isDefault: updates.isDefault }
            : {}),
        })
        .where(
          and(
            eq(addresses.id, parsedParams.data.addressId),
            eq(addresses.userId, sessionContext.userId),
          ),
        )
        .returning(addressReturnColumns)

      return address
    })

    return reply.status(200).send({
      address: updatedAddress,
    })
  })

  app.post('/addresses/:addressId/default', async (request, reply) => {
    const sessionContext = await getCurrentSessionContext(request.headers.cookie)

    if (!sessionContext) {
      return sendUnauthenticated(reply)
    }

    const parsedParams = addressParamsSchema.safeParse(request.params)

    if (!parsedParams.success) {
      return sendValidationError(reply, 'Please choose a valid address.', parsedParams.error.issues)
    }

    const existingAddress = await getUserAddress(
      sessionContext.userId,
      parsedParams.data.addressId,
    )

    if (!existingAddress) {
      return sendAddressNotFound(reply)
    }

    const updatedAddress = await database.transaction(async (tx) => {
      await tx
        .update(addresses)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(addresses.userId, sessionContext.userId))

      const [address] = await tx
        .update(addresses)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(
          and(
            eq(addresses.id, parsedParams.data.addressId),
            eq(addresses.userId, sessionContext.userId),
          ),
        )
        .returning(addressReturnColumns)

      return address
    })

    return reply.status(200).send({
      address: updatedAddress,
    })
  })

  app.delete('/addresses/:addressId', async (request, reply) => {
    const sessionContext = await getCurrentSessionContext(request.headers.cookie)

    if (!sessionContext) {
      return sendUnauthenticated(reply)
    }

    const parsedParams = addressParamsSchema.safeParse(request.params)

    if (!parsedParams.success) {
      return sendValidationError(reply, 'Please choose a valid address.', parsedParams.error.issues)
    }

    const existingAddress = await getUserAddress(
      sessionContext.userId,
      parsedParams.data.addressId,
    )

    if (!existingAddress) {
      return sendAddressNotFound(reply)
    }

    await database.transaction(async (tx) => {
      await tx
        .delete(addresses)
        .where(
          and(
            eq(addresses.id, parsedParams.data.addressId),
            eq(addresses.userId, sessionContext.userId),
          ),
        )

      if (existingAddress.isDefault) {
        const [nextAddress] = await tx
          .select({ id: addresses.id })
          .from(addresses)
          .where(eq(addresses.userId, sessionContext.userId))
          .orderBy(asc(addresses.createdAt))
          .limit(1)

        if (nextAddress) {
          await tx
            .update(addresses)
            .set({ isDefault: true, updatedAt: new Date() })
            .where(eq(addresses.id, nextAddress.id))
        }
      }
    })

    return reply.status(204).send()
  })
}

const addressReturnColumns = {
  id: addresses.id,
  serviceAreaId: addresses.serviceAreaId,
  label: addresses.label,
  streetAddress: addresses.streetAddress,
  landmark: addresses.landmark,
  latitude: addresses.latitude,
  longitude: addresses.longitude,
  isDefault: addresses.isDefault,
  createdAt: addresses.createdAt,
  updatedAt: addresses.updatedAt,
}

function selectUserAddresses(userId: string) {
  return database
    .select({
      ...addressReturnColumns,
      serviceArea: {
        id: serviceAreas.id,
        name: serviceAreas.name,
        city: serviceAreas.city,
        state: serviceAreas.state,
      },
    })
    .from(addresses)
    .innerJoin(serviceAreas, eq(addresses.serviceAreaId, serviceAreas.id))
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isDefault), asc(addresses.createdAt))
}

async function getUserAddress(userId: string, addressId: string) {
  const [address] = await database
    .select({
      id: addresses.id,
      isDefault: addresses.isDefault,
    })
    .from(addresses)
    .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
    .limit(1)

  return address
}

async function getActiveServiceArea(serviceAreaId: string) {
  const [serviceArea] = await database
    .select({ id: serviceAreas.id })
    .from(serviceAreas)
    .where(
      and(
        eq(serviceAreas.id, serviceAreaId),
        eq(serviceAreas.isActive, true),
      ),
    )
    .limit(1)

  return serviceArea
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

function sendValidationError(
  reply: FastifyReply,
  message: string,
  issues: z.core.$ZodIssue[],
) {
  return reply.status(400).send({
    error: 'validation_error',
    message,
    issues: issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  })
}

function sendAddressNotFound(reply: FastifyReply) {
  return reply.status(404).send({
    error: 'address_not_found',
    message: 'Address not found.',
  })
}

function isValidBirthdayInput(value: string) {
  const normalizedValue = value.length === 5 ? `2000-${value}` : value
  const match = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (!match) return false

  const month = Number(match[2])
  const day = Number(match[3])
  const parsedDate = new Date(Date.UTC(2000, month - 1, day))

  return (
    parsedDate.getUTCFullYear() === 2000 &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day
  )
}

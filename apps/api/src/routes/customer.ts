import type { FastifyInstance, FastifyReply } from 'fastify'
import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

import { getCurrentSessionContext } from '../auth/current-session.js'
import { serializeClearSessionCookie } from '../auth/index.js'
import { database } from '../db/client.js'
import {
  addresses,
  comboItems,
  combos,
  deliveries,
  menuItems,
  notifications,
  orderItemComponents,
  orderItems,
  orderIssues,
  orderReviews,
  orders,
  orderStatusEvents,
  payments,
  profiles,
  restaurants,
  serviceAreas,
} from '../db/schema.js'

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

const createOrderBodySchema = z.object({
  addressId: z.uuid().optional(),
  paymentMethod: z
    .enum(['bank_transfer', 'card', 'bank', 'ussd', 'wallet'])
    .default('card'),
  customerNote: z.string().trim().max(500).nullable().optional(),
  items: z
    .array(
      z.object({
        comboId: z.uuid(),
        quantity: z.number().int().min(1).max(20),
        components: z
          .array(
            z.object({
              menuItemId: z.uuid(),
              quantity: z.number().int().min(0).max(50),
            }),
          )
          .optional(),
      }),
    )
    .min(1)
    .max(25),
})

const orderParamsSchema = z.object({
  orderId: z.uuid(),
})

const reportOrderBodySchema = z.object({
  reason: z.string().trim().min(5).max(600),
})

const notificationParamsSchema = z.object({
  notificationId: z.uuid(),
})

const reviewOrderBodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(600).nullable().optional(),
})

const MAX_CUSTOMER_ADDRESSES = 3
const CUSTOMER_CANCELLABLE_ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'awaiting_restaurant',
] as const

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

  app.get('/notifications', async (request, reply) => {
    const sessionContext = await getCurrentSessionContext(request.headers.cookie)

    if (!sessionContext) {
      return sendUnauthenticated(reply)
    }

    const userNotifications = await database
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        body: notifications.body,
        data: notifications.data,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.userId, sessionContext.userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50)

    return reply.status(200).send({
      notifications: userNotifications,
      unreadCount: userNotifications.filter((notification) => !notification.readAt).length,
    })
  })

  app.patch('/notifications/:notificationId/read', async (request, reply) => {
    const sessionContext = await getCurrentSessionContext(request.headers.cookie)

    if (!sessionContext) {
      return sendUnauthenticated(reply)
    }

    const parsedParams = notificationParamsSchema.safeParse(request.params)

    if (!parsedParams.success) {
      return sendValidationError(reply, 'Please choose a valid notification.', parsedParams.error.issues)
    }

    const [notification] = await database
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.id, parsedParams.data.notificationId),
          eq(notifications.userId, sessionContext.userId),
        ),
      )
      .returning({
        id: notifications.id,
        readAt: notifications.readAt,
      })

    if (!notification) {
      return reply.status(404).send({
        error: 'notification_not_found',
        message: 'Notification not found.',
      })
    }

    return reply.status(200).send({ notification })
  })

  app.post('/notifications/read-all', async (request, reply) => {
    const sessionContext = await getCurrentSessionContext(request.headers.cookie)

    if (!sessionContext) {
      return sendUnauthenticated(reply)
    }

    await database
      .update(notifications)
      .set({ readAt: new Date() })
      .where(eq(notifications.userId, sessionContext.userId))

    return reply.status(204).send()
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

  app.post('/orders', async (request, reply) => {
    const sessionContext = await getCurrentSessionContext(request.headers.cookie)

    if (!sessionContext) {
      return sendUnauthenticated(reply)
    }

    const parsedBody = createOrderBodySchema.safeParse(request.body)

    if (!parsedBody.success) {
      return sendValidationError(reply, 'Please check your order details and try again.', parsedBody.error.issues)
    }

    const profile = sessionContext.authPayload.profile

    if (!profile?.phone) {
      return reply.status(409).send({
        error: 'missing_phone_number',
        message: 'Please add your phone number before placing an order.',
      })
    }

    const deliveryRecipientName = profile.fullName
    const deliveryPhone = profile.phone

    const body = parsedBody.data
    const deliveryAddress = body.addressId
      ? await getUserAddressDetails(sessionContext.userId, body.addressId)
      : await getDefaultUserAddressDetails(sessionContext.userId)

    if (!deliveryAddress) {
      return reply.status(409).send({
        error: 'missing_delivery_address',
        message: 'Please add a delivery address before placing an order.',
      })
    }

    const requestedComboIds = Array.from(
      new Set(body.items.map((item) => item.comboId)),
    )
    const comboRows = await getAvailableCombos(requestedComboIds)

    if (comboRows.length !== requestedComboIds.length) {
      return reply.status(400).send({
        error: 'invalid_order_item',
        message: 'One or more combos are unavailable. Please refresh your cart.',
      })
    }

    const restaurantIds = new Set(comboRows.map((combo) => combo.restaurantId))

    if (restaurantIds.size > 1) {
      return reply.status(400).send({
        error: 'multiple_restaurants_not_supported',
        message: 'Please place orders from one restaurant at a time.',
      })
    }

    const restaurantId = Array.from(restaurantIds)[0]

    if (!restaurantId) {
      return reply.status(400).send({
        error: 'invalid_order_item',
        message: 'One or more combos are unavailable. Please refresh your cart.',
      })
    }
    const comboById = new Map(comboRows.map((combo) => [combo.id, combo]))
    const componentRows = await getComboComponents(requestedComboIds)
    const componentsByComboId = groupComponentsByComboId(componentRows)
    const componentOverrideError = validateComponentOverrides(
      body.items,
      componentsByComboId,
    )

    if (componentOverrideError) {
      return reply.status(400).send(componentOverrideError)
    }

    const normalizedItems = body.items.map((item) => {
      const combo = comboById.get(item.comboId)

      if (!combo) {
        throw new Error('Combo lookup failed after availability validation.')
      }

      const baseComponents = componentsByComboId.get(combo.id) ?? []
      const componentOverrides = new Map(
        item.components?.map((component) => [
          component.menuItemId,
          component.quantity,
        ]) ?? [],
      )
      const components = baseComponents
        .map((component) => {
          const quantity = componentOverrides.get(component.menuItemId)
            ?? component.quantity

          return {
            ...component,
            quantity,
            lineTotalAmount: component.priceAmount * quantity * item.quantity,
          }
        })
        .filter((component) => component.quantity > 0)
      const unitPriceAmount = item.components
        ? components.reduce(
            (total, component) =>
              total + component.priceAmount * component.quantity,
            0,
          )
        : combo.priceAmount

      return {
        combo,
        quantity: item.quantity,
        unitPriceAmount,
        lineTotalAmount: unitPriceAmount * item.quantity,
        components,
      }
    })

    const subtotalAmount = normalizedItems.reduce(
      (total, item) => total + item.lineTotalAmount,
      0,
    )
    const deliveryFeeAmount = 0
    const discountAmount = 0
    const totalAmount = subtotalAmount + deliveryFeeAmount - discountAmount

    const createdOrder = await database.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          orderNumber: generateOrderNumber(),
          customerId: sessionContext.userId,
          restaurantId,
          addressId: deliveryAddress.id,
          deliveryRecipientName,
          deliveryPhone,
          deliveryStreetAddress: deliveryAddress.streetAddress,
          deliveryServiceArea: deliveryAddress.serviceArea.name,
          ...(deliveryAddress.landmark
            ? { deliveryLandmark: deliveryAddress.landmark }
            : {}),
          status: 'pending_payment',
          subtotalAmount,
          deliveryFeeAmount,
          discountAmount,
          totalAmount,
          ...(body.customerNote ? { customerNote: body.customerNote } : {}),
          placedAt: new Date(),
        })
        .returning({
          id: orders.id,
          orderNumber: orders.orderNumber,
          status: orders.status,
          totalAmount: orders.totalAmount,
          currency: orders.currency,
          createdAt: orders.createdAt,
        })

      for (const item of normalizedItems) {
        const [orderItem] = await tx
          .insert(orderItems)
          .values({
            orderId: order.id,
            comboId: item.combo.id,
            itemName: item.combo.name,
            unitPriceAmount: item.unitPriceAmount,
            quantity: item.quantity,
            lineTotalAmount: item.lineTotalAmount,
          })
          .returning({ id: orderItems.id })

        if (item.components.length > 0) {
          await tx.insert(orderItemComponents).values(
            item.components.map((component) => ({
              orderItemId: orderItem.id,
              menuItemId: component.menuItemId,
              itemName: component.name,
              unitPriceAmount: component.priceAmount,
              quantity: component.quantity * item.quantity,
              lineTotalAmount: component.lineTotalAmount,
            })),
          )
        }
      }

      await tx.insert(payments).values({
        orderId: order.id,
        method: body.paymentMethod,
        provider: body.paymentMethod === 'card' ? 'routepay' : null,
        amount: totalAmount,
        status: 'pending',
      })

      await tx.insert(deliveries).values({
        orderId: order.id,
        serviceAreaId: deliveryAddress.serviceArea.id,
        deliveryFeeAmount,
      })

      await tx.insert(orderStatusEvents).values({
        orderId: order.id,
        status: 'pending_payment',
        actorUserId: sessionContext.userId,
        note: 'Order created and awaiting payment.',
      })

      await tx.insert(notifications).values({
        userId: sessionContext.userId,
        type: 'order_created',
        title: 'Order created',
        body: `Order ${order.orderNumber} has been created and is awaiting payment confirmation.`,
        data: { orderId: order.id, orderNumber: order.orderNumber },
      })

      return order
    })

    return reply.status(201).send({
      order: createdOrder,
    })
  })

  app.get('/orders', async (request, reply) => {
    const sessionContext = await getCurrentSessionContext(request.headers.cookie)

    if (!sessionContext) {
      return sendUnauthenticated(reply)
    }

    const orderRows = await selectCustomerOrderSummaries(sessionContext.userId)

    return reply.status(200).send({
      orders: orderRows.map(serializeOrderSummary),
    })
  })

  app.get('/orders/:orderId', async (request, reply) => {
    const sessionContext = await getCurrentSessionContext(request.headers.cookie)

    if (!sessionContext) {
      return sendUnauthenticated(reply)
    }

    const parsedParams = orderParamsSchema.safeParse(request.params)

    if (!parsedParams.success) {
      return sendValidationError(reply, 'Please choose a valid order.', parsedParams.error.issues)
    }

    const order = await getCustomerOrder(sessionContext.userId, parsedParams.data.orderId)

    if (!order) {
      return sendOrderNotFound(reply)
    }

    const [items, components, timeline, issues, paymentRows, review] = await Promise.all([
      selectOrderItems(order.id),
      selectOrderItemComponents(order.id),
      selectOrderTimeline(order.id),
      selectOrderIssues(order.id),
      selectOrderPayments(order.id),
      selectOrderReview(order.id),
    ])

    return reply.status(200).send({
      order: serializeOrderDetail(order, items, components, timeline, issues, paymentRows, review),
    })
  })

  app.post('/orders/:orderId/cancel', async (request, reply) => {
    const sessionContext = await getCurrentSessionContext(request.headers.cookie)

    if (!sessionContext) {
      return sendUnauthenticated(reply)
    }

    const parsedParams = orderParamsSchema.safeParse(request.params)

    if (!parsedParams.success) {
      return sendValidationError(reply, 'Please choose a valid order.', parsedParams.error.issues)
    }

    const order = await getCustomerOrder(sessionContext.userId, parsedParams.data.orderId)

    if (!order) {
      return sendOrderNotFound(reply)
    }

    if (!isCustomerCancellableOrderStatus(order.status)) {
      return reply.status(409).send({
        error: 'order_not_cancellable',
        message: 'This order can no longer be cancelled. Please report an issue instead.',
      })
    }

    const cancelledOrder = await database.transaction(async (tx) => {
      const [updatedOrder] = await tx
        .update(orders)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(
          and(
            eq(orders.id, order.id),
            eq(orders.customerId, sessionContext.userId),
          ),
        )
        .returning({
          id: orders.id,
          orderNumber: orders.orderNumber,
          status: orders.status,
          totalAmount: orders.totalAmount,
          currency: orders.currency,
          createdAt: orders.createdAt,
          placedAt: orders.placedAt,
        })

      await tx
        .update(payments)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(payments.orderId, order.id))

      await tx
        .update(deliveries)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(deliveries.orderId, order.id))

      await tx.insert(orderStatusEvents).values({
        orderId: order.id,
        status: 'cancelled',
        actorUserId: sessionContext.userId,
        note: 'Order cancelled by customer.',
      })

      await tx.insert(notifications).values({
        userId: sessionContext.userId,
        type: 'order_cancelled',
        title: 'Order cancelled',
        body: `Order ${order.orderNumber} has been cancelled.`,
        data: { orderId: order.id, orderNumber: order.orderNumber },
      })

      return updatedOrder
    })

    return reply.status(200).send({
      order: cancelledOrder,
    })
  })

  app.post('/orders/:orderId/report', async (request, reply) => {
    const sessionContext = await getCurrentSessionContext(request.headers.cookie)

    if (!sessionContext) {
      return sendUnauthenticated(reply)
    }

    const parsedParams = orderParamsSchema.safeParse(request.params)

    if (!parsedParams.success) {
      return sendValidationError(reply, 'Please choose a valid order.', parsedParams.error.issues)
    }

    const parsedBody = reportOrderBodySchema.safeParse(request.body)

    if (!parsedBody.success) {
      return sendValidationError(reply, 'Please describe the issue.', parsedBody.error.issues)
    }

    const order = await getCustomerOrder(sessionContext.userId, parsedParams.data.orderId)

    if (!order) {
      return sendOrderNotFound(reply)
    }

    const [issue] = await database
      .insert(orderIssues)
      .values({
        orderId: order.id,
        type: 'customer_complaint',
        raisedByUserId: sessionContext.userId,
        reason: parsedBody.data.reason,
      })
      .returning({
        id: orderIssues.id,
        type: orderIssues.type,
        status: orderIssues.status,
        reason: orderIssues.reason,
        createdAt: orderIssues.createdAt,
      })

    await database.insert(notifications).values({
      userId: sessionContext.userId,
      type: 'order_issue_reported',
      title: 'Issue reported',
      body: `We received your report for order ${order.orderNumber}.`,
      data: { orderId: order.id, orderNumber: order.orderNumber, issueId: issue.id },
    })

    return reply.status(201).send({
      issue,
    })
  })

  app.post('/orders/:orderId/review', async (request, reply) => {
    const sessionContext = await getCurrentSessionContext(request.headers.cookie)

    if (!sessionContext) {
      return sendUnauthenticated(reply)
    }

    const parsedParams = orderParamsSchema.safeParse(request.params)

    if (!parsedParams.success) {
      return sendValidationError(reply, 'Please choose a valid order.', parsedParams.error.issues)
    }

    const parsedBody = reviewOrderBodySchema.safeParse(request.body)

    if (!parsedBody.success) {
      return sendValidationError(reply, 'Please choose a rating from 1 to 5.', parsedBody.error.issues)
    }

    const order = await getCustomerOrder(sessionContext.userId, parsedParams.data.orderId)

    if (!order) {
      return sendOrderNotFound(reply)
    }

    if (order.status !== 'delivered') {
      return reply.status(409).send({
        error: 'order_not_reviewable',
        message: 'You can review an order after it has been delivered.',
      })
    }

    const [review] = await database
      .insert(orderReviews)
      .values({
        orderId: order.id,
        customerId: sessionContext.userId,
        restaurantId: order.restaurantId,
        rating: parsedBody.data.rating,
        comment: parsedBody.data.comment ?? null,
      })
      .onConflictDoUpdate({
        target: orderReviews.orderId,
        set: {
          rating: parsedBody.data.rating,
          comment: parsedBody.data.comment ?? null,
          updatedAt: new Date(),
        },
      })
      .returning({
        id: orderReviews.id,
        rating: orderReviews.rating,
        comment: orderReviews.comment,
        createdAt: orderReviews.createdAt,
        updatedAt: orderReviews.updatedAt,
      })

    return reply.status(201).send({
      review,
    })
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

async function getUserAddressDetails(userId: string, addressId: string) {
  const [address] = await selectUserAddressDetails(userId, addressId)

  return address
}

async function getDefaultUserAddressDetails(userId: string) {
  const [address] = await selectUserAddressDetails(userId)

  return address
}

function selectUserAddressDetails(userId: string, addressId?: string) {
  const conditions = [eq(addresses.userId, userId)]

  if (addressId) {
    conditions.push(eq(addresses.id, addressId))
  }

  return database
    .select({
      id: addresses.id,
      streetAddress: addresses.streetAddress,
      landmark: addresses.landmark,
      isDefault: addresses.isDefault,
      serviceArea: {
        id: serviceAreas.id,
        name: serviceAreas.name,
        city: serviceAreas.city,
        state: serviceAreas.state,
      },
    })
    .from(addresses)
    .innerJoin(serviceAreas, eq(addresses.serviceAreaId, serviceAreas.id))
    .where(and(...conditions))
    .orderBy(desc(addresses.isDefault), asc(addresses.createdAt))
    .limit(1)
}

function getAvailableCombos(comboIds: string[]) {
  return database
    .select({
      id: combos.id,
      name: combos.name,
      restaurantId: combos.restaurantId,
      priceAmount: combos.priceAmount,
    })
    .from(combos)
    .innerJoin(restaurants, eq(combos.restaurantId, restaurants.id))
    .where(
      and(
        inArray(combos.id, comboIds),
        eq(combos.isAvailable, true),
        eq(restaurants.status, 'active' as const),
      ),
    )
}

function getComboComponents(comboIds: string[]) {
  return database
    .select({
      comboId: comboItems.comboId,
      menuItemId: menuItems.id,
      name: menuItems.name,
      priceAmount: menuItems.priceAmount,
      quantity: comboItems.quantity,
    })
    .from(comboItems)
    .innerJoin(menuItems, eq(comboItems.menuItemId, menuItems.id))
    .where(inArray(comboItems.comboId, comboIds))
}

type ComboComponent = Awaited<ReturnType<typeof getComboComponents>>[number]

function groupComponentsByComboId(components: ComboComponent[]) {
  const grouped = new Map<string, ComboComponent[]>()

  for (const component of components) {
    const existingComponents = grouped.get(component.comboId) ?? []

    existingComponents.push(component)
    grouped.set(component.comboId, existingComponents)
  }

  return grouped
}

function validateComponentOverrides(
  items: z.infer<typeof createOrderBodySchema>['items'],
  componentsByComboId: Map<string, ComboComponent[]>,
) {
  for (const item of items) {
    if (!item.components) continue

    const baseComponents = componentsByComboId.get(item.comboId) ?? []
    const baseComponentByMenuItemId = new Map(
      baseComponents.map((component) => [component.menuItemId, component]),
    )

    for (const component of item.components) {
      const baseComponent = baseComponentByMenuItemId.get(component.menuItemId)

      if (!baseComponent) {
        return {
          error: 'invalid_combo_component',
          message: 'One or more combo items are not valid for this combo.',
        }
      }

      if (component.quantity < baseComponent.quantity) {
        return {
          error: 'invalid_combo_component_quantity',
          message: 'Combo item quantities cannot be lower than the base combo.',
        }
      }
    }
  }

  return null
}

function generateOrderNumber() {
  const datePart = new Date()
    .toISOString()
    .slice(0, 10)
    .replaceAll('-', '')
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase()

  return `MND-${datePart}-${randomPart}`
}

function selectCustomerOrderSummaries(userId: string) {
  return database
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      totalAmount: orders.totalAmount,
      currency: orders.currency,
      placedAt: orders.placedAt,
      createdAt: orders.createdAt,
      restaurant: {
        id: restaurants.id,
        name: restaurants.name,
        slug: restaurants.slug,
        imageUrl: restaurants.imageUrl,
      },
    })
    .from(orders)
    .innerJoin(restaurants, eq(orders.restaurantId, restaurants.id))
    .where(eq(orders.customerId, userId))
    .orderBy(desc(orders.createdAt))
}

type CustomerOrderSummary = Awaited<
  ReturnType<typeof selectCustomerOrderSummaries>
>[number]

function serializeOrderSummary(order: CustomerOrderSummary) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    totalAmount: order.totalAmount,
    currency: order.currency,
    placedAt: order.placedAt ?? order.createdAt,
    restaurant: order.restaurant,
    canCancel: isCustomerCancellableOrderStatus(order.status),
  }
}

async function getCustomerOrder(userId: string, orderId: string) {
  const [order] = await database
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerId: orders.customerId,
      restaurantId: orders.restaurantId,
      status: orders.status,
      currency: orders.currency,
      subtotalAmount: orders.subtotalAmount,
      deliveryFeeAmount: orders.deliveryFeeAmount,
      discountAmount: orders.discountAmount,
      totalAmount: orders.totalAmount,
      customerNote: orders.customerNote,
      deliveryRecipientName: orders.deliveryRecipientName,
      deliveryPhone: orders.deliveryPhone,
      deliveryStreetAddress: orders.deliveryStreetAddress,
      deliveryServiceArea: orders.deliveryServiceArea,
      deliveryLandmark: orders.deliveryLandmark,
      placedAt: orders.placedAt,
      createdAt: orders.createdAt,
      restaurant: {
        id: restaurants.id,
        name: restaurants.name,
        slug: restaurants.slug,
        imageUrl: restaurants.imageUrl,
        phone: restaurants.phone,
      },
    })
    .from(orders)
    .innerJoin(restaurants, eq(orders.restaurantId, restaurants.id))
    .where(and(eq(orders.id, orderId), eq(orders.customerId, userId)))
    .limit(1)

  return order
}

type CustomerOrder = NonNullable<Awaited<ReturnType<typeof getCustomerOrder>>>

function selectOrderItems(orderId: string) {
  return database
    .select({
      id: orderItems.id,
      comboId: orderItems.comboId,
      menuItemId: orderItems.menuItemId,
      itemName: orderItems.itemName,
      unitPriceAmount: orderItems.unitPriceAmount,
      quantity: orderItems.quantity,
      lineTotalAmount: orderItems.lineTotalAmount,
      createdAt: orderItems.createdAt,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
    .orderBy(asc(orderItems.createdAt))
}

type CustomerOrderItem = Awaited<ReturnType<typeof selectOrderItems>>[number]

function selectOrderItemComponents(orderId: string) {
  return database
    .select({
      id: orderItemComponents.id,
      orderItemId: orderItemComponents.orderItemId,
      menuItemId: orderItemComponents.menuItemId,
      itemName: orderItemComponents.itemName,
      unitPriceAmount: orderItemComponents.unitPriceAmount,
      quantity: orderItemComponents.quantity,
      lineTotalAmount: orderItemComponents.lineTotalAmount,
    })
    .from(orderItemComponents)
    .innerJoin(orderItems, eq(orderItemComponents.orderItemId, orderItems.id))
    .where(eq(orderItems.orderId, orderId))
}

type CustomerOrderItemComponent = Awaited<
  ReturnType<typeof selectOrderItemComponents>
>[number]

function selectOrderTimeline(orderId: string) {
  return database
    .select({
      id: orderStatusEvents.id,
      status: orderStatusEvents.status,
      note: orderStatusEvents.note,
      createdAt: orderStatusEvents.createdAt,
    })
    .from(orderStatusEvents)
    .where(eq(orderStatusEvents.orderId, orderId))
    .orderBy(asc(orderStatusEvents.createdAt))
}

type CustomerOrderTimelineEvent = Awaited<
  ReturnType<typeof selectOrderTimeline>
>[number]

function selectOrderIssues(orderId: string) {
  return database
    .select({
      id: orderIssues.id,
      type: orderIssues.type,
      status: orderIssues.status,
      reason: orderIssues.reason,
      resolution: orderIssues.resolution,
      createdAt: orderIssues.createdAt,
    })
    .from(orderIssues)
    .where(eq(orderIssues.orderId, orderId))
    .orderBy(desc(orderIssues.createdAt))
}

type CustomerOrderIssue = Awaited<ReturnType<typeof selectOrderIssues>>[number]

function selectOrderPayments(orderId: string) {
  return database
    .select({
      id: payments.id,
      method: payments.method,
      provider: payments.provider,
      amount: payments.amount,
      currency: payments.currency,
      status: payments.status,
      createdAt: payments.createdAt,
      paidAt: payments.paidAt,
      verifiedAt: payments.verifiedAt,
    })
    .from(payments)
    .where(eq(payments.orderId, orderId))
    .orderBy(desc(payments.createdAt))
}

type CustomerOrderPayment = Awaited<ReturnType<typeof selectOrderPayments>>[number]

async function selectOrderReview(orderId: string) {
  const [review] = await database
    .select({
      id: orderReviews.id,
      rating: orderReviews.rating,
      comment: orderReviews.comment,
      createdAt: orderReviews.createdAt,
      updatedAt: orderReviews.updatedAt,
    })
    .from(orderReviews)
    .where(eq(orderReviews.orderId, orderId))
    .limit(1)

  return review ?? null
}

type CustomerOrderReview = Awaited<ReturnType<typeof selectOrderReview>>

function serializeOrderDetail(
  order: CustomerOrder,
  items: CustomerOrderItem[],
  components: CustomerOrderItemComponent[],
  timeline: CustomerOrderTimelineEvent[],
  issues: CustomerOrderIssue[],
  paymentRows: CustomerOrderPayment[],
  review: CustomerOrderReview,
) {
  const componentsByOrderItemId = new Map<string, CustomerOrderItemComponent[]>()

  for (const component of components) {
    const existingComponents = componentsByOrderItemId.get(component.orderItemId)
      ?? []

    existingComponents.push(component)
    componentsByOrderItemId.set(component.orderItemId, existingComponents)
  }

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    currency: order.currency,
    subtotalAmount: order.subtotalAmount,
    deliveryFeeAmount: order.deliveryFeeAmount,
    discountAmount: order.discountAmount,
    totalAmount: order.totalAmount,
    customerNote: order.customerNote,
    placedAt: order.placedAt ?? order.createdAt,
    canCancel: isCustomerCancellableOrderStatus(order.status),
    restaurant: order.restaurant,
    delivery: {
      recipientName: order.deliveryRecipientName,
      phone: order.deliveryPhone,
      streetAddress: order.deliveryStreetAddress,
      serviceArea: order.deliveryServiceArea,
      landmark: order.deliveryLandmark,
    },
    items: items.map((item) => ({
      id: item.id,
      comboId: item.comboId,
      menuItemId: item.menuItemId,
      name: item.itemName,
      unitPriceAmount: item.unitPriceAmount,
      quantity: item.quantity,
      lineTotalAmount: item.lineTotalAmount,
      components: componentsByOrderItemId.get(item.id) ?? [],
    })),
    timeline,
    issues,
    payments: paymentRows,
    review,
  }
}

function isCustomerCancellableOrderStatus(status: string) {
  return CUSTOMER_CANCELLABLE_ORDER_STATUSES.includes(
    status as (typeof CUSTOMER_CANCELLABLE_ORDER_STATUSES)[number],
  )
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

function sendOrderNotFound(reply: FastifyReply) {
  return reply.status(404).send({
    error: 'order_not_found',
    message: 'Order not found.',
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

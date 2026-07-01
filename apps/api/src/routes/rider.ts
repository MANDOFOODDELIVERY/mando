import type { FastifyInstance, FastifyReply } from 'fastify'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

import { getCurrentSessionContext } from '../auth/current-session.js'
import {
  createSessionToken,
  serializeClearSessionCookie,
  serializeSessionCookie,
  verifyPassword,
} from '../auth/index.js'
import { database } from '../db/client.js'
import {
  authSessions,
  commissions,
  deliveries,
  deliveryStatusEvents,
  notifications,
  orderStatusEvents,
  orders,
  payoutAccounts,
  payoutRequests,
  profiles,
  restaurantEarnings,
  restaurants,
  riderProfiles,
  serviceAreas,
  users,
} from '../db/schema.js'

const RIDER_DELIVERY_EARNING_BPS = 8000

const availabilityBodySchema = z.object({
  availabilityStatus: z.enum(['offline', 'available', 'busy']),
})

const riderLoginBodySchema = z.object({
  code: z.string().trim().min(1),
  password: z.string().min(1),
})

const orderParamsSchema = z.object({
  orderId: z.uuid(),
})

const notificationParamsSchema = z.object({
  notificationId: z.uuid(),
})

type DeliveryRow = {
  deliveryId: string
  deliveryStatus: string
  deliveryFeeAmount: number
  riderEarningAmount: number
  acceptedAt: Date | null
  pickedUpAt: Date | null
  deliveredAt: Date | null
  orderId: string
  orderNumber: string
  orderStatus: string
  deliveryRecipientName: string
  deliveryPhone: string
  deliveryStreetAddress: string
  deliveryServiceArea: string
  totalAmount: number
  placedAt: Date | null
  createdAt: Date
  restaurantId: string
  restaurantName: string
  restaurantStreetAddress: string
}

export async function riderRoutes(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
    const parsedBody = riderLoginBodySchema.safeParse(request.body)

    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please enter your rider code and password.',
      })
    }

    try {
      const [riderUser] = await database
        .select({
          userId: users.id,
          email: users.email,
          status: users.status,
          createdAt: users.createdAt,
          passwordHash: users.passwordHash,
          riderCode: riderProfiles.riderCode,
        })
        .from(riderProfiles)
        .innerJoin(users, eq(riderProfiles.userId, users.id))
        .where(eq(riderProfiles.riderCode, parsedBody.data.code))
        .limit(1)

      if (!riderUser) return sendInvalidRiderLogin(reply)

      const passwordMatches = await verifyPassword(
        parsedBody.data.password,
        riderUser.passwordHash,
      )

      if (!passwordMatches) return sendInvalidRiderLogin(reply)

      if (riderUser.status === 'suspended' || riderUser.status === 'disabled') {
        return reply.status(403).send({
          error: 'account_unavailable',
          message: 'This rider account is not available. Please contact support.',
        })
      }

      const session = createSessionToken()

      await database.insert(authSessions).values({
        userId: riderUser.userId,
        tokenHash: session.tokenHash,
        expiresAt: session.expiresAt,
      })

      const rider = await getRiderProfile(riderUser.userId)

      return reply
        .status(200)
        .header('Set-Cookie', serializeSessionCookie(session))
        .send({
          user: {
            id: riderUser.userId,
            email: riderUser.email,
            status: riderUser.status,
            createdAt: riderUser.createdAt,
          },
          profile: rider?.profile ?? null,
          roles: ['rider'],
          rider: rider?.rider ?? null,
        })
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({
        error: 'rider_login_failed',
        message: 'Rider login failed. Please try again.',
      })
    }
  })

  app.get('/me', async (request, reply) => {
    const auth = await requireRider(request.headers.cookie, reply)
    if (!auth) return

    try {
      const rider = await getRiderProfile(auth.userId)
      if (!rider) return sendRiderProfileNotFound(reply)

      const [payoutAccount] = await database
        .select({
          id: payoutAccounts.id,
          accountName: payoutAccounts.accountName,
          accountNumberLast4: payoutAccounts.accountNumberLast4,
          isVerified: payoutAccounts.isVerified,
        })
        .from(payoutAccounts)
        .where(eq(payoutAccounts.userId, auth.userId))
        .limit(1)

      return reply.status(200).send({
        ...rider,
        payoutAccount: payoutAccount ?? null,
        payout: {
          availableAmount: await getAvailableRiderPayoutAmount(auth.userId),
        },
        payoutRequests: await getRiderPayoutRequests(auth.userId),
      })
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({
        error: 'rider_profile_failed',
        message: 'Unable to load rider profile.',
      })
    }
  })

  app.patch('/availability', async (request, reply) => {
    const auth = await requireRider(request.headers.cookie, reply)
    if (!auth) return

    const parsedBody = availabilityBodySchema.safeParse(request.body)
    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please choose a valid rider availability.',
      })
    }

    try {
      const [updatedRider] = await database
        .update(riderProfiles)
        .set({
          availabilityStatus: parsedBody.data.availabilityStatus,
          updatedAt: new Date(),
        })
        .where(eq(riderProfiles.userId, auth.userId))
        .returning({
          availabilityStatus: riderProfiles.availabilityStatus,
        })

      if (!updatedRider) return sendRiderProfileNotFound(reply)

      return reply.status(200).send(updatedRider)
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({
        error: 'availability_update_failed',
        message: 'Unable to update rider availability.',
      })
    }
  })

  app.get('/dashboard', async (request, reply) => {
    const auth = await requireRider(request.headers.cookie, reply)
    if (!auth) return

    try {
      const rider = await getRiderProfile(auth.userId)
      if (!rider) return sendRiderProfileNotFound(reply)

      const [availablePickups, activeDeliveries, recentDeliveries] =
        await Promise.all([
          listAvailablePickups(rider.rider.serviceArea.id),
          listActiveDeliveries(auth.userId),
          listDeliveryHistory(auth.userId, 5),
        ])

      return reply.status(200).send({
        rider,
        stats: {
          totalEarningsAmount: recentDeliveries.reduce(
            (total, delivery) => total + delivery.riderEarningAmount,
            0,
          ),
          activeDeliveryCount: activeDeliveries.length,
          availablePickupCount: availablePickups.length,
          completedDeliveryCount: recentDeliveries.length,
        },
        availablePickups,
        activeDeliveries,
        recentDeliveries,
      })
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({
        error: 'rider_dashboard_failed',
        message: 'Unable to load rider dashboard.',
      })
    }
  })

  app.get('/orders/available', async (request, reply) => {
    const auth = await requireRider(request.headers.cookie, reply)
    if (!auth) return

    try {
      const rider = await getRiderProfile(auth.userId)
      if (!rider) return sendRiderProfileNotFound(reply)

      return reply.status(200).send({
        orders: await listAvailablePickups(rider.rider.serviceArea.id),
      })
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({
        error: 'available_orders_failed',
        message: 'Unable to load available rider orders.',
      })
    }
  })

  app.post('/orders/:orderId/accept', async (request, reply) => {
    return updateDeliveryAssignment(request.params, request.headers.cookie, reply, {
      action: 'accept',
      nextDeliveryStatus: 'accepted',
      nextOrderStatus: null,
      successMessage: 'Delivery accepted.',
    })
  })

  app.post('/orders/:orderId/picked-up', async (request, reply) => {
    return updateDeliveryAssignment(request.params, request.headers.cookie, reply, {
      action: 'picked_up',
      nextDeliveryStatus: 'picked_up',
      nextOrderStatus: 'on_the_way',
      successMessage: 'Delivery marked as picked up.',
    })
  })

  app.post('/orders/:orderId/delivered', async (request, reply) => {
    return updateDeliveryAssignment(request.params, request.headers.cookie, reply, {
      action: 'delivered',
      nextDeliveryStatus: 'delivered',
      nextOrderStatus: 'delivered',
      successMessage: 'Delivery completed.',
    })
  })

  app.get('/deliveries/history', async (request, reply) => {
    const auth = await requireRider(request.headers.cookie, reply)
    if (!auth) return

    try {
      return reply.status(200).send({
        deliveries: await listDeliveryHistory(auth.userId, 30),
      })
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({
        error: 'delivery_history_failed',
        message: 'Unable to load delivery history.',
      })
    }
  })

  app.post('/payout-requests', async (request, reply) => {
    const auth = await requireRider(request.headers.cookie, reply)
    if (!auth) return

    const [payoutAccount] = await database
      .select({ id: payoutAccounts.id })
      .from(payoutAccounts)
      .where(eq(payoutAccounts.userId, auth.userId))
      .limit(1)

    if (!payoutAccount) {
      return reply.status(409).send({
        error: 'missing_payout_account',
        message: 'Admin needs to add your payout account before you can request payout.',
      })
    }

    const amount = await getAvailableRiderPayoutAmount(auth.userId)

    if (amount <= 0) {
      return reply.status(409).send({
        error: 'no_available_payout',
        message: 'There are no available rider earnings to request.',
      })
    }

    const [payoutRequest] = await database
      .insert(payoutRequests)
      .values({
        requestedByUserId: auth.userId,
        userId: auth.userId,
        type: 'rider_earnings',
        payoutAccountId: payoutAccount.id,
        amount,
      })
      .returning()

    await database.insert(notifications).values({
      userId: auth.userId,
      type: 'rider_payout_requested',
      title: 'Payout request sent',
      body: `Your ${formatMoney(amount)} rider payout request has been sent to admin.`,
      data: { payoutRequestId: payoutRequest.id, amount },
    })

    return reply.status(201).send({ payoutRequest })
  })

  app.get('/notifications', async (request, reply) => {
    const auth = await requireRider(request.headers.cookie, reply)
    if (!auth) return

    return reply.status(200).send({
      notifications: await getUserNotifications(auth.userId),
    })
  })

  app.patch('/notifications/:notificationId/read', async (request, reply) => {
    const auth = await requireRider(request.headers.cookie, reply)
    if (!auth) return

    const params = notificationParamsSchema.safeParse(request.params)
    if (!params.success) return sendInvalidNotification(reply)

    const notification = await markUserNotificationRead(
      auth.userId,
      params.data.notificationId,
    )

    if (!notification) return sendNotificationNotFound(reply)
    return reply.status(200).send({ notification })
  })

  app.post('/notifications/read-all', async (request, reply) => {
    const auth = await requireRider(request.headers.cookie, reply)
    if (!auth) return

    await database
      .update(notifications)
      .set({ readAt: new Date() })
      .where(eq(notifications.userId, auth.userId))

    return reply.status(204).send()
  })
}

async function updateDeliveryAssignment(
  params: unknown,
  cookieHeader: string | undefined,
  reply: FastifyReply,
  options: {
    action: 'accept' | 'picked_up' | 'delivered'
    nextDeliveryStatus: 'accepted' | 'picked_up' | 'delivered'
    nextOrderStatus: 'on_the_way' | 'delivered' | null
    successMessage: string
  },
) {
  const auth = await requireRider(cookieHeader, reply)
  if (!auth) return

  const parsedParams = orderParamsSchema.safeParse(params)
  if (!parsedParams.success) {
    return reply.status(400).send({
      error: 'validation_error',
      message: 'Please choose a valid order.',
    })
  }

  const rider = await getRiderProfile(auth.userId)
  if (!rider) return sendRiderProfileNotFound(reply)

  const [target] = await database
    .select({
      deliveryId: deliveries.id,
      deliveryStatus: deliveries.status,
      deliveryFeeAmount: deliveries.deliveryFeeAmount,
      riderId: deliveries.riderId,
      serviceAreaId: deliveries.serviceAreaId,
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      orderStatus: orders.status,
      customerId: orders.customerId,
    })
    .from(deliveries)
    .innerJoin(orders, eq(deliveries.orderId, orders.id))
    .where(eq(orders.id, parsedParams.data.orderId))
    .limit(1)

  if (!target || target.serviceAreaId !== rider.rider.serviceArea.id) {
    return reply.status(404).send({
      error: 'delivery_not_found',
      message: 'Delivery not found for your assigned area.',
    })
  }

  if (options.action === 'accept') {
    if (rider.rider.availabilityStatus !== 'available') {
      return reply.status(409).send({
        error: 'rider_not_available',
        message: 'Set yourself as available before accepting a delivery.',
      })
    }

    if (
      target.orderStatus !== 'ready_for_pickup' ||
      !['unassigned', 'available'].includes(target.deliveryStatus)
    ) {
      return reply.status(409).send({
        error: 'delivery_unavailable',
        message: 'This delivery is no longer available.',
      })
    }
  } else {
    if (target.riderId !== auth.userId) {
      return reply.status(403).send({
        error: 'delivery_not_assigned_to_rider',
        message: 'This delivery is not assigned to you.',
      })
    }

    const expectedStatus = options.action === 'picked_up' ? 'accepted' : 'picked_up'
    if (target.deliveryStatus !== expectedStatus) {
      return reply.status(409).send({
        error: 'invalid_delivery_status',
        message: `This delivery must be ${expectedStatus.replace('_', ' ')} first.`,
      })
    }
  }

  const now = new Date()
  const deliveryUpdate: Partial<typeof deliveries.$inferInsert> = {
    riderId: auth.userId,
    status: options.nextDeliveryStatus,
    updatedAt: now,
  }

  if (options.action === 'accept') {
    deliveryUpdate.assignedAt = now
    deliveryUpdate.acceptedAt = now
  }

  if (options.action === 'picked_up') deliveryUpdate.pickedUpAt = now

  if (options.action === 'delivered') {
    deliveryUpdate.deliveredAt = now
    deliveryUpdate.riderEarningAmount = Math.round(
      (target.deliveryFeeAmount * RIDER_DELIVERY_EARNING_BPS) / 10000,
    )
  }

  await database.transaction(async (tx) => {
    await tx
      .update(deliveries)
      .set(deliveryUpdate)
      .where(eq(deliveries.id, target.deliveryId))

    await tx.insert(deliveryStatusEvents).values({
      deliveryId: target.deliveryId,
      status: options.nextDeliveryStatus,
      actorUserId: auth.userId,
      note: getDeliveryEventNote(options.action),
    })

    if (options.nextOrderStatus) {
      await tx
        .update(orders)
        .set({
          status: options.nextOrderStatus,
          updatedAt: now,
        })
        .where(eq(orders.id, target.orderId))

      await tx.insert(orderStatusEvents).values({
        orderId: target.orderId,
        status: options.nextOrderStatus,
        actorUserId: auth.userId,
        note: getOrderEventNote(options.action),
      })
    }

    await tx
      .update(riderProfiles)
      .set({
        availabilityStatus:
          options.action === 'delivered' ? 'available' : 'busy',
        updatedAt: now,
      })
      .where(eq(riderProfiles.userId, auth.userId))

    if (options.action === 'delivered') {
      await tx
        .update(commissions)
        .set({
          status: 'earned',
          earnedAt: now,
          updatedAt: now,
        })
        .where(eq(commissions.orderId, target.orderId))

      const earnedCommissions = await tx
        .select({
          salesAgentId: commissions.salesAgentId,
          commissionAmount: commissions.commissionAmount,
        })
        .from(commissions)
        .where(eq(commissions.orderId, target.orderId))

      if (earnedCommissions.length > 0) {
        await tx.insert(notifications).values(
          earnedCommissions.map((commission) => ({
            userId: commission.salesAgentId,
            type: 'commission_earned',
            title: 'Commission earned',
            body: `${formatMoney(commission.commissionAmount)} commission from order ${target.orderNumber} is now earned.`,
            data: {
              orderId: target.orderId,
              orderNumber: target.orderNumber,
              amount: commission.commissionAmount,
            },
          })),
        )
      }

      await tx
        .update(restaurantEarnings)
        .set({
          status: 'available',
          availableAt: now,
          updatedAt: now,
        })
        .where(eq(restaurantEarnings.orderId, target.orderId))

      await tx.insert(notifications).values({
        userId: target.customerId,
        type: 'order_delivered',
        title: 'Order delivered',
        body: `Order ${target.orderNumber} has been delivered.`,
        data: {
          orderId: target.orderId,
          orderNumber: target.orderNumber,
        },
      })
    }

    if (options.action === 'picked_up') {
      await tx.insert(notifications).values({
        userId: target.customerId,
        type: 'order_picked_up',
        title: 'Your order has been picked up',
        body: `${rider.profile.fullName} is on the way with order ${target.orderNumber}.${rider.profile.phone ? ` Contact: ${rider.profile.phone}` : ''}`,
        data: {
          orderId: target.orderId,
          orderNumber: target.orderNumber,
          riderId: auth.userId,
          riderName: rider.profile.fullName,
          riderPhone: rider.profile.phone,
        },
      })
    }
  })

  return reply.status(200).send({
    message: options.successMessage,
    delivery: await getDeliverySummary(target.orderId),
  })
}

async function requireRider(cookieHeader: string | undefined, reply: FastifyReply) {
  const sessionContext = await getCurrentSessionContext(cookieHeader)

  if (!sessionContext) {
    sendUnauthenticated(reply)
    return null
  }

  if (!sessionContext.authPayload.roles.includes('rider')) {
    reply.status(403).send({
      error: 'forbidden',
      message: 'This route is only available to riders.',
    })
    return null
  }

  return sessionContext
}

function getUserNotifications(userId: string) {
  return database
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
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50)
}

async function markUserNotificationRead(userId: string, notificationId: string) {
  const [notification] = await database
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .returning({
      id: notifications.id,
      readAt: notifications.readAt,
    })

  return notification ?? null
}

function sendInvalidNotification(reply: FastifyReply) {
  return reply.status(400).send({
    error: 'validation_error',
    message: 'Please choose a valid notification.',
  })
}

function sendNotificationNotFound(reply: FastifyReply) {
  return reply.status(404).send({
    error: 'notification_not_found',
    message: 'Notification not found.',
  })
}

async function getRiderProfile(userId: string) {
  const [row] = await database
    .select({
      userId: users.id,
      email: users.email,
      status: users.status,
      fullName: profiles.fullName,
      phone: profiles.phone,
      avatarUrl: profiles.avatarUrl,
      riderCode: riderProfiles.riderCode,
      availabilityStatus: riderProfiles.availabilityStatus,
      serviceAreaId: serviceAreas.id,
      serviceAreaName: serviceAreas.name,
      serviceAreaCity: serviceAreas.city,
      serviceAreaState: serviceAreas.state,
    })
    .from(riderProfiles)
    .innerJoin(users, eq(riderProfiles.userId, users.id))
    .innerJoin(profiles, eq(riderProfiles.userId, profiles.userId))
    .innerJoin(serviceAreas, eq(riderProfiles.serviceAreaId, serviceAreas.id))
    .where(eq(riderProfiles.userId, userId))
    .limit(1)

  if (!row) return null

  return {
    user: {
      id: row.userId,
      email: row.email,
      status: row.status,
    },
    profile: {
      fullName: row.fullName,
      phone: row.phone,
      avatarUrl: row.avatarUrl,
    },
    rider: {
      riderCode: row.riderCode,
      availabilityStatus: row.availabilityStatus,
      serviceArea: {
        id: row.serviceAreaId,
        name: row.serviceAreaName,
        city: row.serviceAreaCity,
        state: row.serviceAreaState,
      },
    },
  }
}

async function listAvailablePickups(serviceAreaId: string) {
  const rows = await database
    .select(deliverySelectFields())
    .from(deliveries)
    .innerJoin(orders, eq(deliveries.orderId, orders.id))
    .innerJoin(restaurants, eq(orders.restaurantId, restaurants.id))
    .where(
      and(
        eq(deliveries.serviceAreaId, serviceAreaId),
        inArray(deliveries.status, ['unassigned', 'available']),
        eq(orders.status, 'ready_for_pickup'),
      ),
    )
    .orderBy(desc(orders.createdAt))

  return rows.map(serializeDelivery)
}

async function listActiveDeliveries(riderId: string) {
  const rows = await database
    .select(deliverySelectFields())
    .from(deliveries)
    .innerJoin(orders, eq(deliveries.orderId, orders.id))
    .innerJoin(restaurants, eq(orders.restaurantId, restaurants.id))
    .where(
      and(
        eq(deliveries.riderId, riderId),
        inArray(deliveries.status, ['assigned', 'accepted', 'picked_up', 'on_the_way']),
      ),
    )
    .orderBy(desc(deliveries.updatedAt))

  return rows.map(serializeDelivery)
}

async function listDeliveryHistory(riderId: string, limit: number) {
  const rows = await database
    .select(deliverySelectFields())
    .from(deliveries)
    .innerJoin(orders, eq(deliveries.orderId, orders.id))
    .innerJoin(restaurants, eq(orders.restaurantId, restaurants.id))
    .where(and(eq(deliveries.riderId, riderId), eq(deliveries.status, 'delivered')))
    .orderBy(desc(deliveries.deliveredAt))
    .limit(limit)

  return rows.map(serializeDelivery)
}

async function getDeliverySummary(orderId: string) {
  const [row] = await database
    .select(deliverySelectFields())
    .from(deliveries)
    .innerJoin(orders, eq(deliveries.orderId, orders.id))
    .innerJoin(restaurants, eq(orders.restaurantId, restaurants.id))
    .where(eq(orders.id, orderId))
    .limit(1)

  return row ? serializeDelivery(row) : null
}

function deliverySelectFields() {
  return {
    deliveryId: deliveries.id,
    deliveryStatus: deliveries.status,
    deliveryFeeAmount: deliveries.deliveryFeeAmount,
    riderEarningAmount: deliveries.riderEarningAmount,
    acceptedAt: deliveries.acceptedAt,
    pickedUpAt: deliveries.pickedUpAt,
    deliveredAt: deliveries.deliveredAt,
    orderId: orders.id,
    orderNumber: orders.orderNumber,
    orderStatus: orders.status,
    deliveryRecipientName: orders.deliveryRecipientName,
    deliveryPhone: orders.deliveryPhone,
    deliveryStreetAddress: orders.deliveryStreetAddress,
    deliveryServiceArea: orders.deliveryServiceArea,
    totalAmount: orders.totalAmount,
    placedAt: orders.placedAt,
    createdAt: orders.createdAt,
    restaurantId: restaurants.id,
    restaurantName: restaurants.name,
    restaurantStreetAddress: restaurants.streetAddress,
  }
}

function serializeDelivery(row: DeliveryRow) {
  return {
    id: row.deliveryId,
    status: row.deliveryStatus,
    deliveryFeeAmount: row.deliveryFeeAmount,
    riderEarningAmount: row.riderEarningAmount,
    acceptedAt: row.acceptedAt,
    pickedUpAt: row.pickedUpAt,
    deliveredAt: row.deliveredAt,
    order: {
      id: row.orderId,
      orderNumber: row.orderNumber,
      status: row.orderStatus,
      totalAmount: row.totalAmount,
      placedAt: row.placedAt,
      createdAt: row.createdAt,
      delivery: {
        recipientName: row.deliveryRecipientName,
        phone: row.deliveryPhone,
        streetAddress: row.deliveryStreetAddress,
        serviceArea: row.deliveryServiceArea,
      },
    },
    restaurant: {
      id: row.restaurantId,
      name: row.restaurantName,
      streetAddress: row.restaurantStreetAddress,
    },
  }
}

function getDeliveryEventNote(action: 'accept' | 'picked_up' | 'delivered') {
  if (action === 'accept') return 'Rider accepted the delivery.'
  if (action === 'picked_up') return 'Rider picked up the order.'
  return 'Rider delivered the order.'
}

async function getAvailableRiderPayoutAmount(userId: string) {
  const deliveredRows = await database
    .select({ riderEarningAmount: deliveries.riderEarningAmount })
    .from(deliveries)
    .where(and(eq(deliveries.riderId, userId), eq(deliveries.status, 'delivered')))

  const requestedRows = await database
    .select({ amount: payoutRequests.amount })
    .from(payoutRequests)
    .where(
      and(
        eq(payoutRequests.userId, userId),
        eq(payoutRequests.type, 'rider_earnings'),
        inArray(payoutRequests.status, [
          'pending',
          'under_review',
          'approved',
          'processing',
          'paid',
        ]),
      ),
    )

  const deliveredAmount = deliveredRows.reduce(
    (total, row) => total + row.riderEarningAmount,
    0,
  )
  const requestedAmount = requestedRows.reduce(
    (total, row) => total + row.amount,
    0,
  )

  return Math.max(deliveredAmount - requestedAmount, 0)
}

function getRiderPayoutRequests(userId: string) {
  return database
    .select({
      id: payoutRequests.id,
      amount: payoutRequests.amount,
      status: payoutRequests.status,
      requestedAt: payoutRequests.requestedAt,
    })
    .from(payoutRequests)
    .where(
      and(
        eq(payoutRequests.userId, userId),
        eq(payoutRequests.type, 'rider_earnings'),
      ),
    )
    .orderBy(desc(payoutRequests.requestedAt))
    .limit(10)
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount)
}

function getOrderEventNote(action: 'accept' | 'picked_up' | 'delivered') {
  if (action === 'picked_up') return 'Order is on the way with the rider.'
  if (action === 'delivered') return 'Order has been delivered.'
  return 'Delivery accepted by rider.'
}

function sendRiderProfileNotFound(reply: FastifyReply) {
  return reply.status(404).send({
    error: 'rider_profile_not_found',
    message: 'Rider profile not found.',
  })
}

function sendInvalidRiderLogin(reply: FastifyReply) {
  return reply.status(401).send({
    error: 'invalid_credentials',
    message: 'Invalid rider code or password.',
  })
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

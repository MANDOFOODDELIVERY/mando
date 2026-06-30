import type { FastifyInstance, FastifyReply } from 'fastify'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'

import {
  createSessionToken,
  serializeClearSessionCookie,
  serializeSessionCookie,
  verifyPassword,
} from '../auth/index.js'
import { getCurrentSessionContext } from '../auth/current-session.js'
import { database } from '../db/client.js'
import {
  authSessions,
  orderIssues,
  orderItems,
  orderItemComponents,
  orders,
  orderStatusEvents,
  payoutAccounts,
  payoutRequests,
  profiles,
  restaurantEarnings,
  restaurantMembers,
  restaurantOrderDecisions,
  restaurants,
  serviceAreas,
  userRoles,
  users,
  notifications,
} from '../db/schema.js'

const loginBodySchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
})

const orderParamsSchema = z.object({
  orderId: z.uuid(),
})

const rejectOrderBodySchema = z.object({
  reasonCode: z.string().trim().min(1).max(80).default('combo_unavailable'),
  note: z.string().trim().min(1).max(500),
})

export async function restaurantRoutes(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
    const parsedBody = loginBodySchema.safeParse(request.body)

    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please enter a valid email and password.',
      })
    }

    try {
      const [restaurantUser] = await database
        .select({
          id: users.id,
          email: users.email,
          passwordHash: users.passwordHash,
          status: users.status,
          createdAt: users.createdAt,
          restaurantId: restaurantMembers.restaurantId,
          memberStatus: restaurantMembers.status,
        })
        .from(users)
        .innerJoin(restaurantMembers, eq(users.id, restaurantMembers.userId))
        .where(sql`lower(${users.email}) = ${parsedBody.data.email}`)
        .limit(1)

      if (!restaurantUser) return sendInvalidLogin(reply)

      const passwordMatches = await verifyPassword(
        parsedBody.data.password,
        restaurantUser.passwordHash,
      )

      if (!passwordMatches) return sendInvalidLogin(reply)

      if (
        restaurantUser.status === 'suspended' ||
        restaurantUser.status === 'disabled' ||
        restaurantUser.memberStatus !== 'active'
      ) {
        return reply.status(403).send({
          error: 'account_unavailable',
          message: 'This restaurant account is not available.',
        })
      }

      const session = createSessionToken()

      await database.insert(authSessions).values({
        userId: restaurantUser.id,
        tokenHash: session.tokenHash,
        expiresAt: session.expiresAt,
      })

      return reply
        .status(200)
        .header('Set-Cookie', serializeSessionCookie(session))
        .send({
          user: {
            id: restaurantUser.id,
            email: restaurantUser.email,
            status: restaurantUser.status,
            createdAt: restaurantUser.createdAt,
          },
          profile: await selectUserProfile(restaurantUser.id),
          roles: ['restaurant'],
        })
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({
        error: 'restaurant_login_failed',
        message: 'Restaurant login failed. Please try again.',
      })
    }
  })

  app.get('/me', async (request, reply) => {
    const context = await requireRestaurant(request.headers.cookie, reply)
    if (!context) return

    return reply.status(200).send({
      restaurant: context.restaurant,
      profile: context.profile,
      payoutAccount: await getRestaurantPayoutAccount(context.restaurant.id),
      payout: await getRestaurantPayoutSummary(context.restaurant.id),
      payoutRequests: await getRestaurantPayoutRequests(context.restaurant.id),
    })
  })

  app.get('/dashboard', async (request, reply) => {
    const context = await requireRestaurant(request.headers.cookie, reply)
    if (!context) return

    const [ordersList, payout] = await Promise.all([
      getRestaurantOrders(context.restaurant.id),
      getRestaurantPayoutSummary(context.restaurant.id),
    ])

    return reply.status(200).send({
      restaurant: context.restaurant,
      profile: context.profile,
      payout,
      orders: ordersList,
      stats: {
        awaitingDecisionCount: ordersList.filter(
          (order) => order.status === 'awaiting_restaurant',
        ).length,
        preparingCount: ordersList.filter((order) => order.status === 'preparing')
          .length,
        readyForPickupCount: ordersList.filter(
          (order) => order.status === 'ready_for_pickup',
        ).length,
      },
    })
  })

  app.get('/orders', async (request, reply) => {
    const context = await requireRestaurant(request.headers.cookie, reply)
    if (!context) return

    return reply.status(200).send({
      orders: await getRestaurantOrders(context.restaurant.id),
    })
  })

  app.post('/orders/:orderId/accept', async (request, reply) => {
    const context = await requireRestaurant(request.headers.cookie, reply)
    if (!context) return

    const params = orderParamsSchema.safeParse(request.params)
    if (!params.success) return sendInvalidOrder(reply)

    const order = await getActionableRestaurantOrder(
      context.restaurant.id,
      params.data.orderId,
      ['awaiting_restaurant'],
    )

    if (!order) return sendOrderNotFound(reply)

    await database.transaction(async (tx) => {
      await tx.insert(restaurantOrderDecisions).values({
        orderId: order.id,
        restaurantId: context.restaurant.id,
        decidedByUserId: context.userId,
        decision: 'accepted',
        decidedAt: new Date(),
      })

      await tx
        .update(orders)
        .set({ status: 'preparing', updatedAt: new Date() })
        .where(eq(orders.id, order.id))

      await tx.insert(orderStatusEvents).values({
        orderId: order.id,
        status: 'preparing',
        actorUserId: context.userId,
        note: 'Restaurant accepted the order and started preparation.',
      })
    })

    return reply.status(200).send({
      order: await getRestaurantOrderDetail(context.restaurant.id, order.id),
    })
  })

  app.post('/orders/:orderId/reject', async (request, reply) => {
    const context = await requireRestaurant(request.headers.cookie, reply)
    if (!context) return

    const params = orderParamsSchema.safeParse(request.params)
    const body = rejectOrderBodySchema.safeParse(request.body)
    if (!params.success) return sendInvalidOrder(reply)
    if (!body.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please provide a reason for rejecting the order.',
      })
    }

    const order = await getActionableRestaurantOrder(
      context.restaurant.id,
      params.data.orderId,
      ['awaiting_restaurant'],
    )

    if (!order) return sendOrderNotFound(reply)

    await database.transaction(async (tx) => {
      await tx.insert(restaurantOrderDecisions).values({
        orderId: order.id,
        restaurantId: context.restaurant.id,
        decidedByUserId: context.userId,
        decision: 'rejected',
        rejectionReasonCode: body.data.reasonCode,
        rejectionNote: body.data.note,
        decidedAt: new Date(),
      })

      await tx
        .update(orders)
        .set({ status: 'admin_review', updatedAt: new Date() })
        .where(eq(orders.id, order.id))

      await tx.insert(orderIssues).values({
        orderId: order.id,
        type: 'restaurant_rejection',
        raisedByUserId: context.userId,
        reason: body.data.note,
      })

      await tx.insert(orderStatusEvents).values({
        orderId: order.id,
        status: 'admin_review',
        actorUserId: context.userId,
        note: 'Restaurant rejected the order. Admin review required.',
      })

      await tx.insert(notifications).values({
        userId: order.customerId,
        type: 'restaurant_rejected_order',
        title: 'Order needs review',
        body: `The restaurant could not accept order ${order.orderNumber}. MANDO admin will follow up.`,
        data: { orderId: order.id, orderNumber: order.orderNumber },
      })
    })

    return reply.status(200).send({
      order: await getRestaurantOrderDetail(context.restaurant.id, order.id),
    })
  })

  app.post('/orders/:orderId/ready', async (request, reply) => {
    const context = await requireRestaurant(request.headers.cookie, reply)
    if (!context) return

    const params = orderParamsSchema.safeParse(request.params)
    if (!params.success) return sendInvalidOrder(reply)

    const order = await getActionableRestaurantOrder(
      context.restaurant.id,
      params.data.orderId,
      ['preparing'],
    )

    if (!order) return sendOrderNotFound(reply)

    await database.transaction(async (tx) => {
      await tx
        .update(orders)
        .set({ status: 'ready_for_pickup', updatedAt: new Date() })
        .where(eq(orders.id, order.id))

      await tx.insert(orderStatusEvents).values({
        orderId: order.id,
        status: 'ready_for_pickup',
        actorUserId: context.userId,
        note: 'Restaurant marked the order ready for pickup.',
      })
    })

    return reply.status(200).send({
      order: await getRestaurantOrderDetail(context.restaurant.id, order.id),
    })
  })

  app.post('/payout-requests', async (request, reply) => {
    const context = await requireRestaurant(request.headers.cookie, reply)
    if (!context) return

    const payoutAccount = await getRestaurantPayoutAccount(context.restaurant.id)
    if (!payoutAccount) {
      return reply.status(409).send({
        error: 'missing_payout_account',
        message: 'A payout account must be added by admin before requesting payout.',
      })
    }

    const availableEarnings = await getAvailableRestaurantEarnings(
      context.restaurant.id,
    )
    const amount = availableEarnings.reduce(
      (total, earning) => total + earning.netAmount,
      0,
    )

    if (amount <= 0) {
      return reply.status(409).send({
        error: 'no_available_payout',
        message: 'There are no available earnings to request.',
      })
    }

    const [payoutRequest] = await database.transaction(async (tx) => {
      const [requestRow] = await tx
        .insert(payoutRequests)
        .values({
          requestedByUserId: context.userId,
          restaurantId: context.restaurant.id,
          type: 'restaurant_earnings',
          payoutAccountId: payoutAccount.id,
          amount,
        })
        .returning()

      await tx
        .update(restaurantEarnings)
        .set({ status: 'requested', updatedAt: new Date() })
        .where(
          and(
            eq(restaurantEarnings.restaurantId, context.restaurant.id),
            eq(restaurantEarnings.status, 'available'),
          ),
        )

      return [requestRow]
    })

    return reply.status(201).send({ payoutRequest })
  })
}

async function requireRestaurant(cookieHeader: string | undefined, reply: FastifyReply) {
  const sessionContext = await getCurrentSessionContext(cookieHeader)

  if (!sessionContext) {
    sendUnauthenticated(reply)
    return null
  }

  if (!sessionContext.authPayload.roles.includes('restaurant')) {
    reply.status(403).send({
      error: 'forbidden',
      message: 'This route is only available to restaurant users.',
    })
    return null
  }

  const [membership] = await database
    .select({
      restaurantId: restaurantMembers.restaurantId,
      role: restaurantMembers.membershipRole,
      status: restaurantMembers.status,
      name: restaurants.name,
      slug: restaurants.slug,
      phone: restaurants.phone,
      streetAddress: restaurants.streetAddress,
      imageUrl: restaurants.imageUrl,
      restaurantStatus: restaurants.status,
      isVerified: restaurants.isVerified,
      serviceAreaName: serviceAreas.name,
      serviceAreaCity: serviceAreas.city,
      serviceAreaState: serviceAreas.state,
    })
    .from(restaurantMembers)
    .innerJoin(restaurants, eq(restaurantMembers.restaurantId, restaurants.id))
    .innerJoin(serviceAreas, eq(restaurants.serviceAreaId, serviceAreas.id))
    .where(
      and(
        eq(restaurantMembers.userId, sessionContext.userId),
        eq(restaurantMembers.status, 'active'),
      ),
    )
    .limit(1)

  if (!membership) {
    reply.status(403).send({
      error: 'restaurant_membership_unavailable',
      message: 'No active restaurant membership found.',
    })
    return null
  }

  return {
    userId: sessionContext.userId,
    profile: sessionContext.authPayload.profile,
    restaurant: {
      id: membership.restaurantId,
      name: membership.name,
      slug: membership.slug,
      phone: membership.phone,
      streetAddress: membership.streetAddress,
      imageUrl: membership.imageUrl,
      status: membership.restaurantStatus,
      isVerified: membership.isVerified,
      membershipRole: membership.role,
      serviceArea: {
        name: membership.serviceAreaName,
        city: membership.serviceAreaCity,
        state: membership.serviceAreaState,
      },
    },
  }
}

async function selectUserProfile(userId: string) {
  const [profile] = await database
    .select({
      fullName: profiles.fullName,
      phone: profiles.phone,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1)

  return profile ?? null
}

async function getRestaurantOrders(restaurantId: string) {
  const rows = await database
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      totalAmount: orders.totalAmount,
      createdAt: orders.createdAt,
      deliveryRecipientName: orders.deliveryRecipientName,
      deliveryStreetAddress: orders.deliveryStreetAddress,
      deliveryServiceArea: orders.deliveryServiceArea,
    })
    .from(orders)
    .where(eq(orders.restaurantId, restaurantId))
    .orderBy(desc(orders.createdAt))
    .limit(50)

  return Promise.all(rows.map((order) => serializeRestaurantOrder(order)))
}

async function getRestaurantOrderDetail(restaurantId: string, orderId: string) {
  const [order] = await database
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      totalAmount: orders.totalAmount,
      createdAt: orders.createdAt,
      deliveryRecipientName: orders.deliveryRecipientName,
      deliveryStreetAddress: orders.deliveryStreetAddress,
      deliveryServiceArea: orders.deliveryServiceArea,
    })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.restaurantId, restaurantId)))
    .limit(1)

  return order ? serializeRestaurantOrder(order) : null
}

async function serializeRestaurantOrder(order: {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  createdAt: Date
  deliveryRecipientName: string
  deliveryStreetAddress: string
  deliveryServiceArea: string
}) {
  const items = await database
    .select({
      id: orderItems.id,
      itemName: orderItems.itemName,
      quantity: orderItems.quantity,
      componentName: orderItemComponents.itemName,
      componentQuantity: orderItemComponents.quantity,
    })
    .from(orderItems)
    .leftJoin(
      orderItemComponents,
      eq(orderItems.id, orderItemComponents.orderItemId),
    )
    .where(eq(orderItems.orderId, order.id))

  const itemMap = new Map<
    string,
    { id: string; name: string; quantity: number; components: string[] }
  >()

  for (const item of items) {
    if (!itemMap.has(item.id)) {
      itemMap.set(item.id, {
        id: item.id,
        name: item.itemName,
        quantity: item.quantity,
        components: [],
      })
    }

    if (item.componentName) {
      itemMap
        .get(item.id)
        ?.components.push(`${item.componentName} x${item.componentQuantity}`)
    }
  }

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt,
    customer: order.deliveryRecipientName,
    address: `${order.deliveryStreetAddress}, ${order.deliveryServiceArea}`,
    items: Array.from(itemMap.values()),
  }
}

function getActionableRestaurantOrder(
  restaurantId: string,
  orderId: string,
  statuses: string[],
) {
  return database
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerId: orders.customerId,
    })
    .from(orders)
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.restaurantId, restaurantId),
        inArray(
          orders.status,
          statuses as [
            typeof orders.status.enumValues[number],
            ...typeof orders.status.enumValues[number][],
          ],
        ),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null)
}

async function getRestaurantPayoutSummary(restaurantId: string) {
  const earnings = await getAvailableRestaurantEarnings(restaurantId)
  return {
    availableAmount: earnings.reduce((total, earning) => total + earning.netAmount, 0),
  }
}

function getAvailableRestaurantEarnings(restaurantId: string) {
  return database
    .select({
      id: restaurantEarnings.id,
      netAmount: restaurantEarnings.netAmount,
    })
    .from(restaurantEarnings)
    .where(
      and(
        eq(restaurantEarnings.restaurantId, restaurantId),
        eq(restaurantEarnings.status, 'available'),
      ),
    )
}

async function getRestaurantPayoutAccount(restaurantId: string) {
  const [account] = await database
    .select({
      id: payoutAccounts.id,
      accountName: payoutAccounts.accountName,
      accountNumberLast4: payoutAccounts.accountNumberLast4,
      isVerified: payoutAccounts.isVerified,
    })
    .from(payoutAccounts)
    .where(eq(payoutAccounts.restaurantId, restaurantId))
    .limit(1)

  return account ?? null
}

function getRestaurantPayoutRequests(restaurantId: string) {
  return database
    .select({
      id: payoutRequests.id,
      amount: payoutRequests.amount,
      status: payoutRequests.status,
      requestedAt: payoutRequests.requestedAt,
    })
    .from(payoutRequests)
    .where(eq(payoutRequests.restaurantId, restaurantId))
    .orderBy(desc(payoutRequests.requestedAt))
    .limit(10)
}

function sendInvalidLogin(reply: FastifyReply) {
  return reply.status(401).send({
    error: 'invalid_credentials',
    message: 'Invalid restaurant login details.',
  })
}

function sendInvalidOrder(reply: FastifyReply) {
  return reply.status(400).send({
    error: 'validation_error',
    message: 'Please choose a valid order.',
  })
}

function sendOrderNotFound(reply: FastifyReply) {
  return reply.status(404).send({
    error: 'order_not_found',
    message: 'Order not found or cannot be updated from its current status.',
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

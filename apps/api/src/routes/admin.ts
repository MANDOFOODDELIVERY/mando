import type { FastifyInstance, FastifyReply } from 'fastify'
import { desc, eq, inArray } from 'drizzle-orm'
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
  deliveries,
  orderIssues,
  orderItemComponents,
  orderItems,
  orders,
  payments,
  profiles,
  restaurantEarnings,
  restaurants,
  riderProfiles,
  salesAgentProfiles,
  userRoles,
  users,
} from '../db/schema.js'

const loginBodySchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
})

const orderParamsSchema = z.object({
  orderId: z.uuid(),
})

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (request, reply) => {
    if (
      request.method === 'POST' &&
      (request.url === '/login' || request.url === '/admin/login')
    ) {
      return
    }

    const auth = await requireAdmin(request.headers.cookie, reply)
    if (!auth) return reply
  })

  app.post('/login', async (request, reply) => {
    const parsedBody = loginBodySchema.safeParse(request.body)

    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please enter your admin email and password.',
      })
    }

    const [adminUser] = await database
      .select({
        userId: users.id,
        email: users.email,
        status: users.status,
        createdAt: users.createdAt,
        passwordHash: users.passwordHash,
        role: userRoles.role,
      })
      .from(users)
      .innerJoin(userRoles, eq(users.id, userRoles.userId))
      .where(eq(users.email, parsedBody.data.email))
      .limit(1)

    if (!adminUser || adminUser.role !== 'admin') return sendInvalidAdminLogin(reply)

    const passwordMatches = await verifyPassword(
      parsedBody.data.password,
      adminUser.passwordHash,
    )

    if (!passwordMatches) return sendInvalidAdminLogin(reply)

    if (adminUser.status === 'suspended' || adminUser.status === 'disabled') {
      return reply.status(403).send({
        error: 'account_unavailable',
        message: 'This admin account is not available.',
      })
    }

    const session = createSessionToken()

    await database.insert(authSessions).values({
      userId: adminUser.userId,
      tokenHash: session.tokenHash,
      expiresAt: session.expiresAt,
    })

    return reply
      .status(200)
      .header('Set-Cookie', serializeSessionCookie(session))
      .send({
        user: {
          id: adminUser.userId,
          email: adminUser.email,
          status: adminUser.status,
          createdAt: adminUser.createdAt,
        },
        roles: ['admin'],
      })
  })

  app.get('/overview', async (request, reply) => {
    const auth = await requireAdmin(request.headers.cookie, reply)
    if (!auth) return

    const [
      orderRows,
      deliveryRows,
      paymentRows,
      restaurantRows,
      riderRows,
      salesAgentRows,
      issueRows,
      earningRows,
      recentOrders,
    ] = await Promise.all([
      database.select().from(orders),
      database.select().from(deliveries),
      database.select().from(payments),
      database.select().from(restaurants),
      database.select().from(riderProfiles),
      database.select().from(salesAgentProfiles),
      database.select().from(orderIssues),
      database.select().from(restaurantEarnings),
      selectAdminOrders(5),
    ])

    const totalOrders = orderRows.length
    const deliveredOrders = orderRows.filter((order) => order.status === 'delivered')
    const cancelledOrders = orderRows.filter((order) => order.status === 'cancelled')
    const serviceChargeRevenue = orderRows.reduce(
      (total, order) => total + order.serviceChargeAmount,
      0,
    )
    const platformFeeRevenue = earningRows.reduce(
      (total, earning) => total + earning.platformFeeAmount,
      0,
    )
    const deliveryFeeRevenue = deliveryRows.reduce(
      (total, delivery) => total + Math.round(delivery.deliveryFeeAmount * 0.2),
      0,
    )
    const totalRevenue = serviceChargeRevenue + platformFeeRevenue + deliveryFeeRevenue
    const activeRiders = riderRows.filter((rider) =>
      ['available', 'busy'].includes(rider.availabilityStatus),
    )
    const activeRestaurants = restaurantRows.filter(
      (restaurant) => restaurant.status === 'active',
    )
    const paymentIssues = paymentRows.filter((payment) =>
      ['failed', 'cancelled'].includes(payment.status),
    )
    const openIssues = issueRows.filter((issue) =>
      ['open', 'in_review'].includes(issue.status),
    )

    return reply.status(200).send({
      stats: {
        revenueAmount: totalRevenue,
        orderCount: totalOrders,
        activeRiderCount: activeRiders.length,
        activeVendorCount: activeRestaurants.length,
        cancelRate: totalOrders > 0 ? (cancelledOrders.length / totalOrders) * 100 : 0,
      },
      quickStats: {
        totalOrders,
        totalDeliveries: deliveredOrders.length,
        totalRevenueAmount: totalRevenue,
        paymentIssueCount: paymentIssues.length,
      },
      systemStatus: {
        orderProcessing: 'Online',
        restaurantsOnline: activeRestaurants.length,
        ridersAvailable: riderRows.filter(
          (rider) => rider.availabilityStatus === 'available',
        ).length,
        paymentGateway: paymentIssues.length > 0 ? 'Degraded' : 'Online',
      },
      pendingActions: {
        vendorApprovals: restaurantRows.filter(
          (restaurant) => !restaurant.isVerified || restaurant.status !== 'active',
        ).length,
        salesAgentApprovals: salesAgentRows.filter(
          (agent) => agent.status === 'pending',
        ).length,
        disputeResolution: openIssues.length,
      },
      recentOrders,
      topVendors: buildTopVendors(orderRows, restaurantRows),
      disputes: issueRows
        .slice(0, 5)
        .map((issue) => ({
          id: issue.id,
          reason: issue.reason,
          status: issue.status,
          orderId: issue.orderId,
          createdAt: issue.createdAt,
        })),
    })
  })

  app.get('/orders', async (request, reply) => {
    const auth = await requireAdmin(request.headers.cookie, reply)
    if (!auth) return

    const orderRows = await selectAdminOrders(50)

    return reply.status(200).send({
      stats: buildOrderStats(orderRows),
      orders: orderRows,
    })
  })

  app.get('/orders/:orderId', async (request, reply) => {
    const auth = await requireAdmin(request.headers.cookie, reply)
    if (!auth) return

    const parsedParams = orderParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please choose a valid order.',
      })
    }

    const [order] = await selectAdminOrders(1, parsedParams.data.orderId)
    if (!order) {
      return reply.status(404).send({
        error: 'order_not_found',
        message: 'Order not found.',
      })
    }

    const items = await selectAdminOrderItems(order.id)

    return reply.status(200).send({ order: { ...order, items } })
  })
}

async function requireAdmin(cookieHeader: string | undefined, reply: FastifyReply) {
  const sessionContext = await getCurrentSessionContext(cookieHeader)

  if (!sessionContext) {
    reply
      .status(401)
      .header('Set-Cookie', serializeClearSessionCookie())
      .send({
        error: 'unauthenticated',
        message: 'Please log in to continue.',
      })
    return null
  }

  if (!sessionContext.authPayload.roles.includes('admin')) {
    reply.status(403).send({
      error: 'forbidden',
      message: 'This route is only available to admins.',
    })
    return null
  }

  return sessionContext
}

async function selectAdminOrders(limit: number, orderId?: string) {
  const baseRows = await database
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      totalAmount: orders.totalAmount,
      currency: orders.currency,
      deliveryPhone: orders.deliveryPhone,
      deliveryStreetAddress: orders.deliveryStreetAddress,
      deliveryServiceArea: orders.deliveryServiceArea,
      customerId: orders.customerId,
      restaurantId: orders.restaurantId,
      restaurantName: restaurants.name,
      restaurantImageUrl: restaurants.imageUrl,
      placedAt: orders.placedAt,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .innerJoin(restaurants, eq(orders.restaurantId, restaurants.id))
    .where(orderId ? eq(orders.id, orderId) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(limit)

  const orderIds = baseRows.map((order) => order.id)
  const customerIds = baseRows.map((order) => order.customerId)

  const [deliveryRows, paymentRows, customerProfiles] = await Promise.all([
    orderIds.length
      ? database.select().from(deliveries).where(inArray(deliveries.orderId, orderIds))
      : [],
    orderIds.length
      ? database.select().from(payments).where(inArray(payments.orderId, orderIds))
      : [],
    customerIds.length
      ? database.select().from(profiles).where(inArray(profiles.userId, customerIds))
      : [],
  ])

  const riderIds = deliveryRows
    .map((delivery) => delivery.riderId)
    .filter((riderId): riderId is string => Boolean(riderId))
  const riderProfiles = riderIds.length
    ? await database.select().from(profiles).where(inArray(profiles.userId, riderIds))
    : []

  const customerProfileById = new Map(
    customerProfiles.map((profile) => [profile.userId, profile]),
  )
  const riderProfileById = new Map(riderProfiles.map((profile) => [profile.userId, profile]))
  const deliveryByOrderId = new Map(deliveryRows.map((delivery) => [delivery.orderId, delivery]))
  const paymentByOrderId = new Map(paymentRows.map((payment) => [payment.orderId, payment]))

  return baseRows.map((order) => {
    const customer = customerProfileById.get(order.customerId)
    const delivery = deliveryByOrderId.get(order.id)
    const rider = delivery?.riderId ? riderProfileById.get(delivery.riderId) : null
    const payment = paymentByOrderId.get(order.id)

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: order.totalAmount,
      currency: order.currency,
      placedAt: order.placedAt ?? order.createdAt,
      customer: {
        id: order.customerId,
        name: customer?.fullName ?? 'Customer',
        phone: customer?.phone ?? order.deliveryPhone,
        avatarUrl: customer?.avatarUrl ?? null,
      },
      restaurant: {
        id: order.restaurantId,
        name: order.restaurantName,
        imageUrl: order.restaurantImageUrl,
      },
      rider: rider
        ? {
            id: delivery?.riderId ?? '',
            name: rider.fullName,
            phone: rider.phone,
            avatarUrl: rider.avatarUrl,
          }
        : null,
      delivery: {
        streetAddress: order.deliveryStreetAddress,
        serviceArea: order.deliveryServiceArea,
        status: delivery?.status ?? 'unassigned',
      },
      payment: {
        method: payment?.method ?? null,
        provider: payment?.provider ?? null,
        status: payment?.status ?? 'pending',
      },
    }
  })
}

async function selectAdminOrderItems(orderId: string) {
  const itemRows = await database
    .select({
      id: orderItems.id,
      name: orderItems.itemName,
      quantity: orderItems.quantity,
      lineTotalAmount: orderItems.lineTotalAmount,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))

  const itemIds = itemRows.map((item) => item.id)
  const componentRows = itemIds.length
    ? await database
        .select({
          orderItemId: orderItemComponents.orderItemId,
          itemName: orderItemComponents.itemName,
          quantity: orderItemComponents.quantity,
        })
        .from(orderItemComponents)
        .where(inArray(orderItemComponents.orderItemId, itemIds))
    : []

  return itemRows.map((item) => ({
    ...item,
    components: componentRows.filter((component) => component.orderItemId === item.id),
  }))
}

function buildOrderStats(orderRows: Awaited<ReturnType<typeof selectAdminOrders>>) {
  return {
    totalOrders: orderRows.length,
    pending: orderRows.filter((order) =>
      ['pending_payment', 'awaiting_restaurant'].includes(order.status),
    ).length,
    inProgress: orderRows.filter((order) =>
      ['preparing', 'ready_for_pickup', 'on_the_way'].includes(order.status),
    ).length,
    delivered: orderRows.filter((order) => order.status === 'delivered').length,
    cancelled: orderRows.filter((order) => order.status === 'cancelled').length,
  }
}

function buildTopVendors(
  orderRows: (typeof orders.$inferSelect)[],
  restaurantRows: (typeof restaurants.$inferSelect)[],
) {
  return restaurantRows
    .map((restaurant) => {
      const restaurantOrders = orderRows.filter(
        (order) => order.restaurantId === restaurant.id,
      )

      return {
        id: restaurant.id,
        name: restaurant.name,
        imageUrl: restaurant.imageUrl,
        orderCount: restaurantOrders.length,
        revenueAmount: restaurantOrders.reduce(
          (total, order) => total + order.totalAmount,
          0,
        ),
        ratingAverage: null,
      }
    })
    .sort((a, b) => b.revenueAmount - a.revenueAmount)
    .slice(0, 5)
}

function sendInvalidAdminLogin(reply: FastifyReply) {
  return reply.status(401).send({
    error: 'invalid_credentials',
    message: 'Invalid admin email or password.',
  })
}

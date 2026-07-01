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
  combos,
  commissions,
  notifications,
  orders,
  payoutAccounts,
  profiles,
  referrals,
  restaurants,
  salesAgentProfiles,
  users,
} from '../db/schema.js'

const loginBodySchema = z.object({
  code: z.string().trim().min(1),
  password: z.string().min(1),
})

const notificationParamsSchema = z.object({
  notificationId: z.uuid(),
})

export async function salesAgentRoutes(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
    const parsedBody = loginBodySchema.safeParse(request.body)

    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please enter your agent code and password.',
      })
    }

    try {
      const [agentUser] = await database
        .select({
          userId: users.id,
          email: users.email,
          status: users.status,
          createdAt: users.createdAt,
          passwordHash: users.passwordHash,
          agentStatus: salesAgentProfiles.status,
        })
        .from(salesAgentProfiles)
        .innerJoin(users, eq(salesAgentProfiles.userId, users.id))
        .where(eq(salesAgentProfiles.agentCode, parsedBody.data.code))
        .limit(1)

      if (!agentUser) return sendInvalidAgentLogin(reply)

      const passwordMatches = await verifyPassword(
        parsedBody.data.password,
        agentUser.passwordHash,
      )

      if (!passwordMatches) return sendInvalidAgentLogin(reply)

      if (
        agentUser.status === 'suspended' ||
        agentUser.status === 'disabled' ||
        agentUser.agentStatus !== 'active'
      ) {
        return reply.status(403).send({
          error: 'account_unavailable',
          message: 'This sales agent account is not available yet.',
        })
      }

      const session = createSessionToken()

      await database.insert(authSessions).values({
        userId: agentUser.userId,
        tokenHash: session.tokenHash,
        expiresAt: session.expiresAt,
      })

      const agent = await getSalesAgentProfile(agentUser.userId)

      return reply
        .status(200)
        .header('Set-Cookie', serializeSessionCookie(session))
        .send({
          user: {
            id: agentUser.userId,
            email: agentUser.email,
            status: agentUser.status,
            createdAt: agentUser.createdAt,
          },
          profile: agent?.profile ?? null,
          roles: ['sales_agent'],
          salesAgent: agent?.salesAgent ?? null,
        })
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({
        error: 'sales_agent_login_failed',
        message: 'Sales agent login failed. Please try again.',
      })
    }
  })

  app.get('/me', async (request, reply) => {
    const auth = await requireSalesAgent(request.headers.cookie, reply)
    if (!auth) return

    try {
      const agent = await getSalesAgentProfile(auth.userId)
      if (!agent) return sendSalesAgentNotFound(reply)

      const [payoutAccount] = await database
        .select({
          accountName: payoutAccounts.accountName,
          accountNumberLast4: payoutAccounts.accountNumberLast4,
          isVerified: payoutAccounts.isVerified,
        })
        .from(payoutAccounts)
        .where(eq(payoutAccounts.userId, auth.userId))
        .limit(1)

      return reply.status(200).send({
        ...agent,
        payoutAccount: payoutAccount ?? null,
      })
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({
        error: 'sales_agent_profile_failed',
        message: 'Unable to load sales agent profile.',
      })
    }
  })

  app.get('/dashboard', async (request, reply) => {
    const auth = await requireSalesAgent(request.headers.cookie, reply)
    if (!auth) return

    try {
      const agent = await getSalesAgentProfile(auth.userId)
      if (!agent) return sendSalesAgentNotFound(reply)

      const stats = await getSalesAgentStats(auth.userId)
      const upgradedAgent = await qualifyInfluencerIfReady(auth.userId, agent, stats)
      const shareCombos = await getShareableCombos(auth.userId)

      return reply.status(200).send({
        agent: upgradedAgent,
        stats,
        shareCombos,
        influencerSignupUrl:
          upgradedAgent.salesAgent.tier === 'influencer'
            ? buildWebUrl(`/sales-agent/signup?ref=${upgradedAgent.salesAgent.referralCode}`)
            : null,
      })
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({
        error: 'sales_agent_dashboard_failed',
        message: 'Unable to load sales agent dashboard.',
      })
    }
  })

  app.get('/referrals', async (request, reply) => {
    const auth = await requireSalesAgent(request.headers.cookie, reply)
    if (!auth) return

    try {
      const stats = await getSalesAgentStats(auth.userId)
      const referralRows = await database
        .select({
          id: referrals.id,
          status: referrals.status,
          attributedAt: referrals.attributedAt,
          fullName: profiles.fullName,
          email: users.email,
        })
        .from(referrals)
        .innerJoin(users, eq(referrals.customerId, users.id))
        .innerJoin(profiles, eq(referrals.customerId, profiles.userId))
        .where(eq(referrals.salesAgentId, auth.userId))
        .orderBy(desc(referrals.attributedAt))
        .limit(50)

      return reply.status(200).send({
        stats,
        referrals: referralRows,
      })
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({
        error: 'sales_agent_referrals_failed',
        message: 'Unable to load sales agent referrals.',
      })
    }
  })

  app.get('/combos', async (request, reply) => {
    const auth = await requireSalesAgent(request.headers.cookie, reply)
    if (!auth) return

    try {
      return reply.status(200).send({
        combos: await getShareableCombos(auth.userId),
      })
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({
        error: 'sales_agent_combos_failed',
        message: 'Unable to load shareable combos.',
      })
    }
  })

  app.get('/notifications', async (request, reply) => {
    const auth = await requireSalesAgent(request.headers.cookie, reply)
    if (!auth) return

    return reply.status(200).send({
      notifications: await getUserNotifications(auth.userId),
    })
  })

  app.patch('/notifications/:notificationId/read', async (request, reply) => {
    const auth = await requireSalesAgent(request.headers.cookie, reply)
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
    const auth = await requireSalesAgent(request.headers.cookie, reply)
    if (!auth) return

    await database
      .update(notifications)
      .set({ readAt: new Date() })
      .where(eq(notifications.userId, auth.userId))

    return reply.status(204).send()
  })
}

async function requireSalesAgent(
  cookieHeader: string | undefined,
  reply: FastifyReply,
) {
  const sessionContext = await getCurrentSessionContext(cookieHeader)

  if (!sessionContext) {
    sendUnauthenticated(reply)
    return null
  }

  if (!sessionContext.authPayload.roles.includes('sales_agent')) {
    reply.status(403).send({
      error: 'forbidden',
      message: 'This route is only available to sales agents.',
    })
    return null
  }

  return sessionContext
}

async function getSalesAgentProfile(userId: string) {
  const [row] = await database
    .select({
      userId: users.id,
      email: users.email,
      status: users.status,
      fullName: profiles.fullName,
      phone: profiles.phone,
      avatarUrl: profiles.avatarUrl,
      agentCode: salesAgentProfiles.agentCode,
      referralCode: salesAgentProfiles.referralCode,
      agentStatus: salesAgentProfiles.status,
      tier: salesAgentProfiles.tier,
      commissionRateBps: salesAgentProfiles.commissionRateBps,
    })
    .from(salesAgentProfiles)
    .innerJoin(users, eq(salesAgentProfiles.userId, users.id))
    .innerJoin(profiles, eq(salesAgentProfiles.userId, profiles.userId))
    .where(eq(salesAgentProfiles.userId, userId))
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
    salesAgent: {
      agentCode: row.agentCode,
      referralCode: row.referralCode,
      status: row.agentStatus,
      tier: row.tier,
      commissionRateBps: row.commissionRateBps,
    },
  }
}

async function getSalesAgentStats(userId: string) {
  const referralRows = await database
    .select({
      id: referrals.id,
      customerId: referrals.customerId,
    })
    .from(referrals)
    .where(eq(referrals.salesAgentId, userId))

  const customerIds = referralRows.map((referral) => referral.customerId)

  const deliveredOrders =
    customerIds.length === 0
      ? []
      : await database
          .select({
            id: orders.id,
            orderNumber: orders.orderNumber,
            totalAmount: orders.totalAmount,
            status: orders.status,
            createdAt: orders.createdAt,
          })
          .from(orders)
          .where(
            and(
              inArray(orders.customerId, customerIds),
              eq(orders.status, 'delivered'),
            ),
          )
          .orderBy(desc(orders.createdAt))

  const commissionRows = await database
    .select({
      commissionAmount: commissions.commissionAmount,
      status: commissions.status,
    })
    .from(commissions)
    .where(eq(commissions.salesAgentId, userId))

  const totalCommissionAmount = commissionRows.reduce(
    (total, commission) => total + commission.commissionAmount,
    0,
  )

  return {
    referralCount: referralRows.length,
    successfulOrderCount: deliveredOrders.length,
    trackedRevenueAmount: deliveredOrders.reduce(
      (total, order) => total + order.totalAmount,
      0,
    ),
    totalCommissionAmount,
    influencerThreshold: 10,
    remainingOrdersToInfluencer: Math.max(10 - deliveredOrders.length, 0),
    recentOrders: deliveredOrders.slice(0, 10),
  }
}

async function qualifyInfluencerIfReady(
  userId: string,
  agent: NonNullable<Awaited<ReturnType<typeof getSalesAgentProfile>>>,
  stats: Awaited<ReturnType<typeof getSalesAgentStats>>,
) {
  if (
    stats.successfulOrderCount < stats.influencerThreshold ||
    agent.salesAgent.tier === 'influencer'
  ) {
    return agent
  }

  await database.transaction(async (tx) => {
    await tx
      .update(salesAgentProfiles)
      .set({
        tier: 'influencer',
        updatedAt: new Date(),
      })
      .where(eq(salesAgentProfiles.userId, userId))

    await tx.insert(notifications).values({
      userId,
      type: 'sales_agent_influencer_qualified',
      title: 'Influencer tier unlocked',
      body: 'You now qualify as an influencer. You can share your sales-agent referral link after admin approval of each downline agent.',
      data: {
        successfulOrderCount: stats.successfulOrderCount,
      },
    })
  })

  return {
    ...agent,
    salesAgent: {
      ...agent.salesAgent,
      tier: 'influencer',
    },
  }
}

async function getShareableCombos(agentUserId: string) {
  const rows = await database
    .select({
      id: combos.id,
      slug: combos.slug,
      name: combos.name,
      description: combos.description,
      priceAmount: combos.priceAmount,
      imageUrl: combos.imageUrl,
      restaurantName: restaurants.name,
      restaurantSlug: restaurants.slug,
    })
    .from(combos)
    .innerJoin(restaurants, eq(combos.restaurantId, restaurants.id))
    .where(and(eq(combos.isAvailable, true), eq(restaurants.status, 'active')))
    .orderBy(desc(combos.isFeatured), desc(combos.createdAt))
    .limit(30)

  return rows.map((combo) => ({
    id: combo.id,
    slug: combo.slug,
    name: combo.name,
    description: combo.description,
    priceAmount: combo.priceAmount,
    imageUrl: combo.imageUrl,
    restaurantName: combo.restaurantName,
    shareUrl: buildWebUrl(
      `/customer/dashboard?combo=${combo.slug}&sa=${agentUserId}`,
    ),
  }))
}

function buildWebUrl(path: string) {
  const origin = process.env.WEB_ORIGIN?.split(',')[0] ?? 'http://localhost:3000'
  return `${origin}${path}`
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

function sendSalesAgentNotFound(reply: FastifyReply) {
  return reply.status(404).send({
    error: 'sales_agent_profile_not_found',
    message: 'Sales agent profile not found.',
  })
}

function sendInvalidAgentLogin(reply: FastifyReply) {
  return reply.status(401).send({
    error: 'invalid_credentials',
    message: 'Invalid agent code or password.',
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

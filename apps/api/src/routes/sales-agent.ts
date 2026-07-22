import type { FastifyInstance, FastifyReply } from 'fastify'
import { randomBytes } from 'node:crypto'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'

import { getCurrentSessionContext } from '../auth/current-session.js'
import {
  createSessionToken,
  hashPassword,
  serializeClearSessionCookie,
  serializeSessionCookie,
  verifyPassword,
} from '../auth/index.js'
import { buildWebUrl } from '../config/web-url.js'
import { database } from '../db/client.js'
import {
  authSessions,
  comboCampaigns,
  combos,
  commissions,
  notifications,
  orders,
  payoutAccounts,
  payoutRequests,
  profiles,
  referrals,
  restaurants,
  salesAgentProfiles,
  userRoles,
  users,
} from '../db/schema.js'

const signupBodySchema = z.object({
  email: z.email().trim().toLowerCase(),
  fullName: z.string().trim().min(1).max(120),
  password: z
    .string()
    .min(6)
    .regex(/[A-Z]/, 'Password must include at least one uppercase letter.')
    .regex(/\d/, 'Password must include at least one number.'),
  referralCode: z.string().trim().min(1),
})

const loginBodySchema = z.object({
  code: z.string().trim().min(1),
  password: z.string().min(1),
})

const notificationParamsSchema = z.object({
  notificationId: z.uuid(),
})

export async function salesAgentRoutes(app: FastifyInstance) {
  app.post('/signup', async (request, reply) => {
    const parsedBody = signupBodySchema.safeParse(request.body)

    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please check the signup details and try again.',
      })
    }

    const { email, fullName, password, referralCode } = parsedBody.data

    try {
      const [upline] = await database
        .select({
          userId: salesAgentProfiles.userId,
          status: salesAgentProfiles.status,
          tier: salesAgentProfiles.tier,
        })
        .from(salesAgentProfiles)
        .where(eq(salesAgentProfiles.referralCode, referralCode))
        .limit(1)

      if (!upline || upline.status !== 'active' || upline.tier !== 'influencer') {
        return reply.status(403).send({
          error: 'invalid_sales_agent_referral',
          message: 'A verified influencer referral link is required to apply as a sales agent.',
        })
      }

      const result = await database.transaction(async (tx) => {
        const [existingUser] = await tx
          .select({
            id: users.id,
            email: users.email,
            passwordHash: users.passwordHash,
            status: users.status,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(sql`lower(${users.email}) = ${email}`)
          .limit(1)

        const createdUser = existingUser ?? (
          await tx
            .insert(users)
            .values({
              email,
              passwordHash: await hashPassword(password),
            })
            .returning({
              id: users.id,
              email: users.email,
              passwordHash: users.passwordHash,
              status: users.status,
              createdAt: users.createdAt,
            })
        )[0]

        if (!createdUser) throw new Error('User creation failed.')
        if (existingUser && !(await verifyPassword(password, existingUser.passwordHash))) {
          throw new ExistingEmailPasswordMismatchError()
        }

        const [existingAgentProfile] = await tx
          .select({ userId: salesAgentProfiles.userId })
          .from(salesAgentProfiles)
          .where(eq(salesAgentProfiles.userId, createdUser.id))
          .limit(1)

        if (existingAgentProfile) throw new ExistingSalesAgentRoleError()

        await tx
          .insert(profiles)
          .values({
            userId: createdUser.id,
            fullName,
          })
          .onConflictDoUpdate({
            target: profiles.userId,
            set: {
              fullName,
              updatedAt: new Date(),
            },
          })

        await tx
          .insert(userRoles)
          .values({
            userId: createdUser.id,
            role: 'sales_agent',
          })
          .onConflictDoNothing()

        const agentCode = await generateUniqueAgentCode(tx)
        const newReferralCode = await generateUniqueReferralCode(tx)

        await tx.insert(salesAgentProfiles).values({
          userId: createdUser.id,
          agentCode,
          referralCode: newReferralCode,
          uplineSalesAgentId: upline.userId,
          status: 'pending',
          tier: 'standard',
        })

        await tx.insert(notifications).values({
          userId: upline.userId,
          type: 'sales_agent_downline_application',
          title: 'New sales agent application',
          body: `${fullName} applied through your influencer referral link. Admin approval is required.`,
          data: {
            applicantUserId: createdUser.id,
            applicantEmail: createdUser.email,
          },
        })

        return {
          user: createdUser,
          profile: { fullName },
          salesAgent: {
            agentCode,
            referralCode: newReferralCode,
            status: 'pending',
            tier: 'standard',
          },
        }
      })

      return reply.status(201).send(result)
    } catch (error) {
      if (error instanceof ExistingEmailPasswordMismatchError) {
        return reply.status(409).send({
          error: 'email_password_mismatch',
          message: 'This email already exists. Enter the existing account password to add the sales agent role.',
        })
      }

      if (error instanceof ExistingSalesAgentRoleError) {
        return reply.status(409).send({
          error: 'sales_agent_role_exists',
          message: 'This account already has a sales agent profile.',
        })
      }

      if (isUniqueViolation(error)) {
        return reply.status(409).send({
          error: 'email_already_exists',
          message: 'An account with this email already exists.',
        })
      }

      request.log.error(error)

      return reply.status(500).send({
        error: 'sales_agent_signup_failed',
        message: 'Sales agent signup failed. Please try again.',
      })
    }
  })

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
        payout: {
          availableAmount: await getAvailableAgentPayoutAmount(auth.userId),
        },
        payoutRequests: await getAgentPayoutRequests(auth.userId),
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

  app.post('/payout-requests', async (request, reply) => {
    const auth = await requireSalesAgent(request.headers.cookie, reply)
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

    const amount = await getAvailableAgentPayoutAmount(auth.userId)

    if (amount <= 0) {
      return reply.status(409).send({
        error: 'no_available_payout',
        message: 'There are no available commissions to request.',
      })
    }

    const [payoutRequest] = await database
      .insert(payoutRequests)
      .values({
        requestedByUserId: auth.userId,
        userId: auth.userId,
        type: 'agent_commissions',
        payoutAccountId: payoutAccount.id,
        amount,
      })
      .returning()

    await database.insert(notifications).values({
      userId: auth.userId,
      type: 'agent_payout_requested',
      title: 'Payout request sent',
      body: `Your ${formatMoney(amount)} commission payout request has been sent to admin.`,
      data: { payoutRequestId: payoutRequest.id, amount },
    })

    return reply.status(201).send({ payoutRequest })
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
      campaignFlyerUrl: comboCampaigns.flyerUrl,
      campaignContent: comboCampaigns.content,
      campaignStartsAt: comboCampaigns.startsAt,
      campaignEndsAt: comboCampaigns.endsAt,
      campaignStatus: comboCampaigns.status,
    })
    .from(combos)
    .innerJoin(restaurants, eq(combos.restaurantId, restaurants.id))
    .innerJoin(comboCampaigns, eq(combos.id, comboCampaigns.comboId))
    .where(
      and(
        eq(combos.isAvailable, true),
        eq(restaurants.status, 'active'),
        inArray(comboCampaigns.status, ['active', 'scheduled']),
        sql`(${comboCampaigns.endsAt} IS NULL OR ${comboCampaigns.endsAt} > NOW())`,
        sql`(${comboCampaigns.startsAt} IS NULL OR ${comboCampaigns.startsAt} <= NOW())`,
      ),
    )
    .orderBy(desc(combos.isFeatured), desc(combos.createdAt))
    .limit(30)

  return rows.map((combo) => ({
    id: combo.id,
    slug: combo.slug,
    name: combo.name,
    description: combo.description,
    priceAmount: combo.priceAmount,
    imageUrl: combo.campaignFlyerUrl ?? combo.imageUrl,
    restaurantName: combo.restaurantName,
    campaignContent: combo.campaignContent,
    shareUrl: buildWebUrl(`/customer/featured-combos/${combo.id}?sa=${agentUserId}`),
  }))
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

type SalesAgentCodeStore = Pick<typeof database, 'select'>

async function generateUniqueAgentCode(tx: SalesAgentCodeStore) {
  return generateUniqueSalesAgentCode(tx, 'agent')
}

async function generateUniqueReferralCode(tx: SalesAgentCodeStore) {
  return generateUniqueSalesAgentCode(tx, 'referral')
}

async function generateUniqueSalesAgentCode(
  tx: SalesAgentCodeStore,
  type: 'agent' | 'referral',
) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = `${type === 'agent' ? 'SA' : 'REF'}-${randomBytes(3)
      .toString('hex')
      .toUpperCase()}`
    const [existing] = await tx
      .select({ userId: salesAgentProfiles.userId })
      .from(salesAgentProfiles)
      .where(
        type === 'agent'
          ? eq(salesAgentProfiles.agentCode, code)
          : eq(salesAgentProfiles.referralCode, code),
      )
      .limit(1)

    if (!existing) return code
  }

  throw new Error('Unable to generate unique sales agent code.')
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  )
}

async function getAvailableAgentPayoutAmount(userId: string) {
  const commissionRows = await database
    .select({ commissionAmount: commissions.commissionAmount })
    .from(commissions)
    .where(
      and(
        eq(commissions.salesAgentId, userId),
        inArray(commissions.status, ['pending', 'earned', 'approved']),
      ),
    )

  const requestedRows = await database
    .select({ amount: payoutRequests.amount })
    .from(payoutRequests)
    .where(
      and(
        eq(payoutRequests.userId, userId),
        eq(payoutRequests.type, 'agent_commissions'),
        inArray(payoutRequests.status, [
          'pending',
          'under_review',
          'approved',
          'processing',
          'paid',
        ]),
      ),
    )

  const earnedAmount = commissionRows.reduce(
    (total, commission) => total + commission.commissionAmount,
    0,
  )
  const requestedAmount = requestedRows.reduce(
    (total, request) => total + request.amount,
    0,
  )

  return Math.max(earnedAmount - requestedAmount, 0)
}

function getAgentPayoutRequests(userId: string) {
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
        eq(payoutRequests.type, 'agent_commissions'),
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

function sendUnauthenticated(reply: FastifyReply) {
  return reply
    .status(401)
    .header('Set-Cookie', serializeClearSessionCookie())
    .send({
      error: 'unauthenticated',
      message: 'Please log in to continue.',
    })
}

class ExistingEmailPasswordMismatchError extends Error {}

class ExistingSalesAgentRoleError extends Error {}
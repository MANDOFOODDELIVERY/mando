import type { FastifyInstance, FastifyReply } from 'fastify'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'

import {
  createSessionToken,
  hashPassword,
  serializeClearSessionCookie,
  serializeSessionCookie,
  verifyPassword,
} from '../auth/index.js'
import { getCurrentSessionContext } from '../auth/current-session.js'
import { database } from '../db/client.js'
import {
  adminPayoutSettings,
  adminSettings,
  authSessions,
  comboCampaignEvents,
  comboCampaigns,
  comboItems,
  combos,
  commissions,
  deliveries,
  menuItems,
  orderIssues,
  orderItemComponents,
  orderItems,
  orderStatusEvents,
  orders,
  payoutAccounts,
  payoutRequests,
  payments,
  profiles,
  referrals,
  restaurantEarnings,
  restaurantMembers,
  restaurantOperations,
  restaurants,
  riderDeliveryFeeSettings,
  riderDocuments,
  riderProfiles,
  riderServiceAreas,
  riderVehicles,
  salesAgentProfiles,
  serviceAreas,
  userRoles,
  users,
  vendorDocuments,
  reviews,
} from '../db/schema.js'

const loginBodySchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
})

const orderParamsSchema = z.object({
  orderId: z.uuid(),
})

const vendorParamsSchema = z.object({
  vendorId: z.uuid(),
})

const riderParamsSchema = z.object({
  riderId: z.uuid(),
})

const menuItemBodySchema = z.object({
  itemName: z.string().trim().min(2),
  category: z.string().trim().min(1),
  clientPrice: z.coerce.number().int().nonnegative(),
  mandoPrice: z.coerce.number().int().nonnegative().optional(),
  imageUrl: z.url().nullable().optional(),
  isSubItem: z.boolean().optional(),
})

const menuItemUpdateBodySchema = z.object({
  itemName: z.string().trim().min(2).optional(),
  category: z.string().trim().min(1).optional(),
  clientPrice: z.coerce.number().int().nonnegative().optional(),
  mandoPrice: z.coerce.number().int().nonnegative().optional(),
  imageUrl: z.url().nullable().optional(),
  isAvailable: z.boolean().optional(),
  isSubItem: z.boolean().optional(),
})

const menuItemParamsSchema = z.object({
  vendorId: z.uuid(),
  itemId: z.uuid(),
})

const vendorBodySchema = z.object({
  restaurantName: z.string().trim().min(2),
  fullAddress: z.string().trim().min(4),
  serviceArea: z.string().trim().min(2),
  logoUrl: z.url().nullable().optional(),
  ownerName: z.string().trim().min(2),
  phone: z.string().trim().min(5),
  email: z.email().trim().toLowerCase(),
  website: z.string().trim().optional(),
  openingTime: z.string().trim().optional(),
  closingTime: z.string().trim().optional(),
  openDays: z.string().trim().optional(),
  deliveryRadius: z.string().trim().optional(),
  minimumOrder: z.coerce.number().int().nonnegative().default(0),
  deliveryType: z.string().trim().optional(),
  cacCertificateUrl: z.url().nullable().optional(),
  foodHandlerCertificateUrl: z.url().nullable().optional(),
  taxIdentificationNumber: z.string().trim().optional(),
  healthSafetyPermitUrl: z.url().nullable().optional(),
})

const riderBodySchema = z.object({
  fullName: z.string().trim().min(2),
  email: z.email().trim().toLowerCase(),
  phone: z.string().trim().min(5),
  address: z.string().trim().min(4),
  vehicleType: z.enum(['Motorcycle', 'Bicycle', 'Car']),
  plateNumber: z.string().trim().optional(),
  vehicleColor: z.string().trim().optional(),
  vehicleModel: z.string().trim().optional(),
  serviceArea: z.string().trim().min(2),
  serviceAreas: z.array(z.string().trim().min(2)).optional(),
  governmentIdUrl: z.url().nullable().optional(),
  vehicleLicenseUrl: z.url().nullable().optional(),
  proofOfAddressUrl: z.url().nullable().optional(),
  bankName: z.string().trim().min(2),
  accountNumber: z.string().trim().min(4),
  accountName: z.string().trim().min(2),
})

const riderVehicleFeeSettingSchema = z.object({
  id: z.enum(['motorcycle', 'bicycle', 'car']),
  deliveryFee: z.coerce.number().int().nonnegative(),
  mandoCutPercent: z.coerce.number().int().min(0).max(100),
})

const commissionBodySchema = z.object({
  commissionRatePercent: z.coerce.number().min(0).max(100),
})

const payoutSettingsBodySchema = z.object({
  frequency: z.string().trim().min(1),
  payoutTime: z.string().trim().min(1),
  minimumWithdrawal: z.coerce.number().int().nonnegative(),
  autoProcess: z.boolean(),
  autoDeductCommission: z.boolean().optional(),
  vehicleFeeSettings: z.array(riderVehicleFeeSettingSchema).optional(),
})

const payoutRequestParamsSchema = z.object({
  requestId: z.uuid(),
})

const payoutStatusBodySchema = z.object({
  status: z.enum(['approved', 'rejected']),
})

const vendorStatusBodySchema = z.object({
  status: z.enum(['active', 'paused', 'archived']),
})

const riderStatusBodySchema = z.object({
  status: z.enum(['active', 'suspended']),
})

const riderZoneBodySchema = z.object({
  serviceArea: z.string().trim().min(2).optional(),
  serviceAreas: z.array(z.string().trim().min(2)).min(1).optional(),
}).refine((value) => Boolean(value.serviceArea || value.serviceAreas?.length), {
  message: 'Choose at least one service area.',
})

const serviceChargesBodySchema = z.object({
  serviceChargeAmount: z.coerce.number().int().nonnegative(),
  deliveryFeeAmount: z.coerce.number().int().nonnegative(),
  appliesTo: z.string().trim().optional(),
  effectiveDate: z.string().trim().optional(),
  serviceChargesByArea: z
    .record(z.string(), z.coerce.number().int().nonnegative())
    .optional(),
})

const operationsDeliveryPricingBodySchema = z.object({
  baseFeeAmount: z.coerce.number().int().nonnegative(),
  feePerKmAmount: z.coerce.number().int().nonnegative(),
  minimumFeeAmount: z.coerce.number().int().nonnegative(),
  freeDeliveryThresholdAmount: z.coerce.number().int().nonnegative().optional(),
  serviceAreaOverrides: z
    .array(
      z.object({
        serviceAreaId: z.uuid(),
        deliveryFeeAmount: z.coerce.number().int().nonnegative(),
      }),
    )
    .default([]),
})

const serviceAreaParamsSchema = z.object({
  serviceAreaId: z.uuid(),
})

const adminServiceAreaBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(120),
  isActive: z.boolean().optional(),
})

const transactionParamsSchema = z.object({
  transactionId: z.uuid(),
})

const salesAgentParamsSchema = z.object({
  agentId: z.uuid(),
})

const salesAgentBodySchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  address: z.string().trim().optional(),
  phone: z.string().trim().min(5),
  email: z.email().trim().toLowerCase(),
  agentType: z.string().trim().default('Sales agent'),
  level: z.string().trim().default('Starter'),
  referralCode: z.string().trim().optional(),
  bankName: z.string().trim().optional(),
  accountNumber: z.string().trim().optional(),
  accountName: z.string().trim().optional(),
})

const salesAgentUpdateBodySchema = z.object({
  fullName: z.string().trim().min(2).optional(),
  phone: z.string().trim().min(5).optional(),
  email: z.email().trim().toLowerCase().optional(),
  agentCode: z.string().trim().optional(),
  status: z.enum(['active', 'pending', 'suspended']).optional(),
  commissionRate: z.coerce.number().min(0).max(100).optional(),
})

const salesAgentStatusBodySchema = z.object({
  status: z.enum(['active', 'pending', 'suspended']),
})

const influencerBodySchema = z.object({
  influencer: z.boolean(),
})

const adminSettingsBodySchema = z.record(z.string(), z.unknown())

const adminComboItemBodySchema = z.object({
  name: z.string().trim().min(1),
  quantity: z.coerce.number().int().positive().default(1),
  extraPrice: z.coerce.number().int().nonnegative().default(0),
})

const adminComboCampaignBodySchema = z.object({
  flyerUrl: z.string().trim().nullable().optional(),
  flyerPublicId: z.string().trim().nullable().optional(),
  content: z.string().trim().optional(),
  startsAt: z.string().trim().nullable().optional(),
  endsAt: z.string().trim().nullable().optional(),
  status: z.enum(['draft', 'scheduled', 'active', 'paused', 'expired']).default('draft'),
})
const adminComboBodySchema = z.object({
  name: z.string().trim().min(2),
  restaurant: z.string().trim().min(2),
  category: z.string().trim().optional(),
  description: z.string().trim().optional(),
  imageUrl: z.string().trim().optional(),
  price: z.coerce.number().int().positive(),
  mandoPrice: z.coerce.number().int().nonnegative().optional(),
  restaurantPayout: z.coerce.number().int().nonnegative().optional(),
  status: z.enum(['active', 'draft', 'paused', 'sold out']).default('active'),
  isFeatured: z.boolean().default(false),
  isPromoCombo: z.boolean().default(false),
  serviceArea: z.string().trim().optional(),
  campaign: adminComboCampaignBodySchema.optional(),
  items: z.array(adminComboItemBodySchema).min(1),
})

const adminComboUpdateBodySchema = adminComboBodySchema.partial().extend({
  status: z.enum(['active', 'draft', 'paused', 'sold out']).optional(),
})

const comboParamsSchema = z.object({
  comboId: z.uuid(),
})

const promoCampaignBodySchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(2),
  channel: z.string().trim().min(2),
  audience: z.string().trim().min(2),
  budget: z.coerce.number().int().nonnegative(),
  status: z.enum(['active', 'scheduled', 'paused', 'ended']).default('scheduled'),
  startsAt: z.string().trim().min(1),
  endsAt: z.string().trim().min(1),
  offer: z.string().trim().min(2),
  imageUrl: z.string().trim().nullable().optional(),
  campaignType: z.string().trim().optional(),
  targetLocation: z.string().trim().optional(),
})

const promoCampaignParamsSchema = z.object({
  campaignId: z.string().trim().min(1),
})

const promoRulesBodySchema = z.object({
  rules: z.string().trim().min(1),
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

    const [items, timeline] = await Promise.all([
      selectAdminOrderItems(order.id),
      selectAdminOrderTimeline(order.id),
    ])

    return reply.status(200).send({ order: { ...order, items, timeline } })
  })

  app.get('/vendors', async (_request, reply) => {
    const vendorRows = await selectAdminVendors()

    return reply.status(200).send({
      stats: buildVendorStats(vendorRows),
      vendors: vendorRows,
    })
  })

  app.get('/riders', async (_request, reply) => {
    const riderRows = await selectAdminRiders()

    return reply.status(200).send({
      stats: buildRiderStats(riderRows),
      riders: riderRows,
      serviceAreas: await selectAdminServiceAreas(),
    })
  })

  app.get('/riders/commissions', async (_request, reply) => {
    return reply.status(200).send(await selectAdminRiderCommissions())
  })

  app.patch('/riders/commissions/settings', async (request, reply) => {
    const parsedBody = payoutSettingsBodySchema.safeParse(request.body)
    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please provide valid rider payout settings.',
      })
    }

    const [settings] = await database
      .insert(adminPayoutSettings)
      .values({
        settingsKey: 'riders',
        frequency: parsedBody.data.frequency,
        payoutTime: parsedBody.data.payoutTime,
        minimumWithdrawal: parsedBody.data.minimumWithdrawal,
        autoProcess: parsedBody.data.autoProcess,
        autoDeductCommission: parsedBody.data.autoDeductCommission ?? true,
      })
      .onConflictDoUpdate({
        target: adminPayoutSettings.settingsKey,
        set: {
          frequency: parsedBody.data.frequency,
          payoutTime: parsedBody.data.payoutTime,
          minimumWithdrawal: parsedBody.data.minimumWithdrawal,
          autoProcess: parsedBody.data.autoProcess,
          autoDeductCommission: parsedBody.data.autoDeductCommission ?? true,
          updatedAt: new Date(),
        },
      })
      .returning({
        frequency: adminPayoutSettings.frequency,
        payoutTime: adminPayoutSettings.payoutTime,
        minimumWithdrawal: adminPayoutSettings.minimumWithdrawal,
        autoProcess: adminPayoutSettings.autoProcess,
        autoDeductCommission: adminPayoutSettings.autoDeductCommission,
      })

    if (parsedBody.data.vehicleFeeSettings?.length) {
      for (const setting of parsedBody.data.vehicleFeeSettings) {
        await database
          .insert(riderDeliveryFeeSettings)
          .values({
            vehicleType: setting.id,
            deliveryFeeAmount: setting.deliveryFee,
            mandoCutPercent: setting.mandoCutPercent,
          })
          .onConflictDoUpdate({
            target: riderDeliveryFeeSettings.vehicleType,
            set: {
              deliveryFeeAmount: setting.deliveryFee,
              mandoCutPercent: setting.mandoCutPercent,
              updatedAt: new Date(),
            },
          })
      }
    }

    return reply.status(200).send({ settings })
  })

  app.patch('/riders/withdrawals/:requestId/status', async (request, reply) => {
    const parsedParams = payoutRequestParamsSchema.safeParse(request.params)
    const parsedBody = payoutStatusBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please choose a valid rider withdrawal request and status.',
      })
    }

    const [updatedRequest] = await database
      .update(payoutRequests)
      .set({
        status: parsedBody.data.status,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(payoutRequests.id, parsedParams.data.requestId),
          eq(payoutRequests.type, 'rider_earnings'),
        ),
      )
      .returning({ id: payoutRequests.id, status: payoutRequests.status })

    if (!updatedRequest) {
      return reply.status(404).send({
        error: 'withdrawal_not_found',
        message: 'Rider withdrawal request not found.',
      })
    }

    return reply.status(200).send({ request: updatedRequest })
  })

  app.post('/riders', async (request, reply) => {
    const parsedBody = riderBodySchema.safeParse(request.body)
    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please complete the rider onboarding form.',
      })
    }

    try {
      const rider = await createAdminRider(parsedBody.data)
      return reply.status(201).send({ rider })
    } catch (error) {
      request.log.error(error)

      if (isUniqueViolation(error)) {
        return reply.status(409).send({
          error: 'rider_exists',
          message: 'A rider with this email already exists.',
        })
      }

      return reply.status(500).send({
        error: 'rider_create_failed',
        message: 'Unable to create rider. Please try again.',
      })
    }
  })

  app.patch('/riders/:riderId/status', async (request, reply) => {
    const parsedParams = riderParamsSchema.safeParse(request.params)
    const parsedBody = riderStatusBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please choose a valid rider and status.',
      })
    }

    const [user] = await database
      .update(users)
      .set({
        status: parsedBody.data.status === 'suspended' ? 'suspended' : 'active',
        updatedAt: new Date(),
      })
      .where(eq(users.id, parsedParams.data.riderId))
      .returning({ id: users.id })

    if (!user) {
      return reply.status(404).send({
        error: 'rider_not_found',
        message: 'Rider not found.',
      })
    }

    const rider = await selectAdminRiderDetail(user.id)
    return reply.status(200).send({ rider })
  })

  app.patch('/riders/:riderId/zone', async (request, reply) => {
    const parsedParams = riderParamsSchema.safeParse(request.params)
    const parsedBody = riderZoneBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please choose a valid rider zone.',
      })
    }

    const areaNames = parsedBody.data.serviceAreas?.length
      ? parsedBody.data.serviceAreas
      : parsedBody.data.serviceArea
        ? parsedBody.data.serviceArea.split(',').map((area) => area.trim()).filter(Boolean)
        : []
    const areaRows = await Promise.all(areaNames.map((area) => ensureServiceArea(area)))
    const serviceArea = areaRows[0]
    const [riderProfile] = await database
      .update(riderProfiles)
      .set({ serviceAreaId: serviceArea.id, updatedAt: new Date() })
      .where(eq(riderProfiles.userId, parsedParams.data.riderId))
      .returning({ userId: riderProfiles.userId })

    if (!riderProfile) {
      return reply.status(404).send({
        error: 'rider_not_found',
        message: 'Rider not found.',
      })
    }

    await database.delete(riderServiceAreas).where(eq(riderServiceAreas.riderId, riderProfile.userId))
    if (areaRows.length > 0) {
      await database
        .insert(riderServiceAreas)
        .values(areaRows.map((area) => ({
          riderId: riderProfile.userId,
          serviceAreaId: area.id,
        })))
        .onConflictDoNothing()
    }

    const rider = await selectAdminRiderDetail(riderProfile.userId)
    return reply.status(200).send({ rider })
  })

  app.get('/riders/:riderId', async (request, reply) => {
    const parsedParams = riderParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please choose a valid rider.',
      })
    }

    const rider = await selectAdminRiderDetail(parsedParams.data.riderId)
    if (!rider) {
      return reply.status(404).send({
        error: 'rider_not_found',
        message: 'Rider not found.',
      })
    }

    return reply.status(200).send({ rider })
  })

  app.get('/vendors/commissions', async (_request, reply) => {
    const data = await selectAdminVendorCommissions()

    return reply.status(200).send(data)
  })

  app.patch('/vendors/commissions/settings', async (request, reply) => {
    const parsedBody = payoutSettingsBodySchema.safeParse(request.body)
    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please provide valid payout settings.',
      })
    }

    const [settings] = await database
      .insert(adminPayoutSettings)
      .values({
        settingsKey: 'default',
        frequency: parsedBody.data.frequency,
        payoutTime: parsedBody.data.payoutTime,
        minimumWithdrawal: parsedBody.data.minimumWithdrawal,
        autoProcess: parsedBody.data.autoProcess,
        autoDeductCommission: parsedBody.data.autoDeductCommission ?? true,
      })
      .onConflictDoUpdate({
        target: adminPayoutSettings.settingsKey,
        set: {
          frequency: parsedBody.data.frequency,
          payoutTime: parsedBody.data.payoutTime,
          minimumWithdrawal: parsedBody.data.minimumWithdrawal,
          autoProcess: parsedBody.data.autoProcess,
          autoDeductCommission: parsedBody.data.autoDeductCommission ?? true,
          updatedAt: new Date(),
        },
      })
      .returning({
        frequency: adminPayoutSettings.frequency,
        payoutTime: adminPayoutSettings.payoutTime,
        minimumWithdrawal: adminPayoutSettings.minimumWithdrawal,
        autoProcess: adminPayoutSettings.autoProcess,
        autoDeductCommission: adminPayoutSettings.autoDeductCommission,
      })

    return reply.status(200).send({ settings })
  })

  app.patch('/vendors/withdrawals/:requestId/status', async (request, reply) => {
    const parsedParams = payoutRequestParamsSchema.safeParse(request.params)
    const parsedBody = payoutStatusBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please choose a valid withdrawal request and status.',
      })
    }

    const [updatedRequest] = await database
      .update(payoutRequests)
      .set({
        status: parsedBody.data.status,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payoutRequests.id, parsedParams.data.requestId))
      .returning({ id: payoutRequests.id, status: payoutRequests.status })

    if (!updatedRequest) {
      return reply.status(404).send({
        error: 'withdrawal_not_found',
        message: 'Withdrawal request not found.',
      })
    }

    return reply.status(200).send({ request: updatedRequest })
  })

  app.post('/vendors', async (request, reply) => {
    const parsedBody = vendorBodySchema.safeParse(request.body)
    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please complete the vendor onboarding form.',
      })
    }

    try {
      const vendor = await createAdminVendor(parsedBody.data)
      return reply.status(201).send({ vendor })
    } catch (error) {
      request.log.error(error)

      if (isUniqueViolation(error)) {
        return reply.status(409).send({
          error: 'vendor_exists',
          message:
            'A user or restaurant with these details already exists. Please use another email or restaurant name.',
        })
      }

      return reply.status(500).send({
        error: 'vendor_create_failed',
        message: 'Unable to create vendor. Please try again.',
      })
    }
  })

  app.patch('/vendors/:vendorId', async (request, reply) => {
    const parsedParams = vendorParamsSchema.safeParse(request.params)
    const parsedBody = vendorBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please provide valid vendor details.',
      })
    }

    const vendor = await updateAdminVendor(parsedParams.data.vendorId, parsedBody.data)
    if (!vendor) {
      return reply.status(404).send({
        error: 'vendor_not_found',
        message: 'Vendor not found.',
      })
    }

    return reply.status(200).send({ vendor })
  })

  app.post('/vendors/:vendorId/menu-items', async (request, reply) => {
    const parsedParams = vendorParamsSchema.safeParse(request.params)
    const parsedBody = menuItemBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please provide a valid menu item.',
      })
    }

    const [restaurant] = await database
      .select({ id: restaurants.id, platformCommissionBps: restaurants.platformCommissionBps })
      .from(restaurants)
      .where(eq(restaurants.id, parsedParams.data.vendorId))
      .limit(1)

    if (!restaurant) {
      return reply.status(404).send({
        error: 'vendor_not_found',
        message: 'Vendor not found.',
      })
    }

    const [item] = await database
      .insert(menuItems)
      .values({
        restaurantId: restaurant.id,
        name: parsedBody.data.itemName,
        description: parsedBody.data.category,
        priceAmount: parsedBody.data.clientPrice,
        imageUrl: parsedBody.data.imageUrl || null,
        isAvailable: true,
        isSubItem: parsedBody.data.isSubItem ?? false,
      })
      .returning({
        id: menuItems.id,
        name: menuItems.name,
        description: menuItems.description,
        priceAmount: menuItems.priceAmount,
        isAvailable: menuItems.isAvailable,
        isSubItem: menuItems.isSubItem,
      })

    return reply.status(201).send({
      item: {
        id: item.id,
        name: item.name,
        description: item.description,
        clientPrice: item.priceAmount,
        mandoShare:
          parsedBody.data.mandoPrice ??
          calculateCommissionAmount(item.priceAmount, restaurant.platformCommissionBps),
        vendorShare:
          item.priceAmount -
          (parsedBody.data.mandoPrice ??
            calculateCommissionAmount(item.priceAmount, restaurant.platformCommissionBps)),
        status: item.isAvailable ? 'available' : 'unavailable',
        isSubItem: item.isSubItem,
      },
    })
  })

  app.patch('/vendors/:vendorId/menu-items/:itemId', async (request, reply) => {
    const parsedParams = menuItemParamsSchema.safeParse(request.params)
    const parsedBody = menuItemUpdateBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please provide valid menu item details.',
      })
    }

    const [item] = await database
      .update(menuItems)
      .set({
        name: parsedBody.data.itemName,
        description: parsedBody.data.category,
        priceAmount: parsedBody.data.clientPrice,
        imageUrl: parsedBody.data.imageUrl,
        isAvailable: parsedBody.data.isAvailable,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(menuItems.id, parsedParams.data.itemId),
          eq(menuItems.restaurantId, parsedParams.data.vendorId),
        ),
      )
      .returning({
        id: menuItems.id,
        name: menuItems.name,
        description: menuItems.description,
        priceAmount: menuItems.priceAmount,
        isAvailable: menuItems.isAvailable,
      })

    if (!item) {
      return reply.status(404).send({
        error: 'menu_item_not_found',
        message: 'Menu item not found.',
      })
    }

    const [restaurant] = await database
      .select({ platformCommissionBps: restaurants.platformCommissionBps })
      .from(restaurants)
      .where(eq(restaurants.id, parsedParams.data.vendorId))
      .limit(1)

    const mandoShare = parsedBody.data.mandoPrice ??
      calculateCommissionAmount(item.priceAmount, restaurant?.platformCommissionBps ?? 1000)

    return reply.status(200).send({
      item: {
        id: item.id,
        name: item.name,
        description: item.description,
        clientPrice: item.priceAmount,
        mandoShare,
        vendorShare: item.priceAmount - mandoShare,
        status: item.isAvailable ? 'available' : 'unavailable',
      },
    })
  })

  app.delete('/vendors/:vendorId/menu-items/:itemId', async (request, reply) => {
    const parsedParams = menuItemParamsSchema.safeParse(request.params)

    if (!parsedParams.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please choose a valid menu item.',
      })
    }

    const [item] = await database
      .delete(menuItems)
      .where(
        and(
          eq(menuItems.id, parsedParams.data.itemId),
          eq(menuItems.restaurantId, parsedParams.data.vendorId),
        ),
      )
      .returning({ id: menuItems.id })

    if (!item) {
      return reply.status(404).send({
        error: 'menu_item_not_found',
        message: 'Menu item not found.',
      })
    }

    return reply.status(200).send({ ok: true })
  })

  app.patch('/vendors/:vendorId/commission', async (request, reply) => {
    const parsedParams = vendorParamsSchema.safeParse(request.params)
    const parsedBody = commissionBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please provide a valid commission rate.',
      })
    }

    const commissionRateBps = Math.round(parsedBody.data.commissionRatePercent * 100)
    const [restaurant] = await database
      .update(restaurants)
      .set({ platformCommissionBps: commissionRateBps, updatedAt: new Date() })
      .where(eq(restaurants.id, parsedParams.data.vendorId))
      .returning({
        id: restaurants.id,
        name: restaurants.name,
        platformCommissionBps: restaurants.platformCommissionBps,
      })

    if (!restaurant) {
      return reply.status(404).send({
        error: 'vendor_not_found',
        message: 'Vendor not found.',
      })
    }

    return reply.status(200).send({
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        commissionRateBps: restaurant.platformCommissionBps,
      },
    })
  })

  app.patch('/vendors/:vendorId/status', async (request, reply) => {
    const parsedParams = vendorParamsSchema.safeParse(request.params)
    const parsedBody = vendorStatusBodySchema.safeParse(request.body)

    if (!parsedParams.success || !parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please choose a valid vendor status.',
      })
    }

    const [restaurant] = await database
      .update(restaurants)
      .set({
        status: parsedBody.data.status,
        isVerified: parsedBody.data.status === 'active' ? true : undefined,
        onboardedAt: parsedBody.data.status === 'active' ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(restaurants.id, parsedParams.data.vendorId))
      .returning({ id: restaurants.id })

    if (!restaurant) {
      return reply.status(404).send({
        error: 'vendor_not_found',
        message: 'Vendor not found.',
      })
    }

    const vendor = await selectAdminVendorDetail(restaurant.id)
    return reply.status(200).send({ vendor })
  })

  app.patch('/vendors/:vendorId/approve', async (request, reply) => {
    const parsedParams = vendorParamsSchema.safeParse(request.params)

    if (!parsedParams.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please choose a valid vendor.',
      })
    }

    const [restaurant] = await database
      .update(restaurants)
      .set({
        status: 'active',
        isVerified: true,
        onboardedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(restaurants.id, parsedParams.data.vendorId))
      .returning({ id: restaurants.id })

    if (!restaurant) {
      return reply.status(404).send({
        error: 'vendor_not_found',
        message: 'Vendor not found.',
      })
    }

    const vendor = await selectAdminVendorDetail(restaurant.id)
    return reply.status(200).send({ vendor })
  })

  app.get('/vendors/:vendorId', async (request, reply) => {
    const parsedParams = vendorParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please choose a valid vendor.',
      })
    }

    const vendor = await selectAdminVendorDetail(parsedParams.data.vendorId)
    if (!vendor) {
      return reply.status(404).send({
        error: 'vendor_not_found',
        message: 'Vendor not found.',
      })
    }

    return reply.status(200).send({ vendor })
  })

  app.get('/financials', async (_request, reply) => {
    return reply.status(200).send(await selectAdminFinancials())
  })

  app.patch('/financials/service-charges', async (request, reply) => {
    const parsedBody = serviceChargesBodySchema.safeParse(request.body)
    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please provide valid service charge settings.',
      })
    }

    const currentSettings = await selectAdminSetting<{
      serviceChargeAmount: number
      deliveryFeeAmount: number
      appliesTo: string
      effectiveDate: string
      serviceChargesByArea: Record<string, number>
    }>('financial_service_charges', {
      serviceChargeAmount: 50,
      deliveryFeeAmount: 0,
      appliesTo: 'All service areas',
      effectiveDate: '',
      serviceChargesByArea: {},
    })
    const serviceChargesByArea = {
      ...(currentSettings.serviceChargesByArea ?? {}),
      ...(parsedBody.data.serviceChargesByArea ?? {}),
    }

    if (parsedBody.data.appliesTo && parsedBody.data.appliesTo !== 'All service areas') {
      serviceChargesByArea[parsedBody.data.appliesTo] = parsedBody.data.serviceChargeAmount
    }

    const settings = await upsertAdminSetting('financial_service_charges', {
      ...currentSettings,
      ...parsedBody.data,
      deliveryFeeAmount: 0,
      serviceChargesByArea,
    })
    return reply.status(200).send({ settings })
  })

  app.get('/operations/delivery-pricing', async (_request, reply) => {
    return reply.status(200).send(await selectOperationsDeliveryPricing())
  })

  app.patch('/operations/delivery-pricing', async (request, reply) => {
    const parsedBody = operationsDeliveryPricingBodySchema.safeParse(request.body)
    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please provide valid delivery pricing settings.',
      })
    }

    const settings = await upsertAdminSetting('operations_delivery_pricing', parsedBody.data)
    return reply.status(200).send({ settings })
  })

  app.post('/operations/service-areas', async (request, reply) => {
    const parsedBody = adminServiceAreaBodySchema.safeParse(request.body)
    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please provide valid service area details.',
      })
    }

    try {
      const [serviceArea] = await database
        .insert(serviceAreas)
        .values({
          name: parsedBody.data.name,
          city: parsedBody.data.city,
          state: parsedBody.data.state,
          isActive: parsedBody.data.isActive ?? true,
        })
        .returning()

      return reply.status(201).send({ serviceArea })
    } catch (error) {
      if (isUniqueViolation(error)) {
        return reply.status(409).send({
          error: 'service_area_exists',
          message: 'A service area with this name, city and state already exists.',
        })
      }
      throw error
    }
  })

  app.patch('/operations/service-areas/:serviceAreaId', async (request, reply) => {
    const parsedParams = serviceAreaParamsSchema.safeParse(request.params)
    const parsedBody = adminServiceAreaBodySchema.partial().safeParse(request.body)
    if (!parsedParams.success || !parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please provide valid service area details.',
      })
    }

    try {
      const [serviceArea] = await database
        .update(serviceAreas)
        .set({
          ...parsedBody.data,
          updatedAt: new Date(),
        })
        .where(eq(serviceAreas.id, parsedParams.data.serviceAreaId))
        .returning()

      if (!serviceArea) {
        return reply.status(404).send({
          error: 'service_area_not_found',
          message: 'Service area not found.',
        })
      }

      return reply.status(200).send({ serviceArea })
    } catch (error) {
      if (isUniqueViolation(error)) {
        return reply.status(409).send({
          error: 'service_area_exists',
          message: 'A service area with this name, city and state already exists.',
        })
      }
      throw error
    }
  })

  app.delete('/operations/service-areas/:serviceAreaId', async (request, reply) => {
    const parsedParams = serviceAreaParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please choose a valid service area.',
      })
    }

    try {
      const [serviceArea] = await database
        .delete(serviceAreas)
        .where(eq(serviceAreas.id, parsedParams.data.serviceAreaId))
        .returning({ id: serviceAreas.id })

      if (!serviceArea) {
        return reply.status(404).send({
          error: 'service_area_not_found',
          message: 'Service area not found.',
        })
      }

      return reply.status(200).send({ ok: true })
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        return reply.status(409).send({
          error: 'service_area_in_use',
          message: 'This service area is already used by restaurants, addresses, riders or orders. Deactivate it instead of deleting it.',
        })
      }
      throw error
    }
  })

  app.post('/financials/transactions/:transactionId/refund', async (request, reply) => {
    const parsedParams = transactionParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please choose a valid transaction.',
      })
    }

    const [payment] = await database
      .select()
      .from(payments)
      .where(eq(payments.id, parsedParams.data.transactionId))
      .limit(1)

    if (!payment) {
      return reply.status(404).send({
        error: 'transaction_not_found',
        message: 'Transaction not found.',
      })
    }

    const [updatedPayment] = await database
      .update(payments)
      .set({
        status: 'refunded',
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id))
      .returning({ id: payments.id, orderId: payments.orderId })

    await database
      .update(orders)
      .set({ status: 'refunded', updatedAt: new Date() })
      .where(eq(orders.id, updatedPayment.orderId))

    return reply.status(200).send({
      transaction: await selectAdminFinancialTransaction(updatedPayment.id),
    })
  })

  app.get('/food-combos', async (_request, reply) => {
    return reply.status(200).send(await selectAdminFoodCombos())
  })

  app.post('/food-combos', async (request, reply) => {
    const parsedBody = adminComboBodySchema.safeParse(request.body)
    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please complete the combo form.',
      })
    }

    const combo = await createAdminFoodCombo(parsedBody.data)
    return reply.status(201).send({ combo })
  })

  app.patch('/food-combos/:comboId', async (request, reply) => {
    const parsedParams = comboParamsSchema.safeParse(request.params)
    const parsedBody = adminComboUpdateBodySchema.safeParse(request.body)
    if (!parsedParams.success || !parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please provide valid combo details.',
      })
    }

    const combo = await updateAdminFoodCombo(parsedParams.data.comboId, parsedBody.data)
    if (!combo) return reply.status(404).send({ error: 'combo_not_found', message: 'Combo not found.' })
    return reply.status(200).send({ combo })
  })

  app.get('/food-combos/:comboId/campaign', async (request, reply) => {
    const parsedParams = comboParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please provide a valid combo.',
      })
    }

    const campaign = await selectAdminComboCampaign(parsedParams.data.comboId)
    return reply.status(200).send({ campaign })
  })

  app.patch('/food-combos/:comboId/campaign', async (request, reply) => {
    const parsedParams = comboParamsSchema.safeParse(request.params)
    const parsedBody = adminComboCampaignBodySchema.safeParse(request.body)
    if (!parsedParams.success || !parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please provide valid campaign details.',
      })
    }

    const [combo] = await database
      .select({ id: combos.id })
      .from(combos)
      .where(eq(combos.id, parsedParams.data.comboId))
      .limit(1)

    if (!combo) return reply.status(404).send({ error: 'combo_not_found', message: 'Combo not found.' })

    const campaign = await upsertAdminComboCampaign(parsedParams.data.comboId, parsedBody.data)
    return reply.status(200).send({ campaign })
  })
  app.delete('/food-combos/:comboId', async (request, reply) => {
    const parsedParams = comboParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please choose a valid combo.',
      })
    }

    await database.delete(combos).where(eq(combos.id, parsedParams.data.comboId))
    return reply.status(200).send({ ok: true })
  })

  app.get('/sales', async (_request, reply) => {
    return reply.status(200).send(await selectAdminSalesAgents())
  })

  app.post('/sales/agents', async (request, reply) => {
    const parsedBody = salesAgentBodySchema.safeParse(request.body)
    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please complete the agent form.',
      })
    }

    try {
      const agent = await createAdminSalesAgent(parsedBody.data)
      return reply.status(201).send({ agent, temporaryPassword: createTemporaryPassword() })
    } catch (error) {
      if (isUniqueViolation(error)) {
        return reply.status(409).send({
          error: 'agent_email_exists',
          message: 'A user with this email already exists. Use a different email or edit the existing account.',
        })
      }
      throw error
    }
  })

  app.patch('/sales/agents/:agentId', async (request, reply) => {
    const parsedParams = salesAgentParamsSchema.safeParse(request.params)
    const parsedBody = salesAgentUpdateBodySchema.safeParse(request.body)
    if (!parsedParams.success || !parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please provide valid agent details.',
      })
    }

    const agent = await updateAdminSalesAgent(parsedParams.data.agentId, parsedBody.data)
    if (!agent) return reply.status(404).send({ error: 'agent_not_found', message: 'Agent not found.' })
    return reply.status(200).send({ agent })
  })

  app.patch('/sales/agents/:agentId/status', async (request, reply) => {
    const parsedParams = salesAgentParamsSchema.safeParse(request.params)
    const parsedBody = salesAgentStatusBodySchema.safeParse(request.body)
    if (!parsedParams.success || !parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please provide a valid agent status.',
      })
    }

    const agent = await updateAdminSalesAgent(parsedParams.data.agentId, {
      status: parsedBody.data.status,
    })
    if (!agent) return reply.status(404).send({ error: 'agent_not_found', message: 'Agent not found.' })
    return reply.status(200).send({ agent })
  })

  app.patch('/sales/agents/:agentId/influencer', async (request, reply) => {
    const parsedParams = salesAgentParamsSchema.safeParse(request.params)
    const parsedBody = influencerBodySchema.safeParse(request.body)
    if (!parsedParams.success || !parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please choose a valid influencer setting.',
      })
    }

    const [profile] = await database
      .update(salesAgentProfiles)
      .set({
        tier: parsedBody.data.influencer ? 'influencer' : 'standard',
        updatedAt: new Date(),
      })
      .where(eq(salesAgentProfiles.userId, parsedParams.data.agentId))
      .returning({ userId: salesAgentProfiles.userId })

    if (!profile) return reply.status(404).send({ error: 'agent_not_found', message: 'Agent not found.' })
    return reply.status(200).send({ agent: await selectAdminSalesAgentDetail(profile.userId) })
  })

  app.delete('/sales/agents/:agentId', async (request, reply) => {
    const parsedParams = salesAgentParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please choose a valid agent.',
      })
    }

    await database
      .update(users)
      .set({ status: 'disabled', updatedAt: new Date() })
      .where(eq(users.id, parsedParams.data.agentId))

    return reply.status(200).send({ ok: true })
  })

  app.get('/sales/settings', async (_request, reply) => {
    return reply.status(200).send({
      settings: await selectAdminSetting('sales_settings', defaultSalesSettings()),
    })
  })

  app.patch('/sales/settings', async (request, reply) => {
    const parsedBody = adminSettingsBodySchema.safeParse(request.body)
    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please provide valid sales settings.',
      })
    }

    const settings = await upsertAdminSetting('sales_settings', parsedBody.data)
    return reply.status(200).send({ settings })
  })

  app.get('/promo', async (_request, reply) => {
    return reply.status(200).send(await selectAdminPromo())
  })

  app.post('/promo/campaigns', async (request, reply) => {
    const parsedBody = promoCampaignBodySchema.safeParse(request.body)
    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please complete the campaign form.',
      })
    }

    const campaign = await saveAdminPromoCampaign(parsedBody.data)
    return reply.status(201).send({ campaign, promo: await selectAdminPromo() })
  })

  app.patch('/promo/campaigns/:campaignId', async (request, reply) => {
    const parsedParams = promoCampaignParamsSchema.safeParse(request.params)
    const parsedBody = promoCampaignBodySchema.partial().safeParse(request.body)
    if (!parsedParams.success || !parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please provide valid campaign details.',
      })
    }

    const campaign = await saveAdminPromoCampaign({
      id: parsedParams.data.campaignId,
      ...parsedBody.data,
    })
    return reply.status(200).send({ campaign, promo: await selectAdminPromo() })
  })

  app.delete('/promo/campaigns/:campaignId', async (request, reply) => {
    const parsedParams = promoCampaignParamsSchema.safeParse(request.params)
    if (!parsedParams.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please choose a valid campaign.',
      })
    }

    const promo = await selectAdminPromo()
    await upsertAdminSetting(
      'promo_campaigns',
      promo.campaigns.filter((campaign) => campaign.id !== parsedParams.data.campaignId),
    )
    return reply.status(200).send({ ok: true, promo: await selectAdminPromo() })
  })

  app.patch('/promo/rules', async (request, reply) => {
    const parsedBody = promoRulesBodySchema.safeParse(request.body)
    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please provide coupon rules.',
      })
    }

    const rules = await upsertAdminSetting('promo_coupon_rules', parsedBody.data.rules)
    return reply.status(200).send({ rules })
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

async function selectAdminVendors() {
  const restaurantRows = await database
    .select()
    .from(restaurants)
    .orderBy(desc(restaurants.createdAt))

  if (!restaurantRows.length) return []

  const restaurantIds = restaurantRows.map((restaurant) => restaurant.id)
  const serviceAreaIds = restaurantRows.map((restaurant) => restaurant.serviceAreaId)

  const [
    serviceAreaRows,
    memberRows,
    orderRows,
    reviewRows,
    earningRows,
  ] = await Promise.all([
    serviceAreaIds.length
      ? database.select().from(serviceAreas).where(inArray(serviceAreas.id, serviceAreaIds))
      : [],
    restaurantIds.length
      ? database
          .select()
          .from(restaurantMembers)
          .where(inArray(restaurantMembers.restaurantId, restaurantIds))
      : [],
    restaurantIds.length
      ? database.select().from(orders).where(inArray(orders.restaurantId, restaurantIds))
      : [],
    restaurantIds.length
      ? database.select().from(reviews).where(inArray(reviews.restaurantId, restaurantIds))
      : [],
    restaurantIds.length
      ? database
          .select()
          .from(restaurantEarnings)
          .where(inArray(restaurantEarnings.restaurantId, restaurantIds))
      : [],
  ])

  const managerIds = memberRows
    .filter((member) => ['owner', 'manager'].includes(member.membershipRole))
    .map((member) => member.userId)
  const [managerProfiles, managerUsers] = managerIds.length
    ? await Promise.all([
        database.select().from(profiles).where(inArray(profiles.userId, managerIds)),
        database
          .select({ id: users.id, email: users.email })
          .from(users)
          .where(inArray(users.id, managerIds)),
      ])
    : [[], []]

  const serviceAreaById = new Map(serviceAreaRows.map((area) => [area.id, area]))
  const membersByRestaurantId = groupBy(memberRows, (member) => member.restaurantId)
  const ordersByRestaurantId = groupBy(orderRows, (order) => order.restaurantId)
  const reviewsByRestaurantId = groupBy(reviewRows, (review) => review.restaurantId)
  const earningsByRestaurantId = groupBy(earningRows, (earning) => earning.restaurantId)
  const profileByUserId = new Map(managerProfiles.map((profile) => [profile.userId, profile]))
  const userById = new Map(managerUsers.map((user) => [user.id, user]))

  return restaurantRows.map((restaurant) => {
    const area = serviceAreaById.get(restaurant.serviceAreaId)
    const managerMember = chooseRestaurantManager(membersByRestaurantId.get(restaurant.id) ?? [])
    const managerProfile = managerMember ? profileByUserId.get(managerMember.userId) : null
    const managerUser = managerMember ? userById.get(managerMember.userId) : null
    const vendorOrders = ordersByRestaurantId.get(restaurant.id) ?? []
    const vendorReviews = reviewsByRestaurantId.get(restaurant.id) ?? []
    const vendorEarnings = earningsByRestaurantId.get(restaurant.id) ?? []
    const clientPrice = restaurant.minimumOrderAmount
    const mandoPrice = calculateCommissionAmount(clientPrice, restaurant.platformCommissionBps)

    return {
      id: restaurant.id,
      name: restaurant.name,
      initials: initialsFromName(restaurant.name),
      cuisine: restaurant.description ?? 'Restaurant vendor',
      location: formatRestaurantLocation(restaurant.streetAddress, area),
      status: mapVendorStatus(restaurant.status),
      rawStatus: restaurant.status,
      manager: {
        name: managerProfile?.fullName ?? 'No manager assigned',
        phone: managerProfile?.phone ?? restaurant.phone,
        email: managerUser?.email ?? null,
      },
      orders: vendorOrders.length,
      rating: averageRating(vendorReviews.map((review) => review.rating)),
      clientPrice,
      mandoPrice,
      vendorPayout: sum(vendorEarnings.map((earning) => earning.netAmount)),
      commissionAmount: sum(vendorEarnings.map((earning) => earning.platformFeeAmount)),
      commissionRateBps: restaurant.platformCommissionBps,
      address: restaurant.streetAddress,
      phone: restaurant.phone,
      onboardedAt: restaurant.onboardedAt,
      isVerified: restaurant.isVerified,
    }
  })
}

async function selectAdminVendorDetail(vendorId: string) {
  const vendorRows = await selectAdminVendors()
  const vendor = vendorRows.find((row) => row.id === vendorId)
  if (!vendor) return null

  const [menuRows, orderRows, operationRows, documentRows] = await Promise.all([
    database.select().from(menuItems).where(eq(menuItems.restaurantId, vendorId)),
    database
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        totalAmount: orders.totalAmount,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.restaurantId, vendorId))
      .orderBy(desc(orders.createdAt))
      .limit(8),
    database
      .select()
      .from(restaurantOperations)
      .where(eq(restaurantOperations.restaurantId, vendorId))
      .limit(1),
    database
      .select()
      .from(vendorDocuments)
      .where(eq(vendorDocuments.restaurantId, vendorId))
      .orderBy(vendorDocuments.createdAt),
  ])

  const operations = operationRows[0] ?? null

  return {
    ...vendor,
    operations: operations
      ? {
          openingTime: operations.openingTime,
          closingTime: operations.closingTime,
          openDays: operations.openDays,
          deliveryRadius: operations.deliveryRadius,
          deliveryType: operations.deliveryType,
          website: operations.website,
        }
      : null,
    documents: documentRows.length
      ? documentRows.map((document) => ({
          id: document.id,
          name: document.name,
          status: document.status,
          documentNumber: document.documentNumber,
          fileUrl: document.fileUrl,
        }))
      : buildVendorDocuments(vendor),
    menu: menuRows.map((item) => {
      const mandoShare = calculateCommissionAmount(item.priceAmount, vendor.commissionRateBps)

      return {
        id: item.id,
        name: item.name,
        description: item.description,
        clientPrice: item.priceAmount,
        mandoShare,
        vendorShare: item.priceAmount - mandoShare,
        status: item.isAvailable ? 'available' : 'unavailable',
      }
    }),
    activity: orderRows.map((order) => ({
      id: order.id,
      title: `Order ${order.orderNumber}`,
      detail: `${order.status.replaceAll('_', ' ')} - ${formatMoney(order.totalAmount)}`,
      createdAt: order.createdAt,
    })),
  }
}

async function selectAdminVendorCommissions() {
  const [vendorRows, requestRows, payoutSettings] = await Promise.all([
    selectAdminVendors(),
    database
      .select({
        id: payoutRequests.id,
        restaurantId: payoutRequests.restaurantId,
        payoutAccountId: payoutRequests.payoutAccountId,
        amount: payoutRequests.amount,
        status: payoutRequests.status,
        requestedAt: payoutRequests.requestedAt,
        type: payoutRequests.type,
      })
      .from(payoutRequests)
      .where(eq(payoutRequests.type, 'restaurant_earnings'))
      .orderBy(desc(payoutRequests.requestedAt)),
    selectAdminPayoutSettings(),
  ])

  const requestRestaurantIds = requestRows
    .map((request) => request.restaurantId)
    .filter((restaurantId): restaurantId is string => Boolean(restaurantId))
  const accountIds = requestRows.map((request) => request.payoutAccountId)

  const [restaurantRows, accountRows, orderRows, earningRows] = await Promise.all([
    requestRestaurantIds.length
      ? database.select().from(restaurants).where(inArray(restaurants.id, requestRestaurantIds))
      : [],
    accountIds.length
      ? database.select().from(payoutAccounts).where(inArray(payoutAccounts.id, accountIds))
      : [],
    requestRestaurantIds.length
      ? database.select().from(orders).where(inArray(orders.restaurantId, requestRestaurantIds))
      : [],
    requestRestaurantIds.length
      ? database
          .select()
          .from(restaurantEarnings)
          .where(inArray(restaurantEarnings.restaurantId, requestRestaurantIds))
      : [],
  ])

  const restaurantById = new Map(restaurantRows.map((restaurant) => [restaurant.id, restaurant]))
  const accountById = new Map(accountRows.map((account) => [account.id, account]))
  const ordersByRestaurantId = groupBy(orderRows, (order) => order.restaurantId)
  const earningsByRestaurantId = groupBy(earningRows, (earning) => earning.restaurantId)

  return {
    restaurants: vendorRows.map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
      commissionRateBps: vendor.commissionRateBps,
      status: vendor.status,
    })),
    payoutSettings,
    withdrawalRequests: requestRows.map((request) => {
      const restaurant = request.restaurantId ? restaurantById.get(request.restaurantId) : null
      const vendorOrders = request.restaurantId
        ? ordersByRestaurantId.get(request.restaurantId) ?? []
        : []
      const vendorEarnings = request.restaurantId
        ? earningsByRestaurantId.get(request.restaurantId) ?? []
        : []
      const clientPaid = sum(vendorEarnings.map((earning) => earning.grossAmount))
      const mandoCut = sum(vendorEarnings.map((earning) => earning.platformFeeAmount))
      const account = accountById.get(request.payoutAccountId)

      return {
        id: request.id,
        vendor: restaurant?.name ?? 'Restaurant vendor',
        orders: vendorOrders.length,
        clientPaid,
        mandoCut,
        vendorAmount: request.amount,
        paymentMethod: account
          ? `${account.bankCode} • ${account.accountNumberLast4}`
          : 'Bank transfer',
        payoutDetails: account
          ? `${account.accountName} • ****${account.accountNumberLast4}`
          : 'No payout account details',
        requestDate: request.requestedAt,
        status: request.status,
      }
    }),
  }
}

async function createAdminVendor(input: z.infer<typeof vendorBodySchema>) {
  const serviceArea = await ensureServiceArea(input.serviceArea)
  const slug = await createUniqueRestaurantSlug(input.restaurantName)
  const user = await getOrCreateUserForRole({
    email: input.email,
    fullName: input.ownerName,
    phone: input.phone,
    role: 'restaurant',
  })

  const [restaurant] = await database
    .insert(restaurants)
    .values({
      slug,
      name: input.restaurantName,
      description: input.deliveryType || 'Restaurant vendor',
      phone: input.phone,
      serviceAreaId: serviceArea.id,
      streetAddress: input.fullAddress,
      minimumOrderAmount: input.minimumOrder,
      platformCommissionBps: 1000,
      imageUrl: input.logoUrl || null,
      status: 'draft',
      isVerified: false,
    })
    .returning({ id: restaurants.id })

  await database.insert(restaurantMembers).values({
    restaurantId: restaurant.id,
    userId: user.id,
    membershipRole: 'owner',
    status: 'active',
  })

  await upsertRestaurantOperations(restaurant.id, input)
  await upsertVendorDocuments(restaurant.id, input)

  return selectAdminVendorDetail(restaurant.id)
}

async function syncVendorManagerMembership(
  restaurantId: string,
  input: z.infer<typeof vendorBodySchema>,
) {
  const existingManager = await selectRestaurantManager(restaurantId)
  if (existingManager) {
    await database
      .update(restaurantMembers)
      .set({
        membershipRole: 'owner',
        status: 'active',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(restaurantMembers.restaurantId, restaurantId),
          eq(restaurantMembers.userId, existingManager.userId),
        ),
      )

    await database.insert(userRoles).values({ userId: existingManager.userId, role: 'restaurant' }).onConflictDoNothing()

    return existingManager.userId
  }

  const user = await getOrCreateUserForRole({
    email: input.email,
    fullName: input.ownerName,
    phone: input.phone,
    role: 'restaurant',
  })

  await database
    .insert(restaurantMembers)
    .values({
      restaurantId,
      userId: user.id,
      membershipRole: 'owner',
      status: 'active',
    })
    .onConflictDoUpdate({
      target: [restaurantMembers.restaurantId, restaurantMembers.userId],
      set: {
        membershipRole: 'owner',
        status: 'active',
        updatedAt: new Date(),
      },
    })

  return user.id
}

async function updateAdminVendor(
  vendorId: string,
  input: z.infer<typeof vendorBodySchema>,
) {
  const serviceArea = await ensureServiceArea(input.serviceArea)
  const [restaurant] = await database
    .update(restaurants)
    .set({
      name: input.restaurantName,
      description: input.deliveryType || 'Restaurant vendor',
      phone: input.phone,
      serviceAreaId: serviceArea.id,
      streetAddress: input.fullAddress,
      minimumOrderAmount: input.minimumOrder,
      ...(input.logoUrl ? { imageUrl: input.logoUrl } : {}),
      updatedAt: new Date(),
    })
    .where(eq(restaurants.id, vendorId))
    .returning({ id: restaurants.id })

  if (!restaurant) return null

  const managerUserId = await syncVendorManagerMembership(restaurant.id, input)

  await database
    .update(users)
    .set({ email: input.email, updatedAt: new Date() })
    .where(eq(users.id, managerUserId))

  await database
    .insert(profiles)
    .values({
      userId: managerUserId,
      fullName: input.ownerName,
      phone: input.phone,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        fullName: input.ownerName,
        phone: input.phone,
        updatedAt: new Date(),
      },
    })

  await upsertRestaurantOperations(restaurant.id, input)
  await upsertVendorDocuments(restaurant.id, input)

  return selectAdminVendorDetail(restaurant.id)
}

async function upsertRestaurantOperations(
  restaurantId: string,
  input: z.infer<typeof vendorBodySchema>,
) {
  await database
    .insert(restaurantOperations)
    .values({
      restaurantId,
      openingTime: input.openingTime || null,
      closingTime: input.closingTime || null,
      openDays: input.openDays || null,
      deliveryRadius: input.deliveryRadius || null,
      deliveryType: input.deliveryType || null,
      website: input.website || null,
    })
    .onConflictDoUpdate({
      target: restaurantOperations.restaurantId,
      set: {
        openingTime: input.openingTime || null,
        closingTime: input.closingTime || null,
        openDays: input.openDays || null,
        deliveryRadius: input.deliveryRadius || null,
        deliveryType: input.deliveryType || null,
        website: input.website || null,
        updatedAt: new Date(),
      },
    })
}

async function upsertVendorDocuments(
  restaurantId: string,
  input: z.infer<typeof vendorBodySchema>,
) {
  const documents: (typeof vendorDocuments.$inferInsert)[] = [
    {
      restaurantId,
      type: 'cac_certificate',
      name: 'CAC certificate',
      fileUrl: input.cacCertificateUrl || null,
      status: input.cacCertificateUrl ? 'uploaded' : 'pending',
      uploadedAt: input.cacCertificateUrl ? new Date() : null,
    },
    {
      restaurantId,
      type: 'food_handler_certificate',
      name: 'Food handler certificate',
      fileUrl: input.foodHandlerCertificateUrl || null,
      status: input.foodHandlerCertificateUrl ? 'uploaded' : 'pending',
      uploadedAt: input.foodHandlerCertificateUrl ? new Date() : null,
    },
    {
      restaurantId,
      type: 'tax_identification',
      name: 'Tax Identification Number',
      documentNumber: input.taxIdentificationNumber || null,
      status: input.taxIdentificationNumber ? 'uploaded' : 'pending',
    },
    {
      restaurantId,
      type: 'health_safety_permit',
      name: 'Health and safety permit',
      fileUrl: input.healthSafetyPermitUrl || null,
      status: input.healthSafetyPermitUrl ? 'uploaded' : 'pending',
      uploadedAt: input.healthSafetyPermitUrl ? new Date() : null,
    },
  ]

  for (const document of documents) {
    await database
      .insert(vendorDocuments)
      .values(document)
      .onConflictDoUpdate({
        target: [vendorDocuments.restaurantId, vendorDocuments.type],
        set: {
          name: document.name,
          fileUrl: sql`coalesce(${document.fileUrl ?? null}, ${vendorDocuments.fileUrl})`,
          documentNumber: sql`coalesce(${document.documentNumber ?? null}, ${vendorDocuments.documentNumber})`,
          status: sql`case when ${vendorDocuments.status} = 'pending' and ${document.status} = 'uploaded' then 'uploaded'::vendor_document_status else ${vendorDocuments.status} end`,
          uploadedAt: sql`coalesce(${document.uploadedAt ?? null}, ${vendorDocuments.uploadedAt})`,
          updatedAt: new Date(),
        },
      })
  }
}

async function selectAdminFinancials() {
  const [orderRows, paymentRows, earningRows, deliveryRows, payoutRows, orderDetails, serviceChargeSettings, serviceAreaRows] =
    await Promise.all([
      database.select().from(orders),
      database.select().from(payments),
      database.select().from(restaurantEarnings),
      database.select().from(deliveries),
      database.select().from(payoutRequests).orderBy(desc(payoutRequests.requestedAt)),
      selectAdminOrders(100),
      selectAdminSetting('financial_service_charges', {
        serviceChargeAmount: 50,
        deliveryFeeAmount: 0,
        appliesTo: 'All service areas',
        effectiveDate: '',
        serviceChargesByArea: {},
      }),
      database
        .select({ id: serviceAreas.id, name: serviceAreas.name })
        .from(serviceAreas)
        .orderBy(serviceAreas.name),
    ])

  const serviceChargeRevenue = orderRows.reduce(
    (total, order) => total + order.serviceChargeAmount,
    0,
  )
  const restaurantCommissionRevenue = earningRows.reduce(
    (total, earning) => total + earning.platformFeeAmount,
    0,
  )
  const deliveryCommissionRevenue = deliveryRows.reduce(
    (total, delivery) =>
      total + Math.max(delivery.deliveryFeeAmount - delivery.riderEarningAmount, 0),
    0,
  )
  const totalPayouts = payoutRows
    .filter((request) => ['approved', 'processing', 'paid'].includes(request.status))
    .reduce((total, request) => total + request.amount, 0)
  const pendingPayouts = payoutRows
    .filter((request) => ['pending', 'under_review', 'processing'].includes(request.status))
    .reduce((total, request) => total + request.amount, 0)
  const totalRefunds = paymentRows
    .filter((payment) => payment.status === 'refunded')
    .reduce((total, payment) => total + payment.amount, 0)
  const paymentByOrderId = new Map(paymentRows.map((payment) => [payment.orderId, payment]))

  return {
    stats: {
      totalRevenue: serviceChargeRevenue + restaurantCommissionRevenue + deliveryCommissionRevenue,
      totalPayouts,
      pendingPayouts,
      totalRefunds,
    },
    serviceCharges: {
      serviceChargeAmount: serviceChargeSettings.serviceChargeAmount,
      deliveryFeeAmount: 0,
      serviceChargesByArea: serviceChargeSettings.serviceChargesByArea ?? {},
    },
    serviceAreas: serviceAreaRows,
    transactions: orderDetails.map((order) => {
      const payment = paymentByOrderId.get(order.id)

      return {
        id: payment?.id ?? order.id,
        transactionId: payment?.providerReference ?? payment?.customerReference ?? order.orderNumber,
        orderRef: order.orderNumber,
        customer: order.customer.name,
        restaurant: order.restaurant.name,
        rider: order.rider?.name ?? 'Unassigned',
        amount: payment?.amount ?? order.totalAmount,
        totalAmount: order.totalAmount,
        type: payment?.status === 'refunded' || order.status === 'refunded' ? 'refund' : 'payment',
        status: mapFinancialTransactionStatus(payment?.status, order.status),
        dateTime: payment?.paidAt ?? payment?.createdAt ?? order.placedAt,
        paymentMethod: formatPaymentMethod(payment?.method ?? null),
        paymentSummary: {
          subtotal: order.totalAmount - order.deliveryFeeAmount - order.serviceChargeAmount,
          serviceCharge: order.serviceChargeAmount,
          deliveryFee: order.deliveryFeeAmount,
          discount: 0,
          total: order.totalAmount,
        },
        parties: {
          customer: order.customer.name,
          restaurant: order.restaurant.name,
          rider: order.rider?.name ?? 'Unassigned',
        },
        canRefund: payment?.status === 'verified' || order.status === 'delivered',
        refundRequested: order.status === 'refunded',
      }
    }),
  }
}

async function selectAdminFinancialTransaction(transactionId: string) {
  const data = await selectAdminFinancials()
  return data.transactions.find((transaction) => transaction.id === transactionId) ?? null
}

async function selectAdminSetting<T>(settingsKey: string, fallback: T) {
  const [setting] = await database
    .select({ value: adminSettings.value })
    .from(adminSettings)
    .where(eq(adminSettings.settingsKey, settingsKey))
    .limit(1)

  return (setting?.value ?? fallback) as T
}

async function upsertAdminSetting(settingsKey: string, value: unknown) {
  const [setting] = await database
    .insert(adminSettings)
    .values({ settingsKey, value })
    .onConflictDoUpdate({
      target: adminSettings.settingsKey,
      set: { value, updatedAt: new Date() },
    })
    .returning({ value: adminSettings.value })

  return setting.value
}

function defaultSalesSettings() {
  return {
    commissionTax: {
      defaultCommissionAmount: 500,
      influencerUplineReward: 100,
      deductWithholdingTax: true,
      taxDeductionRate: 0,
    },
    withdrawalSettings: {
      minimumWithdrawal: 5000,
      maximumPendingRequests: 1,
      allowManualWithdrawalRequests: true,
      requireAdminApproval: true,
    },
    referralRewards: {
      customerReferralReward: 500,
      influencerUplineReward: 100,
      qualificationThreshold: 10,
      autoNotifyQualifiedInfluencers: true,
    },
    payoutSettings: {
      frequency: 'Weekly',
      payoutTime: '17:00',
      autoProcessApprovedPayouts: false,
      holdSuspendedAgentPayouts: true,
    },
    taxationSettings: {
      taxLabel: 'Withholding tax',
      taxIdRequirementThreshold: 50000,
      requireTaxIdBeforeLargePayouts: false,
      showTaxBreakdownOnReceipt: true,
    },
  }
}

async function selectOperationsDeliveryPricing() {
  const settings = await selectAdminSetting('operations_delivery_pricing', {
    baseFeeAmount: 300,
    feePerKmAmount: 80,
    minimumFeeAmount: 400,
    freeDeliveryThresholdAmount: 0,
    serviceAreaOverrides: [] as { serviceAreaId: string; deliveryFeeAmount: number }[],
  })

  const [areaRows, restaurantRows] = await Promise.all([
    database
      .select({
        id: serviceAreas.id,
        name: serviceAreas.name,
        city: serviceAreas.city,
        state: serviceAreas.state,
        isActive: serviceAreas.isActive,
      })
      .from(serviceAreas)
      .orderBy(serviceAreas.name),
    database
      .select({
        id: restaurants.id,
        name: restaurants.name,
        streetAddress: restaurants.streetAddress,
      })
      .from(restaurants)
      .orderBy(restaurants.name),
  ])

  return {
    pricing: settings,
    serviceAreas: areaRows,
    restaurants: restaurantRows,
  }
}

async function selectAdminFoodCombos() {
  const comboStatusMap = await selectAdminSetting<Record<string, string>>('admin_combo_statuses', {})
  const comboCategoryMap = await selectAdminSetting<Record<string, string>>('admin_combo_categories', {})
  const promoComboIds = await selectAdminSetting<Record<string, boolean>>(
    'admin_promo_combo_ids',
    {},
  )
  const comboMandoPrices = await selectAdminSetting<Record<string, number>>(
    'admin_combo_mando_prices',
    {},
  )
  const [comboRows, restaurantRows, menuItemRowsForSelect, serviceAreaRows] = await Promise.all([
    database
    .select({
      id: combos.id,
      name: combos.name,
      description: combos.description,
      imageUrl: combos.imageUrl,
      priceAmount: combos.priceAmount,
      isFeatured: combos.isFeatured,
      isAvailable: combos.isAvailable,
      createdAt: combos.createdAt,
      restaurantId: restaurants.id,
      restaurantName: restaurants.name,
      platformCommissionBps: restaurants.platformCommissionBps,
    })
    .from(combos)
    .innerJoin(restaurants, eq(combos.restaurantId, restaurants.id))
    .orderBy(desc(combos.createdAt)),
    database.select({ name: restaurants.name }).from(restaurants).orderBy(restaurants.name),
    database
      .select({
        itemName: menuItems.name,
        restaurantName: restaurants.name,
      })
      .from(menuItems)
      .innerJoin(restaurants, eq(menuItems.restaurantId, restaurants.id))
      .where(eq(menuItems.isAvailable, true))
      .orderBy(restaurants.name, menuItems.name),
    database
      .select({ id: serviceAreas.id, name: serviceAreas.name })
      .from(serviceAreas)
      .orderBy(serviceAreas.name),
  ])

  const comboIds = comboRows.map((combo) => combo.id)
  const [componentRows, orderItemRows, campaignRows, campaignEventRows] = await Promise.all([
    comboIds.length
      ? database
          .select({
            comboId: comboItems.comboId,
            quantity: comboItems.quantity,
            isOptional: comboItems.isOptional,
            menuItemName: menuItems.name,
            menuItemPrice: menuItems.priceAmount,
          })
          .from(comboItems)
          .innerJoin(menuItems, eq(comboItems.menuItemId, menuItems.id))
          .where(inArray(comboItems.comboId, comboIds))
      : [],
    comboIds.length
      ? database.select().from(orderItems).where(inArray(orderItems.comboId, comboIds))
      : [],
    comboIds.length
      ? database.select().from(comboCampaigns).where(inArray(comboCampaigns.comboId, comboIds))
      : [],
    comboIds.length
      ? database
          .select()
          .from(comboCampaignEvents)
          .where(inArray(comboCampaignEvents.comboId, comboIds))
      : [],
  ])
  const componentsByComboId = groupBy(componentRows, (component) => component.comboId)
  const campaignsByComboId = groupBy(campaignRows, (campaign) => campaign.comboId)
  const campaignEventsByComboId = groupBy(campaignEventRows, (event) => event.comboId)
  const orderItemsByComboId = groupBy(
    orderItemRows.filter((item) => Boolean(item.comboId)),
    (item) => item.comboId ?? 'unknown',
  )
  const comboList = comboRows.map((combo) => {
    const orderItemsForCombo = orderItemsByComboId.get(combo.id) ?? []
    const campaign = campaignsByComboId.get(combo.id)?.[0] ?? null
    const campaignEvents = campaignEventsByComboId.get(combo.id) ?? []
    const margin = comboMandoPrices[combo.id] ?? calculateCommissionAmount(combo.priceAmount, combo.platformCommissionBps)

    return {
      id: combo.id,
      name: combo.name,
      restaurant: combo.restaurantName,
      category: comboCategoryMap[combo.id] ?? combo.description ?? 'Combo',
      image: combo.imageUrl ?? null,
      price: combo.priceAmount,
      margin,
      orders: orderItemsForCombo.reduce((total, item) => total + item.quantity, 0),
      rating: 0,
      status: comboStatusMap[combo.id] ?? (combo.isAvailable ? 'active' : 'sold out'),
      isFeatured: combo.isFeatured,
      isPromoCombo: Boolean(promoComboIds[combo.id]),
      campaign: campaign
        ? {
            id: campaign.id,
            flyerUrl: campaign.flyerUrl,
            flyerPublicId: campaign.flyerPublicId,
            content: campaign.content,
            startsAt: campaign.startsAt,
            endsAt: campaign.endsAt,
            status: campaign.status,
            stats: {
              viewed: campaignEvents.filter((event) => event.eventType === 'viewed').length,
              clicked: campaignEvents.filter((event) => event.eventType === 'clicked').length,
              shared: campaignEvents.filter((event) => event.eventType === 'shared').length,
            },
          }
        : null,
      items: (componentsByComboId.get(combo.id) ?? []).map((item) => ({
        name: item.menuItemName,
        quantity: `${item.quantity} portion${item.quantity === 1 ? '' : 's'}`,
        extraPrice: item.menuItemPrice,
        isOptional: item.isOptional,
      })),
    }
  })

  return {
    stats: {
      total: comboList.length,
      active: comboList.filter((combo) => combo.status === 'active').length,
      inactive: comboList.filter((combo) => combo.status !== 'active' && combo.status !== 'sold out').length,
      outOfStock: comboList.filter((combo) => combo.status === 'sold out').length,
      totalOrdersThisWeek: comboList.reduce((total, combo) => total + combo.orders, 0),
    },
    combos: comboList,
    restaurants: restaurantRows.map((restaurant) => restaurant.name),
    serviceAreas: serviceAreaRows,
    menuItemsByRestaurant: menuItemRowsForSelect.reduce<Record<string, string[]>>((map, item) => {
      map[item.restaurantName] = [...(map[item.restaurantName] ?? []), item.itemName]
      return map
    }, {}),
  }
}

async function selectAdminFoodComboDetail(comboId: string) {
  const data = await selectAdminFoodCombos()
  return data.combos.find((combo) => combo.id === comboId) ?? null
}

function parseOptionalDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

async function selectAdminComboCampaign(comboId: string) {
  const [campaign] = await database
    .select()
    .from(comboCampaigns)
    .where(eq(comboCampaigns.comboId, comboId))
    .limit(1)

  return campaign ?? null
}

async function upsertAdminComboCampaign(
  comboId: string,
  input: z.infer<typeof adminComboCampaignBodySchema> | undefined,
) {
  if (!input) return null

  const values = {
    comboId,
    flyerUrl: input.flyerUrl || null,
    flyerPublicId: input.flyerPublicId || null,
    content: input.content ?? '',
    startsAt: parseOptionalDate(input.startsAt),
    endsAt: parseOptionalDate(input.endsAt),
    status: input.status,
    updatedAt: new Date(),
  }

  const existing = await selectAdminComboCampaign(comboId)
  if (existing) {
    const [campaign] = await database
      .update(comboCampaigns)
      .set(values)
      .where(eq(comboCampaigns.id, existing.id))
      .returning()
    return campaign
  }

  const [campaign] = await database.insert(comboCampaigns).values(values).returning()
  return campaign
}
async function createAdminFoodCombo(input: z.infer<typeof adminComboBodySchema>) {
  const [restaurant] = await database
    .select({
      id: restaurants.id,
      platformCommissionBps: restaurants.platformCommissionBps,
    })
    .from(restaurants)
    .where(sql`lower(${restaurants.name}) = ${input.restaurant.toLowerCase()}`)
    .limit(1)

  if (!restaurant) {
    throw new Error('Restaurant not found for combo.')
  }

  const slug = await createUniqueComboSlug(restaurant.id, input.name)
  const [combo] = await database
    .insert(combos)
    .values({
      restaurantId: restaurant.id,
      slug,
      name: input.name,
      description: input.description || input.category,
      priceAmount: input.price,
      imageUrl: input.imageUrl || null,
      isFeatured: input.isFeatured,
      isAvailable: input.status === 'active',
    })
    .returning({ id: combos.id })

  await upsertComboItems(combo.id, restaurant.id, input.items)
  await setAdminComboMandoPrice(combo.id, input.mandoPrice)
  await setAdminComboStatus(combo.id, input.status)
  await setAdminComboCategory(combo.id, input.category || input.description || 'Combo')
  await upsertAdminComboCampaign(combo.id, input.campaign)
  return selectAdminFoodComboDetail(combo.id)
}

async function updateAdminFoodCombo(
  comboId: string,
  input: z.infer<typeof adminComboUpdateBodySchema>,
) {
  const [existingCombo] = await database.select().from(combos).where(eq(combos.id, comboId)).limit(1)
  if (!existingCombo) return null

  let restaurantId = existingCombo.restaurantId
  if (input.restaurant) {
    const [restaurant] = await database
      .select({ id: restaurants.id })
      .from(restaurants)
      .where(sql`lower(${restaurants.name}) = ${input.restaurant.toLowerCase()}`)
      .limit(1)
    if (restaurant) restaurantId = restaurant.id
  }

  await database
    .update(combos)
    .set({
      restaurantId,
      name: input.name,
      slug: input.name ? await createUniqueComboSlug(restaurantId, input.name, comboId) : undefined,
      description: input.description ?? input.category,
      priceAmount: input.price,
      imageUrl: input.imageUrl,
      isFeatured: input.isFeatured,
      isAvailable: input.status ? input.status === 'active' : undefined,
      updatedAt: new Date(),
    })
    .where(eq(combos.id, comboId))

  if (input.items?.length) {
    await database.delete(comboItems).where(eq(comboItems.comboId, comboId))
    await upsertComboItems(comboId, restaurantId, input.items)
  }
  if (typeof input.mandoPrice === 'number') await setAdminComboMandoPrice(comboId, input.mandoPrice)
  if (input.status) await setAdminComboStatus(comboId, input.status)
  if (input.category || input.description) await setAdminComboCategory(comboId, input.category ?? input.description ?? 'Combo')
  if (input.campaign) await upsertAdminComboCampaign(comboId, input.campaign)
  return selectAdminFoodComboDetail(comboId)
}

async function upsertComboItems(
  comboId: string,
  restaurantId: string,
  items: z.infer<typeof adminComboItemBodySchema>[],
) {
  const normalizedItems = Array.from(
    items
      .reduce((map, item) => {
        const key = item.name.trim().toLowerCase()
        if (!key) return map

        const existing = map.get(key)
        map.set(
          key,
          existing
            ? {
                ...existing,
                quantity: existing.quantity + item.quantity,
                extraPrice: Math.max(existing.extraPrice, item.extraPrice),
              }
            : item,
        )

        return map
      }, new Map<string, z.infer<typeof adminComboItemBodySchema>>())
      .values(),
  )

  for (const item of normalizedItems) {
    const [existingItem] = await database
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(
        and(
          eq(menuItems.restaurantId, restaurantId),
          sql`lower(${menuItems.name}) = ${item.name.toLowerCase()}`,
        ),
      )
      .limit(1)

    const menuItemId = existingItem?.id ?? (
      await database
        .insert(menuItems)
        .values({
          restaurantId,
          name: item.name,
          priceAmount: item.extraPrice,
          isAvailable: true,
        })
        .returning({ id: menuItems.id })
    )[0].id

    await database.insert(comboItems).values({
      comboId,
      menuItemId,
      quantity: item.quantity,
      isOptional: false,
    })
  }
}

async function setAdminComboMandoPrice(comboId: string, mandoPrice: number | undefined) {
  if (typeof mandoPrice !== 'number') return
  const priceMap = await selectAdminSetting<Record<string, number>>('admin_combo_mando_prices', {})
  await upsertAdminSetting('admin_combo_mando_prices', {
    ...priceMap,
    [comboId]: mandoPrice,
  })
}

async function setAdminComboPromo(comboId: string, isPromoCombo: boolean) {
  const promoMap = await selectAdminSetting<Record<string, boolean>>(
    'admin_promo_combo_ids',
    {},
  )
  const nextPromoMap = { ...promoMap }

  if (isPromoCombo) nextPromoMap[comboId] = true
  else delete nextPromoMap[comboId]

  await upsertAdminSetting('admin_promo_combo_ids', nextPromoMap)
}

async function setAdminComboStatus(comboId: string, status: string) {
  const statusMap = await selectAdminSetting<Record<string, string>>('admin_combo_statuses', {})
  await upsertAdminSetting('admin_combo_statuses', {
    ...statusMap,
    [comboId]: status,
  })
}

async function setAdminComboCategory(comboId: string, category: string) {
  const categoryMap = await selectAdminSetting<Record<string, string>>('admin_combo_categories', {})
  await upsertAdminSetting('admin_combo_categories', {
    ...categoryMap,
    [comboId]: category,
  })
}

async function createUniqueComboSlug(restaurantId: string, name: string, ignoreComboId?: string) {
  const base = slugify(name)
  const [existing] = await database
    .select({ id: combos.id })
    .from(combos)
    .where(and(eq(combos.restaurantId, restaurantId), eq(combos.slug, base)))
    .limit(1)

  if (!existing || existing.id === ignoreComboId) return base
  return `${base}-${Date.now().toString(36).slice(-5)}`
}

async function selectAdminSalesAgents() {
  const agentRows = await database
    .select({
      id: users.id,
      email: users.email,
      userStatus: users.status,
      createdAt: users.createdAt,
      fullName: profiles.fullName,
      phone: profiles.phone,
      agentCode: salesAgentProfiles.agentCode,
      referralCode: salesAgentProfiles.referralCode,
      uplineSalesAgentId: salesAgentProfiles.uplineSalesAgentId,
      status: salesAgentProfiles.status,
      tier: salesAgentProfiles.tier,
    })
    .from(salesAgentProfiles)
    .innerJoin(users, eq(salesAgentProfiles.userId, users.id))
    .innerJoin(profiles, eq(salesAgentProfiles.userId, profiles.userId))
    .orderBy(desc(users.createdAt))

  const agentIds = agentRows.map((agent) => agent.id)
  const [referralRows, commissionRows] = await Promise.all([
    agentIds.length
      ? database.select().from(referrals).where(inArray(referrals.salesAgentId, agentIds))
      : [],
    agentIds.length
      ? database.select().from(commissions).where(inArray(commissions.salesAgentId, agentIds))
      : [],
  ])
  const referralsByAgentId = groupBy(referralRows, (referral) => referral.salesAgentId)
  const commissionsByAgentId = groupBy(commissionRows, (commission) => commission.salesAgentId)
  const agentNameById = new Map(agentRows.map((agent) => [agent.id, agent.fullName]))

  const agents = agentRows.map((agent) => {
    const agentReferrals = referralsByAgentId.get(agent.id) ?? []
    const agentCommissions = commissionsByAgentId.get(agent.id) ?? []
    const successfulOrders = agentCommissions.filter((commission) =>
      ['earned', 'approved', 'paid'].includes(commission.status),
    ).length

    return {
      id: agent.id,
      name: agent.fullName,
      initials: initialsFromName(agent.fullName),
      email: agent.email,
      phone: agent.phone ?? 'No phone',
      status: mapAdminSalesAgentStatus(agent.status, agent.tier, agent.userStatus),
      type: agent.tier === 'influencer' ? 'Influencer' : 'Agent',
      area: 'All service areas',
      downlines: agentReferrals.length,
      successfulOrders,
      avgTransactions: agentReferrals.length
        ? Math.round(successfulOrders / Math.max(agentReferrals.length, 1))
        : successfulOrders,
      commissionRate: agentCommissions.length
        ? Number((agentCommissions[0].rateBps / 100).toFixed(2))
        : 0,
      referrals: agentReferrals.length,
      revenue: agentCommissions.reduce((total, commission) => total + commission.eligibleAmount, 0),
      commission: agentCommissions.reduce((total, commission) => total + commission.commissionAmount, 0),
      upline: agent.uplineSalesAgentId
        ? agentNameById.get(agent.uplineSalesAgentId) ?? 'External upline'
        : 'None',
      joined: agent.createdAt,
      comboClicks: agentReferrals.length,
      conversionRate: agentReferrals.length ? Math.round((successfulOrders / agentReferrals.length) * 100) : 0,
      agentCode: agent.agentCode,
      referralCode: agent.referralCode,
    }
  })

  return {
    stats: {
      totalAgents: agents.length,
      activeThisWeek: agents.filter((agent) => agent.status === 'active' || agent.status === 'influencer').length,
      totalReferrals: agents.reduce((total, agent) => total + agent.referrals, 0),
      influencers: agents.filter((agent) => agent.status === 'influencer').length,
      pendingApprovals: agents.filter((agent) => agent.status === 'pending').length,
      totalRevenue: agents.reduce((total, agent) => total + agent.revenue, 0),
      totalCommission: agents.reduce((total, agent) => total + agent.commission, 0),
    },
    agents,
  }
}

async function selectAdminSalesAgentDetail(agentId: string) {
  const data = await selectAdminSalesAgents()
  return data.agents.find((agent) => agent.id === agentId) ?? null
}

async function createAdminSalesAgent(input: z.infer<typeof salesAgentBodySchema>) {
  const fullName = `${input.firstName} ${input.lastName}`.trim()
  const agentCode = await createUniqueAgentCode(fullName)
  const referralCode = input.referralCode || await createUniqueReferralCode(fullName)
  const user = await getOrCreateUserForRole({
    email: input.email,
    fullName,
    phone: input.phone,
    role: 'sales_agent',
  })

  await database.insert(salesAgentProfiles).values({
    userId: user.id,
    agentCode,
    referralCode,
    status: 'active',
    tier: input.agentType.toLowerCase().includes('influencer') ? 'influencer' : 'standard',
    commissionRateBps: 0,
  })

  if (input.bankName && input.accountNumber && input.accountName) {
    await database.insert(payoutAccounts).values({
      userId: user.id,
      bankCode: input.bankName,
      accountName: input.accountName,
      accountNumberEncrypted: `admin-collected-${input.accountNumber.slice(-4)}`,
      accountNumberLast4: input.accountNumber.slice(-4),
      isVerified: true,
    })
  }

  return selectAdminSalesAgentDetail(user.id)
}

async function updateAdminSalesAgent(
  agentId: string,
  input: z.infer<typeof salesAgentUpdateBodySchema>,
) {
  if (input.email || input.status) {
    await database
      .update(users)
      .set({
        email: input.email,
        status: input.status,
        updatedAt: new Date(),
      })
      .where(eq(users.id, agentId))
  }

  if (input.fullName || input.phone) {
    await database
      .update(profiles)
      .set({
        fullName: input.fullName,
        phone: input.phone,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, agentId))
  }

  if (input.agentCode || input.status || input.commissionRate !== undefined) {
    await database
      .update(salesAgentProfiles)
      .set({
        agentCode: input.agentCode,
        status: input.status,
        commissionRateBps:
          input.commissionRate !== undefined
            ? Math.round(input.commissionRate * 100)
            : undefined,
        updatedAt: new Date(),
      })
      .where(eq(salesAgentProfiles.userId, agentId))
  }

  return selectAdminSalesAgentDetail(agentId)
}

async function createUniqueAgentCode(name: string) {
  const prefix = initialsFromName(name) || 'SA'
  const code = `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
  const [existing] = await database
    .select({ userId: salesAgentProfiles.userId })
    .from(salesAgentProfiles)
    .where(eq(salesAgentProfiles.agentCode, code))
    .limit(1)
  return existing ? `${prefix}-${Date.now().toString(36).slice(-5).toUpperCase()}` : code
}

async function createUniqueReferralCode(name: string) {
  const base = `${slugify(name).replace(/-/g, '').slice(0, 8)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase()
  const [existing] = await database
    .select({ userId: salesAgentProfiles.userId })
    .from(salesAgentProfiles)
    .where(eq(salesAgentProfiles.referralCode, base))
    .limit(1)
  return existing ? `SA${Date.now().toString(36).slice(-6).toUpperCase()}` : base
}

async function selectAdminPromo() {
  const orderRows = await database.select().from(orders)
  const referralRows = await database.select().from(referrals)
  const campaigns = await selectAdminSetting('promo_campaigns', defaultPromoCampaigns(orderRows, referralRows))
  const couponRules = await selectAdminSetting(
    'promo_coupon_rules',
    'Coupon is valid for one customer account only.\nCoupon cannot be combined with another active promo.\nMando may pause a coupon when abuse is detected.',
  )

  return {
    stats: {
      campaigns: campaigns.length,
      activePromos: campaigns.filter((campaign) => campaign.status === 'active').length,
      redemptions: campaigns.reduce((total, campaign) => total + campaign.redemptions, 0),
      promoRevenue: campaigns.reduce((total, campaign) => total + campaign.revenue, 0),
    },
    campaigns,
    couponRules,
    coupons: [
      { code: 'MANDO300', usage: campaigns[1]?.redemptions ?? 0, limit: 200, status: 'active' },
      { code: 'FIRSTDELIVERY', usage: referralRows.length, limit: 500, status: 'active' },
      { code: 'WEEKEND20', usage: 0, limit: 100, status: 'scheduled' },
    ],
  }
}

function defaultPromoCampaigns(
  orderRows: (typeof orders.$inferSelect)[],
  referralRows: (typeof referrals.$inferSelect)[],
) {
  return [
    {
      id: 'promo-first-order',
      name: 'First Order Boost',
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80',
      channel: 'Referral links',
      audience: 'New customers',
      budget: 80000,
      redemptions: referralRows.length,
      revenue: orderRows
        .filter((order) => order.status !== 'cancelled')
        .reduce((total, order) => total + order.totalAmount, 0),
      status: 'active',
      startsAt: '2026-07-01',
      endsAt: '2026-07-31',
      offer: 'Reward first-time customer acquisition',
      campaignType: 'Referral',
      targetLocation: 'All service areas',
    },
    {
      id: 'promo-local-lunch',
      name: 'Local Lunch Push',
      imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80',
      channel: 'In-app banner',
      audience: 'Lunch buyers',
      budget: 40000,
      redemptions: Math.max(0, Math.floor(orderRows.length / 2)),
      revenue: orderRows.slice(0, 10).reduce((total, order) => total + order.totalAmount, 0),
      status: 'active',
      startsAt: '2026-07-12',
      endsAt: '2026-07-18',
      offer: 'Push lunchtime combo discovery',
      campaignType: 'Discount',
      targetLocation: 'Fashina',
    },
    {
      id: 'promo-weekend',
      name: 'Weekend Combo Drive',
      imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80',
      channel: 'Push notification',
      audience: 'Repeat customers',
      budget: 25000,
      redemptions: 0,
      revenue: 0,
      status: 'scheduled',
      startsAt: '2026-07-18',
      endsAt: '2026-07-20',
      offer: 'Bundle discount',
      campaignType: 'Flash sale',
      targetLocation: 'All service areas',
    },
  ]
}

async function saveAdminPromoCampaign(input: Partial<z.infer<typeof promoCampaignBodySchema>> & { id?: string }) {
  const promo = await selectAdminPromo()
  const campaigns = promo.campaigns
  const campaignId = input.id ?? `promo-${slugify(input.name ?? 'campaign')}-${Date.now().toString(36)}`
  const existing = campaigns.find((campaign) => campaign.id === campaignId)
  const campaign = {
    ...(existing ?? {
      redemptions: 0,
      revenue: 0,
      imageUrl: null,
      campaignType: input.campaignType ?? 'Discount',
      targetLocation: input.targetLocation ?? 'All service areas',
    }),
    ...input,
    id: campaignId,
  }

  const nextCampaigns = existing
    ? campaigns.map((item) => (item.id === campaignId ? campaign : item))
    : [campaign, ...campaigns]

  await upsertAdminSetting('promo_campaigns', nextCampaigns)
  return campaign
}

async function selectAdminRiders() {
  const riderRows = await database
    .select({
      id: users.id,
      email: users.email,
      status: users.status,
      createdAt: users.createdAt,
      fullName: profiles.fullName,
      phone: profiles.phone,
      availabilityStatus: riderProfiles.availabilityStatus,
      riderCode: riderProfiles.riderCode,
      homeAddress: riderProfiles.homeAddress,
      lastSeenAt: riderProfiles.lastSeenAt,
      serviceAreaId: serviceAreas.id,
      serviceAreaName: serviceAreas.name,
      serviceAreaCity: serviceAreas.city,
      serviceAreaState: serviceAreas.state,
      vehicleType: riderVehicles.vehicleType,
      plateNumber: riderVehicles.plateNumber,
      vehicleColor: riderVehicles.color,
      vehicleModel: riderVehicles.model,
    })
    .from(riderProfiles)
    .innerJoin(users, eq(riderProfiles.userId, users.id))
    .innerJoin(profiles, eq(riderProfiles.userId, profiles.userId))
    .innerJoin(serviceAreas, eq(riderProfiles.serviceAreaId, serviceAreas.id))
    .leftJoin(riderVehicles, eq(riderProfiles.userId, riderVehicles.riderId))
    .orderBy(desc(users.createdAt))

  const riderIds = riderRows.map((rider) => rider.id)
  const deliveryRows = riderIds.length
    ? await database.select().from(deliveries).where(inArray(deliveries.riderId, riderIds))
    : []
  const requestRows = riderIds.length
    ? await database.select().from(payoutRequests).where(inArray(payoutRequests.userId, riderIds))
    : []
  const documentRows = riderIds.length
    ? await database.select().from(riderDocuments).where(inArray(riderDocuments.riderId, riderIds))
    : []
  const riderAreaRows = riderIds.length
    ? await database
        .select({
          riderId: riderServiceAreas.riderId,
          serviceAreaName: serviceAreas.name,
        })
        .from(riderServiceAreas)
        .innerJoin(serviceAreas, eq(riderServiceAreas.serviceAreaId, serviceAreas.id))
        .where(inArray(riderServiceAreas.riderId, riderIds))
    : []

  const deliveriesByRiderId = groupBy(deliveryRows, (delivery) => delivery.riderId ?? 'unassigned')
  const requestsByRiderId = groupBy(requestRows, (request) => request.userId ?? 'unknown')
  const documentsByRiderId = groupBy(documentRows, (document) => document.riderId)
  const serviceAreasByRiderId = groupBy(riderAreaRows, (area) => area.riderId)

  return riderRows.map((rider) => {
    const riderDeliveries = deliveriesByRiderId.get(rider.id) ?? []
    const completedDeliveries = riderDeliveries.filter((delivery) => delivery.status === 'delivered')
    const activeDeliveries = riderDeliveries.filter((delivery) =>
      ['assigned', 'accepted', 'picked_up', 'on_the_way'].includes(delivery.status),
    )
    const riderRequests = requestsByRiderId.get(rider.id) ?? []
    const totalEarnings = completedDeliveries.reduce(
      (total, delivery) => total + delivery.riderEarningAmount,
      0,
    )

    return {
      id: rider.id,
      name: rider.fullName,
      initials: initialsFromName(rider.fullName),
      email: rider.email,
      phone: rider.phone ?? 'No phone',
      address: rider.homeAddress ?? `${rider.serviceAreaName}, ${rider.serviceAreaCity}`,
      status: mapRiderStatus(rider.status, rider.availabilityStatus),
      availability: mapRiderAvailability(rider.availabilityStatus),
      location: (serviceAreasByRiderId.get(rider.id) ?? [])
        .map((area) => area.serviceAreaName)
        .join(', ') || rider.serviceAreaName,
      vehicleType: formatVehicleType(rider.vehicleType ?? 'motorcycle'),
      plateNumber: rider.plateNumber ?? 'Not recorded',
      vehicleColor: rider.vehicleColor ?? null,
      vehicleModel: rider.vehicleModel ?? null,
      lastSeen: formatRiderLastSeen(rider.lastSeenAt, rider.availabilityStatus),
      orders: riderDeliveries.length,
      rating: completedDeliveries.length ? 4.8 : 0,
      joined: rider.createdAt,
      totalDeliveries: completedDeliveries.length,
      totalEarnings,
      completionRate: riderDeliveries.length
        ? Math.round((completedDeliveries.length / riderDeliveries.length) * 100)
        : 0,
      activeDeliveryCount: activeDeliveries.length,
      payoutRequestCount: riderRequests.length,
      riderCode: rider.riderCode,
      documents: buildRiderDocuments(rider.id, documentsByRiderId.get(rider.id) ?? []),
    }
  })
}

async function selectAdminRiderDetail(riderId: string) {
  const riderRows = await selectAdminRiders()
  return riderRows.find((rider) => rider.id === riderId) ?? null
}

async function selectAdminServiceAreas() {
  return database
    .select({
      id: serviceAreas.id,
      name: serviceAreas.name,
      city: serviceAreas.city,
      state: serviceAreas.state,
    })
    .from(serviceAreas)
    .where(eq(serviceAreas.isActive, true))
    .orderBy(serviceAreas.name)
}

async function selectAdminRiderCommissions() {
  const [requestRows, payoutSettings, vehicleFeeRows] = await Promise.all([
    database
      .select({
        id: payoutRequests.id,
        userId: payoutRequests.userId,
        payoutAccountId: payoutRequests.payoutAccountId,
        amount: payoutRequests.amount,
        status: payoutRequests.status,
        requestedAt: payoutRequests.requestedAt,
      })
      .from(payoutRequests)
      .where(eq(payoutRequests.type, 'rider_earnings'))
      .orderBy(desc(payoutRequests.requestedAt)),
    selectAdminPayoutSettings('riders'),
    selectRiderDeliveryFeeSettings(),
  ])
  const riderIds = requestRows
    .map((request) => request.userId)
    .filter((id): id is string => Boolean(id))
  const accountIds = requestRows.map((request) => request.payoutAccountId)
  const [riderRows, accountRows, deliveryRows] = await Promise.all([
    riderIds.length
      ? database.select().from(profiles).where(inArray(profiles.userId, riderIds))
      : [],
    accountIds.length
      ? database.select().from(payoutAccounts).where(inArray(payoutAccounts.id, accountIds))
      : [],
    riderIds.length
      ? database.select().from(deliveries).where(inArray(deliveries.riderId, riderIds))
      : [],
  ])
  const riderById = new Map(riderRows.map((rider) => [rider.userId, rider]))
  const accountById = new Map(accountRows.map((account) => [account.id, account]))
  const deliveriesByRiderId = groupBy(deliveryRows, (delivery) => delivery.riderId ?? 'unassigned')

  return {
    vehicleFeeSettings: vehicleFeeRows,
    payoutSettings,
    withdrawalRequests: requestRows.map((request) => {
      const rider = request.userId ? riderById.get(request.userId) : null
      const riderDeliveries = request.userId
        ? deliveriesByRiderId.get(request.userId) ?? []
        : []
      const deliveryFees = riderDeliveries.reduce(
        (total, delivery) => total + delivery.deliveryFeeAmount,
        0,
      )
      const riderAmount = riderDeliveries.reduce(
        (total, delivery) => total + delivery.riderEarningAmount,
        0,
      )
      const account = accountById.get(request.payoutAccountId)

      return {
        id: request.id,
        rider: rider?.fullName ?? 'Rider',
        deliveries: riderDeliveries.length,
        deliveryFees,
        mandoCut: Math.max(deliveryFees - riderAmount, 0),
        riderAmount: request.amount,
        paymentMethod: account
          ? `${account.bankCode} • ${account.accountNumberLast4}`
          : 'Bank transfer',
        payoutDetails: account
          ? `${account.accountName} • ****${account.accountNumberLast4}`
          : 'No payout account details',
        requestDate: request.requestedAt,
        status: request.status,
      }
    }),
  }
}

async function createAdminRider(input: z.infer<typeof riderBodySchema>) {
  const areaNames = input.serviceAreas?.length ? input.serviceAreas : [input.serviceArea]
  const areaRows = await Promise.all(areaNames.map((area) => ensureServiceArea(area)))
  const serviceArea = areaRows[0]
  const riderCode = await createUniqueRiderCode(input.fullName)
  const accountNumberLast4 = input.accountNumber.slice(-4)
  const user = await getOrCreateUserForRole({
    email: input.email,
    fullName: input.fullName,
    phone: input.phone,
    role: 'rider',
  })

  await database.insert(riderProfiles).values({
    userId: user.id,
    riderCode,
    serviceAreaId: serviceArea.id,
    homeAddress: input.address,
    availabilityStatus: 'offline',
  })

  if (areaRows.length > 0) {
    await database
      .insert(riderServiceAreas)
      .values(areaRows.map((area) => ({
        riderId: user.id,
        serviceAreaId: area.id,
      })))
      .onConflictDoNothing()
  }

  await database.insert(riderVehicles).values({
    riderId: user.id,
    vehicleType: parseVehicleType(input.vehicleType),
    plateNumber: input.plateNumber || null,
    color: input.vehicleColor || null,
    model: input.vehicleModel || null,
  })

  await upsertRiderDocuments(user.id, input)

  await database.insert(payoutAccounts).values({
    userId: user.id,
    bankCode: input.bankName,
    accountName: input.accountName,
    accountNumberEncrypted: `admin-collected-${accountNumberLast4}`,
    accountNumberLast4,
    isVerified: true,
  })

  return selectAdminRiderDetail(user.id)
}

async function createUniqueRiderCode(name: string) {
  const prefix = initialsFromName(name) || 'RD'
  const baseCode = `${prefix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  const [existingRider] = await database
    .select({ userId: riderProfiles.userId })
    .from(riderProfiles)
    .where(eq(riderProfiles.riderCode, baseCode))
    .limit(1)

  if (!existingRider) return baseCode
  return `${prefix}-${Date.now().toString(36).slice(-5).toUpperCase()}`
}

async function upsertRiderDocuments(
  riderId: string,
  input: z.infer<typeof riderBodySchema>,
) {
  const documents = [
    {
      riderId,
      type: 'government_id' as const,
      name: 'Government ID',
      fileUrl: input.governmentIdUrl || null,
      status: input.governmentIdUrl ? 'uploaded' as const : 'pending' as const,
      uploadedAt: input.governmentIdUrl ? new Date() : null,
    },
    {
      riderId,
      type: 'vehicle_license' as const,
      name: 'Vehicle license',
      fileUrl: input.vehicleLicenseUrl || null,
      status: input.vehicleLicenseUrl ? 'uploaded' as const : 'pending' as const,
      uploadedAt: input.vehicleLicenseUrl ? new Date() : null,
    },
    {
      riderId,
      type: 'proof_of_address' as const,
      name: 'Proof of address',
      fileUrl: input.proofOfAddressUrl || null,
      status: input.proofOfAddressUrl ? 'uploaded' as const : 'pending' as const,
      uploadedAt: input.proofOfAddressUrl ? new Date() : null,
    },
  ]

  for (const document of documents) {
    await database
      .insert(riderDocuments)
      .values(document)
      .onConflictDoUpdate({
        target: [riderDocuments.riderId, riderDocuments.type],
        set: {
          name: document.name,
          fileUrl: sql`coalesce(${document.fileUrl ?? null}, ${riderDocuments.fileUrl})`,
          status: sql`case when ${riderDocuments.status} = 'pending' and ${document.status} = 'uploaded' then 'uploaded'::rider_document_status else ${riderDocuments.status} end`,
          uploadedAt: sql`coalesce(${document.uploadedAt ?? null}, ${riderDocuments.uploadedAt})`,
          updatedAt: new Date(),
        },
      })
  }
}

async function selectRiderDeliveryFeeSettings() {
  const rows = await database
    .select()
    .from(riderDeliveryFeeSettings)
    .orderBy(riderDeliveryFeeSettings.vehicleType)

  if (rows.length) {
    return rows.map((row) => ({
      id: row.vehicleType,
      vehicleType: formatVehicleType(row.vehicleType),
      deliveryFee: row.deliveryFeeAmount,
      mandoCutPercent: row.mandoCutPercent,
    }))
  }

  return [
    { id: 'motorcycle', vehicleType: 'Motorcycle', deliveryFee: 400, mandoCutPercent: 20 },
    { id: 'bicycle', vehicleType: 'Bicycle', deliveryFee: 300, mandoCutPercent: 15 },
    { id: 'car', vehicleType: 'Car', deliveryFee: 700, mandoCutPercent: 25 },
  ]
}

async function selectAdminPayoutSettings(settingsKey = 'default') {
  const [settings] = await database
    .select({
      frequency: adminPayoutSettings.frequency,
      payoutTime: adminPayoutSettings.payoutTime,
      minimumWithdrawal: adminPayoutSettings.minimumWithdrawal,
      autoProcess: adminPayoutSettings.autoProcess,
      autoDeductCommission: adminPayoutSettings.autoDeductCommission,
    })
    .from(adminPayoutSettings)
    .where(eq(adminPayoutSettings.settingsKey, settingsKey))
    .limit(1)

  return (
    settings ?? {
      frequency: 'Weekly',
      payoutTime: '17:00',
      minimumWithdrawal: 5000,
      autoProcess: false,
      autoDeductCommission: true,
    }
  )
}

async function selectRestaurantManager(vendorId: string) {
  const members = await database
    .select()
    .from(restaurantMembers)
    .where(eq(restaurantMembers.restaurantId, vendorId))

  return chooseRestaurantManager(members)
}

async function ensureServiceArea(serviceAreaText: string) {
  const [namePart, cityPart, statePart] = serviceAreaText
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  const name = namePart || serviceAreaText.trim()
  const city = cityPart || 'Ile-Ife'
  const state = statePart || 'Osun'

  const [existingArea] = await database
    .select({ id: serviceAreas.id })
    .from(serviceAreas)
    .where(sql`lower(${serviceAreas.name}) = ${name.toLowerCase()}`)
    .limit(1)

  if (existingArea) return existingArea

  const [createdArea] = await database
    .insert(serviceAreas)
    .values({ name, city, state, isActive: true })
    .returning({ id: serviceAreas.id })

  return createdArea
}

async function createUniqueRestaurantSlug(name: string) {
  const baseSlug = slugify(name)
  const [existingRestaurant] = await database
    .select({ id: restaurants.id })
    .from(restaurants)
    .where(eq(restaurants.slug, baseSlug))
    .limit(1)

  if (!existingRestaurant) return baseSlug

  return `${baseSlug}-${Date.now().toString(36)}`
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `vendor-${Date.now().toString(36)}`
  )
}

function createTemporaryPassword() {
  return 'Password123!'
}

async function getOrCreateUserForRole(input: {
  email: string
  fullName: string
  phone?: string | null
  role: 'customer' | 'restaurant' | 'rider' | 'sales_agent' | 'admin'
}) {
  const normalizedEmail = input.email.trim().toLowerCase()
  const [existingUser] = await database
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(sql`lower(${users.email}) = ${normalizedEmail}`)
    .limit(1)

  const user = existingUser ?? (
    await database
      .insert(users)
      .values({
        email: normalizedEmail,
        passwordHash: await hashPassword(createTemporaryPassword()),
        status: 'active',
        emailVerifiedAt: new Date(),
      })
      .returning({ id: users.id, email: users.email })
  )[0]

  if (!user) throw new Error('User creation failed.')

  await database
    .insert(profiles)
    .values({
      userId: user.id,
      fullName: input.fullName,
      phone: input.phone ?? null,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        fullName: input.fullName,
        phone: input.phone ?? null,
        updatedAt: new Date(),
      },
    })

  await database
    .insert(userRoles)
    .values({
      userId: user.id,
      role: input.role,
    })
    .onConflictDoNothing()

  return user
}

function buildVendorStats(vendorRows: Awaited<ReturnType<typeof selectAdminVendors>>) {
  return {
    total: vendorRows.length,
    pendingApproval: vendorRows.filter((vendor) => vendor.rawStatus === 'draft').length,
    suspended: vendorRows.filter((vendor) => vendor.rawStatus === 'paused').length,
    inactive: vendorRows.filter((vendor) => vendor.rawStatus === 'archived').length,
  }
}

function buildRiderStats(riderRows: Awaited<ReturnType<typeof selectAdminRiders>>) {
  return {
    total: riderRows.length,
    active: riderRows.filter((rider) => rider.status === 'active').length,
    onDelivery: riderRows.filter((rider) => rider.status === 'on delivery').length,
    offline: riderRows.filter((rider) => rider.status === 'offline').length,
    suspended: riderRows.filter((rider) => rider.status === 'suspended').length,
  }
}

function buildPayoutQueueItem(
  label: string,
  requestRows: (typeof payoutRequests.$inferSelect)[],
  type: (typeof payoutRequests.$inferSelect)['type'],
) {
  const matchingRequests = requestRows.filter(
    (request) =>
      request.type === type &&
      ['pending', 'under_review', 'processing'].includes(request.status),
  )

  return {
    label,
    value: matchingRequests.length,
    amount: matchingRequests.reduce((total, request) => total + request.amount, 0),
  }
}

function buildVendorDocuments(vendor: Awaited<ReturnType<typeof selectAdminVendors>>[number]) {
  return [
    {
      id: `${vendor.id}-cac`,
      name: 'CAC certificate',
      status: vendor.isVerified ? 'verified' : 'pending',
    },
    {
      id: `${vendor.id}-food-handler`,
      name: 'Food handler certificate',
      status: vendor.isVerified ? 'verified' : 'pending',
    },
    {
      id: `${vendor.id}-tax`,
      name: 'Tax certificate',
      status: vendor.isVerified ? 'verified' : 'pending',
    },
  ]
}

export function chooseRestaurantManager(
  members: (typeof restaurantMembers.$inferSelect)[],
) {
  return (
    members.find((member) => member.status === 'active' && member.membershipRole === 'owner') ??
    members.find((member) => member.status === 'active' && member.membershipRole === 'manager') ??
    members[0] ??
    null
  )
}

function mapVendorStatus(status: (typeof restaurants.$inferSelect)['status']) {
  if (status === 'active') return 'active'
  if (status === 'paused') return 'suspended'
  if (status === 'archived') return 'inactive'
  return 'pending approval'
}

function mapLedgerStatus(status: (typeof orders.$inferSelect)['status']) {
  if (status === 'delivered') return 'settled'
  if (status === 'cancelled' || status === 'refunded') return 'failed'
  if (status === 'admin_review' || status === 'restaurant_rejected') return 'held'
  return 'pending'
}

function mapPayoutLedgerStatus(status: (typeof payoutRequests.$inferSelect)['status']) {
  if (status === 'approved' || status === 'paid') return 'settled'
  if (status === 'rejected' || status === 'cancelled') return 'failed'
  if (status === 'under_review' || status === 'processing') return 'held'
  return 'pending'
}

function mapFinancialTransactionStatus(
  paymentStatus: (typeof payments.$inferSelect)['status'] | undefined,
  orderStatus: (typeof orders.$inferSelect)['status'],
) {
  if (paymentStatus === 'refunded' || orderStatus === 'refunded') return 'refunded'
  if (paymentStatus === 'failed' || paymentStatus === 'cancelled' || orderStatus === 'cancelled') {
    return 'failed'
  }
  if (paymentStatus === 'verified') return 'successful'
  if (paymentStatus === 'submitted') return 'processing'
  return 'pending'
}

function formatPaymentMethod(method: (typeof payments.$inferSelect)['method'] | null) {
  if (!method) return 'Not recorded'
  if (method === 'bank_transfer') return 'Bank transfer'
  return method.toUpperCase()
}

function mapAdminSalesAgentStatus(
  status: (typeof salesAgentProfiles.$inferSelect)['status'],
  tier: string,
  userStatus: (typeof users.$inferSelect)['status'],
) {
  if (userStatus === 'suspended' || userStatus === 'disabled' || status === 'suspended') {
    return 'suspended'
  }
  if (status === 'pending') return 'pending'
  if (tier === 'influencer') return 'influencer'
  return 'active'
}

function mapRiderStatus(
  userStatus: (typeof users.$inferSelect)['status'],
  availabilityStatus: (typeof riderProfiles.$inferSelect)['availabilityStatus'],
) {
  if (userStatus === 'suspended' || userStatus === 'disabled') return 'suspended'
  if (availabilityStatus === 'busy') return 'on delivery'
  if (availabilityStatus === 'available') return 'active'
  return 'offline'
}

function mapRiderAvailability(
  availabilityStatus: (typeof riderProfiles.$inferSelect)['availabilityStatus'],
) {
  if (availabilityStatus === 'available') return 'Online'
  if (availabilityStatus === 'busy') return 'Busy'
  return 'Offline'
}

function parseVehicleType(vehicleType: 'Motorcycle' | 'Bicycle' | 'Car') {
  if (vehicleType === 'Bicycle') return 'bicycle'
  if (vehicleType === 'Car') return 'car'
  return 'motorcycle'
}

function formatVehicleType(vehicleType: 'motorcycle' | 'bicycle' | 'car') {
  if (vehicleType === 'bicycle') return 'Bicycle'
  if (vehicleType === 'car') return 'Car'
  return 'Motorcycle'
}

function formatRiderLastSeen(
  lastSeenAt: Date | null,
  availabilityStatus: (typeof riderProfiles.$inferSelect)['availabilityStatus'],
) {
  if (availabilityStatus !== 'offline') return 'Now'
  if (!lastSeenAt) return 'Offline'
  return lastSeenAt.toISOString()
}

function buildRiderDocuments(
  riderId: string,
  documents: (typeof riderDocuments.$inferSelect)[],
) {
  const documentByType = new Map(documents.map((document) => [document.type, document]))
  const requiredDocuments = [
    { type: 'government_id' as const, name: 'Government ID' },
    { type: 'vehicle_license' as const, name: 'Vehicle license' },
    { type: 'proof_of_address' as const, name: 'Proof of address' },
  ]

  return requiredDocuments.map((document) => {
    const savedDocument = documentByType.get(document.type)

    return {
      id: savedDocument?.id ?? `${riderId}-${document.type}`,
      type: document.type,
      name: savedDocument?.name ?? document.name,
      fileUrl: savedDocument?.fileUrl ?? null,
      status: savedDocument?.status ?? 'pending',
      uploadedAt: savedDocument?.uploadedAt ?? null,
      reviewedAt: savedDocument?.reviewedAt ?? null,
    }
  })
}

function formatRestaurantLocation(
  streetAddress: string,
  serviceArea: (typeof serviceAreas.$inferSelect) | undefined,
) {
  if (!serviceArea) return streetAddress
  return `${streetAddress}, ${serviceArea.name}`
}

function averageRating(ratings: number[]) {
  if (!ratings.length) return null
  return Number((sum(ratings) / ratings.length).toFixed(1))
}

function calculateCommissionAmount(amount: number, commissionRateBps: number) {
  return Math.round(amount * (commissionRateBps / 10000))
}

function groupBy<T, TKey extends string>(
  rows: T[],
  getKey: (row: T) => TKey,
) {
  const grouped = new Map<TKey, T[]>()

  for (const row of rows) {
    const key = getKey(row)
    grouped.set(key, [...(grouped.get(key) ?? []), row])
  }

  return grouped
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function initialsFromName(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'NA'
  )
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount)
}

async function selectAdminOrders(limit: number, orderId?: string) {
  const baseRows = await database
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      subtotalAmount: orders.subtotalAmount,
      deliveryFeeAmount: orders.deliveryFeeAmount,
      serviceChargeAmount: orders.serviceChargeAmount,
      discountAmount: orders.discountAmount,
      totalAmount: orders.totalAmount,
      currency: orders.currency,
      deliveryPhone: orders.deliveryPhone,
      deliveryStreetAddress: orders.deliveryStreetAddress,
      deliveryServiceArea: orders.deliveryServiceArea,
      customerId: orders.customerId,
      restaurantId: orders.restaurantId,
      restaurantName: restaurants.name,
      restaurantPhone: restaurants.phone,
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
      subtotalAmount: order.subtotalAmount,
      deliveryFeeAmount: order.deliveryFeeAmount,
      serviceChargeAmount: order.serviceChargeAmount,
      discountAmount: order.discountAmount,
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
        phone: order.restaurantPhone,
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

async function selectAdminOrderTimeline(orderId: string) {
  const eventRows = await database
    .select({
      id: orderStatusEvents.id,
      status: orderStatusEvents.status,
      note: orderStatusEvents.note,
      createdAt: orderStatusEvents.createdAt,
    })
    .from(orderStatusEvents)
    .where(eq(orderStatusEvents.orderId, orderId))
    .orderBy(desc(orderStatusEvents.createdAt))

  return eventRows.map((event) => ({
    id: event.id,
    status: event.status,
    note: event.note,
    createdAt: event.createdAt,
  }))
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

function isUniqueViolation(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  )
}

function isForeignKeyViolation(error: unknown) {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code?: string }).code
      : typeof error === 'object' && error !== null && 'cause' in error
        ? (error as { cause?: { code?: string } }).cause?.code
        : undefined

  return (
    code === '23503' ||
    (error instanceof Error && error.message.includes('violates foreign key constraint'))
  )
}

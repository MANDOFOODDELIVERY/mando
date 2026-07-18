import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { getCurrentSessionContext } from '../auth/current-session.js'
import { serializeClearSessionCookie } from '../auth/index.js'
import { database } from '../db/client.js'
import {
  notifications,
  orderStatusEvents,
  orders,
  payments,
  profiles,
  restaurantMembers,
  users,
} from '../db/schema.js'
import { getRoutePayConfig } from '../config/routepay.js'
import { buildWebUrl } from '../config/web-url.js'
import { createRoutePayHostedPayment } from '../payments/routepay.js'

const initiateBodySchema = z.object({
  orderId: z.uuid(),
})

const orderParamsSchema = z.object({
  orderId: z.uuid(),
})

const routePayWebhookBodySchema = z.record(z.string(), z.unknown())

export async function routePayRoutes(app: FastifyInstance) {
  app.post('/payments/checkout/initiate', initiateHostedCheckout)
  app.post('/payments/routepay/initiate', initiateHostedCheckout)
  app.post('/payments/checkout/:orderId/verify', verifyCheckoutManually)
  app.post('/payments/routepay/webhook', handleRoutePayWebhook)
}

async function initiateHostedCheckout(
  request: FastifyRequest,
  reply: FastifyReply,
) {
    const sessionContext = await getCurrentSessionContext(request.headers.cookie)

    if (!sessionContext) {
      return sendUnauthenticated(reply)
    }

    const parsedBody = initiateBodySchema.safeParse(request.body)

    if (!parsedBody.success) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Please choose a valid order to pay for.',
      })
    }

    try {
      const order = await getPendingCustomerOrder(
        sessionContext.userId,
        parsedBody.data.orderId,
      )

      if (!order) {
        return reply.status(404).send({
          error: 'order_not_found',
          message: 'Order not found or is not awaiting payment.',
        })
      }

      if (!order.customerPhone) {
        return reply.status(409).send({
          error: 'missing_phone_number',
          message: 'Please add your phone number before starting payment.',
        })
      }

      const merchantReference = `MANDO-${order.orderNumber}-${Date.now()}`
      const routePayConfig = getRoutePayConfig()
      const callbackUrl = buildWebUrl(
        `/customer/cart/payment-processing?orderId=${order.id}&orderNumber=${order.orderNumber}`,
      )

      const hostedPayment = await createRoutePayHostedPayment({
        amount: Math.round(order.paymentAmount ?? order.totalAmount),
        currency: order.currency,
        merchantId: routePayConfig.clientId,
        merchantReference,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        description: `MANDO order ${order.orderNumber}`,
        callbackUrl,
      })

      await database.transaction(async (tx) => {
        await tx
          .update(payments)
          .set({
            method: 'card',
            provider: 'routepay',
            providerReference: hostedPayment.transactionReference,
            customerReference: hostedPayment.merchantReference,
            status: 'submitted',
            updatedAt: new Date(),
          })
          .where(eq(payments.orderId, order.id))

      await tx.insert(orderStatusEvents).values({
        orderId: order.id,
        status: 'pending_payment',
        actorUserId: sessionContext.userId,
          note: 'Payment processing.',
      })
      })

      return reply.status(200).send({
        payment: {
          provider: 'routepay',
          redirectUrl: hostedPayment.redirectUrl,
          transactionReference: hostedPayment.transactionReference,
          merchantReference: hostedPayment.merchantReference,
        },
      })
    } catch (error) {
      request.log.error(error)

      return reply.status(502).send({
        error: 'routepay_initiation_failed',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to start payment.',
      })
    }
}

async function verifyCheckoutManually(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const sessionContext = await getCurrentSessionContext(request.headers.cookie)

  if (!sessionContext) {
    return sendUnauthenticated(reply)
  }

  const parsedParams = orderParamsSchema.safeParse(request.params)

  if (!parsedParams.success) {
    return reply.status(400).send({
      error: 'validation_error',
      message: 'Please choose a valid order to verify.',
    })
  }

  const [order] = await database
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerId: orders.customerId,
      restaurantId: orders.restaurantId,
      status: orders.status,
    })
    .from(orders)
    .where(
      and(
        eq(orders.id, parsedParams.data.orderId),
        eq(orders.customerId, sessionContext.userId),
      ),
    )
    .limit(1)

  if (!order) {
    return reply.status(404).send({
      error: 'order_not_found',
      message: 'Order not found.',
    })
  }

  if (order.status !== 'pending_payment') {
    return reply.status(409).send({
      error: 'order_not_pending_payment',
      message: 'This order is not awaiting payment verification.',
    })
  }

  await finalizePaidOrder(order, {
    actorUserId: sessionContext.userId,
    note: 'Payment confirmed.',
  })

  return reply.status(200).send({
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: 'awaiting_restaurant',
    },
  })
}

async function handleRoutePayWebhook(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!isAuthorizedRoutePayWebhook(request)) {
    return reply.status(401).send({
      error: 'unauthorized_webhook',
      message: 'Webhook authentication failed.',
    })
  }

  const parsedBody = routePayWebhookBodySchema.safeParse(request.body)

  if (!parsedBody.success) {
    return reply.status(400).send({
      error: 'validation_error',
      message: 'Invalid webhook payload.',
    })
  }

  const payload = parsedBody.data
  const merchantReference = getPayloadString(payload, [
    'merchantReference',
    'MerchantReference',
    'merchant_reference',
    'reference',
  ])
  const transactionReference = getPayloadString(payload, [
    'transactionReference',
    'TransactionReference',
    'transaction_reference',
    'paymentReference',
    'PaymentReference',
  ])
  const status = getPayloadString(payload, [
    'status',
    'Status',
    'paymentStatus',
    'PaymentStatus',
    'responseCode',
    'ResponseCode',
  ])

  if (!merchantReference && !transactionReference) {
    request.log.warn({ payload }, 'RoutePay webhook missing payment reference')
    return reply.status(202).send({ received: true, matched: false })
  }

  const payment = await findRoutePayPayment({
    merchantReference,
    transactionReference,
  })

  if (!payment) {
    request.log.warn(
      { merchantReference, transactionReference, payload },
      'RoutePay webhook payment not found',
    )
    return reply.status(202).send({ received: true, matched: false })
  }

  const success = isSuccessfulRoutePayStatus(status)
  const failed = isFailedRoutePayStatus(status)

  if (success) {
    await finalizePaidOrder(payment, {
      note: 'Payment confirmed.',
    })
  } else if (failed && payment.paymentStatus !== 'verified') {
    const now = new Date()
    await database
      .update(payments)
      .set({
        status: 'failed',
        updatedAt: now,
      })
      .where(eq(payments.id, payment.paymentId))
  }

  return reply.status(200).send({
    received: true,
    matched: true,
    status: success ? 'verified' : failed ? 'failed' : 'ignored',
  })
}

async function getPendingCustomerOrder(customerId: string, orderId: string) {
  const [order] = await database
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerId: orders.customerId,
      status: orders.status,
      totalAmount: orders.totalAmount,
      paymentAmount: payments.amount,
      currency: orders.currency,
      customerName: profiles.fullName,
      customerPhone: profiles.phone,
      customerEmail: users.email,
    })
    .from(orders)
    .innerJoin(users, eq(orders.customerId, users.id))
    .innerJoin(profiles, eq(orders.customerId, profiles.userId))
    .leftJoin(payments, eq(orders.id, payments.orderId))
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.customerId, customerId),
        eq(orders.status, 'pending_payment'),
      ),
    )
    .limit(1)

  return order ?? null
}

type PayableOrder = {
  id: string
  orderNumber: string
  customerId: string
  restaurantId: string
  status: (typeof orders.$inferSelect)['status']
}

async function findRoutePayPayment(input: {
  merchantReference: string | null
  transactionReference: string | null
}) {
  const whereClause = input.transactionReference
    ? eq(payments.providerReference, input.transactionReference)
    : input.merchantReference
      ? eq(payments.customerReference, input.merchantReference)
      : undefined

  if (!whereClause) return null

  const [payment] = await database
    .select({
      paymentId: payments.id,
      paymentStatus: payments.status,
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerId: orders.customerId,
      restaurantId: orders.restaurantId,
      status: orders.status,
    })
    .from(payments)
    .innerJoin(orders, eq(payments.orderId, orders.id))
    .where(whereClause)
    .limit(1)

  return payment ?? null
}

async function finalizePaidOrder(
  order: PayableOrder,
  options: { actorUserId?: string; note: string },
) {
  if (order.status !== 'pending_payment') return

  const now = new Date()

  await database.transaction(async (tx) => {
    await tx
      .update(payments)
      .set({
        status: 'verified',
        paidAt: now,
        verifiedAt: now,
        updatedAt: now,
      })
      .where(eq(payments.orderId, order.id))

    await tx
      .update(orders)
      .set({
        status: 'awaiting_restaurant',
        updatedAt: now,
      })
      .where(eq(orders.id, order.id))

    await tx.insert(orderStatusEvents).values({
      orderId: order.id,
      status: 'awaiting_restaurant',
      actorUserId: options.actorUserId,
      note: options.note,
    })

    await tx.insert(notifications).values({
      userId: order.customerId,
      type: 'payment_verified',
      title: 'Payment verified',
      body: `Payment for order ${order.orderNumber} has been verified.`,
      data: { orderId: order.id, orderNumber: order.orderNumber },
    })

    const restaurantUsers = await tx
      .select({ userId: restaurantMembers.userId })
      .from(restaurantMembers)
      .where(
        and(
          eq(restaurantMembers.restaurantId, order.restaurantId),
          eq(restaurantMembers.status, 'active'),
        ),
      )

    if (restaurantUsers.length > 0) {
      await tx.insert(notifications).values(
        restaurantUsers.map((member) => ({
          userId: member.userId,
          type: 'restaurant_new_order',
          title: 'New order awaiting decision',
          body: `Order ${order.orderNumber} is ready for restaurant review.`,
          data: { orderId: order.id, orderNumber: order.orderNumber },
        })),
      )
    }
  })
}

function isAuthorizedRoutePayWebhook(request: FastifyRequest) {
  const config = getRoutePayConfig()

  if (!config.webhookUsername && !config.webhookPassword) return true

  const authorization = request.headers.authorization
  if (!authorization?.startsWith('Basic ')) return false

  const decoded = Buffer.from(authorization.slice('Basic '.length), 'base64')
    .toString('utf8')
  const [username, password] = decoded.split(':')

  return (
    username === config.webhookUsername &&
    password === config.webhookPassword
  )
}

function getPayloadString(
  payload: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = payload[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number') return String(value)
  }

  for (const value of Object.values(payload)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue

    const nestedValue: string | null = getPayloadString(
      value as Record<string, unknown>,
      keys,
    )
    if (nestedValue) return nestedValue
  }

  return null
}

function isSuccessfulRoutePayStatus(status: string | null) {
  if (!status) return false
  const normalized = status.toLowerCase()

  return ['00', 'success', 'successful', 'paid', 'completed', 'verified'].includes(
    normalized,
  )
}

function isFailedRoutePayStatus(status: string | null) {
  if (!status) return false
  const normalized = status.toLowerCase()

  return ['failed', 'failure', 'cancelled', 'canceled', 'declined', '99'].includes(
    normalized,
  )
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

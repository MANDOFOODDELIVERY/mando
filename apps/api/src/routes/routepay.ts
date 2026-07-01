import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { getCurrentSessionContext } from '../auth/current-session.js'
import { serializeClearSessionCookie } from '../auth/index.js'
import { database } from '../db/client.js'
import {
  orderStatusEvents,
  orders,
  payments,
  profiles,
  users,
} from '../db/schema.js'
import { getRoutePayConfig } from '../config/routepay.js'
import { createRoutePayHostedPayment } from '../payments/routepay.js'

const initiateBodySchema = z.object({
  orderId: z.uuid(),
})

export async function routePayRoutes(app: FastifyInstance) {
  app.post('/payments/checkout/initiate', initiateHostedCheckout)
  app.post('/payments/routepay/initiate', initiateHostedCheckout)
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
        amount: order.totalAmount,
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
          note: 'RoutePay hosted payment initiated.',
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
            : 'Unable to start RoutePay payment.',
      })
    }
}

async function getPendingCustomerOrder(customerId: string, orderId: string) {
  const [order] = await database
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerId: orders.customerId,
      status: orders.status,
      totalAmount: orders.totalAmount,
      currency: orders.currency,
      customerName: profiles.fullName,
      customerPhone: profiles.phone,
      customerEmail: users.email,
    })
    .from(orders)
    .innerJoin(users, eq(orders.customerId, users.id))
    .innerJoin(profiles, eq(orders.customerId, profiles.userId))
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

function buildWebUrl(path: string) {
  const origin = process.env.WEB_ORIGIN?.split(',')[0] ?? 'http://localhost:3000'
  return `${origin}${path}`
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

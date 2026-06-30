import { getRoutePayConfig } from '../config/routepay.js'

type RoutePayTokenResponse = {
  access_token?: string
  accessToken?: string
  token_type?: string
  expires_in?: number
}

type RoutePayHostedPaymentRequest = {
  amount: number
  currency: string
  merchantId: string
  merchantReference: string
  customerName: string
  customerEmail: string
  customerPhone: string
  description: string
  callbackUrl: string
}

type RoutePayHostedPaymentResponse = {
  redirectUrl?: string
  RedirectUrl?: string
  transactionReference?: string
  TransactionReference?: string
  merchantReference?: string
  MerchantReference?: string
  responseCode?: string
  ResponseCode?: string
  responseMessage?: string
  ResponseMessage?: string
  message?: string
  error?: string
  error_description?: string
}

export type HostedPaymentResult = {
  redirectUrl: string
  transactionReference: string | null
  merchantReference: string
  raw: RoutePayHostedPaymentResponse
}

export async function createRoutePayHostedPayment(
  request: RoutePayHostedPaymentRequest,
): Promise<HostedPaymentResult> {
  const config = getRoutePayConfig()
  const accessToken = await getRoutePayAccessToken()
  const routePayPayload = {
    merchantId: request.merchantId,
    returnUrl: request.callbackUrl,
    merchantReference: request.merchantReference,
    totalAmount: String(request.amount),
    currency: request.currency,
    paymentType: 'PAYMENT',
    customer: {
      email: request.customerEmail,
      mobile: request.customerPhone,
      firstname: getFirstName(request.customerName),
      lastname: getLastName(request.customerName),
      username: request.customerEmail,
    },
    products: [
      {
        name: request.description,
        unitPrice: String(request.amount),
        quantity: 1,
      },
    ],
  }

  logRoutePayDebug('SetRequest payload', {
    url: `${config.apiBaseUrl.replace(/\/$/, '')}/payment/api/v1/Payment/SetRequest`,
    payload: routePayPayload,
  })

  const response = await fetch(
    `${config.apiBaseUrl.replace(/\/$/, '')}/payment/api/v1/Payment/SetRequest`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(routePayPayload),
    },
  )

  const responseText = await response.text()
  const responseBody = parseJson<RoutePayHostedPaymentResponse>(responseText)

  logRoutePayDebug('SetRequest response', {
    status: response.status,
    ok: response.ok,
    body: responseBody ?? responseText,
  })

  if (!response.ok || !responseBody) {
    throw new Error(
      responseBody?.message ??
        responseBody?.responseMessage ??
        responseBody?.ResponseMessage ??
        responseBody?.error_description ??
        responseBody?.error ??
        `RoutePay payment request failed with HTTP ${response.status}. ${responseText.slice(0, 180)}`,
    )
  }

  const redirectUrl = responseBody.redirectUrl ?? responseBody.RedirectUrl

  if (!redirectUrl) {
    throw new Error('RoutePay did not return a hosted payment URL.')
  }

  return {
    redirectUrl,
    transactionReference:
      responseBody.transactionReference ??
      responseBody.TransactionReference ??
      null,
    merchantReference:
      responseBody.merchantReference ??
      responseBody.MerchantReference ??
      request.merchantReference,
    raw: responseBody,
  }
}

function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || 'Customer'
}

function getLastName(fullName: string) {
  const parts = fullName.trim().split(/\s+/)
  return parts.length > 1 ? parts.slice(1).join(' ') : 'MANDO'
}

async function getRoutePayAccessToken() {
  const config = getRoutePayConfig()
  logRoutePayDebug('Token request', {
    url: config.authUrl,
    clientId: config.clientId,
  })

  const response = await fetch(config.authUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  })

  const responseText = await response.text()
  const responseBody = parseJson<RoutePayTokenResponse>(responseText)

  logRoutePayDebug('Token response', {
    status: response.status,
    ok: response.ok,
    body: responseBody
      ? {
          ...responseBody,
          access_token: responseBody.access_token ? '[redacted]' : undefined,
          accessToken: responseBody.accessToken ? '[redacted]' : undefined,
        }
      : responseText,
  })

  const accessToken = responseBody?.access_token ?? responseBody?.accessToken

  if (!response.ok || !accessToken) {
    throw new Error(
      `Unable to authenticate with RoutePay. HTTP ${response.status}. ${responseText.slice(0, 180)}`,
    )
  }

  return accessToken
}

function logRoutePayDebug(label: string, data: unknown) {
  if (process.env.ROUTEPAY_DEBUG !== 'true') return

  console.log(`[RoutePay] ${label}:`)
  console.dir(data, { depth: null })
}

function parseJson<T>(value: string) {
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

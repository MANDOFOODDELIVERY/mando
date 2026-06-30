export type RoutePayConfig = {
  clientId: string
  clientSecret: string
  apiBaseUrl: string
  authUrl: string
  environment: string
}

export function getRoutePayConfig(): RoutePayConfig {
  const clientId = process.env.ROUTEPAY_CLIENT_ID
  const clientSecret = process.env.ROUTEPAY_CLIENT_SECRET

  if (!clientId) {
    throw new Error('ROUTEPAY_CLIENT_ID is missing. Add it to apps/api/.env.')
  }

  if (!clientSecret) {
    throw new Error(
      'ROUTEPAY_CLIENT_SECRET is missing. Add it to apps/api/.env.',
    )
  }

  return {
    clientId,
    clientSecret,
    apiBaseUrl:
      process.env.ROUTEPAY_API_BASE_URL ?? 'https://apidev.routepay.com',
    authUrl:
      process.env.ROUTEPAY_AUTH_URL ??
      'https://authdev.routepay.com/connect/token',
    environment: process.env.ROUTEPAY_ENV ?? 'sandbox',
  }
}

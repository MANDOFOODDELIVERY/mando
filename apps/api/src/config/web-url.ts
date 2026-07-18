export function buildWebUrl(path: string): string {
  // 1. Explicit WEB_ORIGIN environment variable
  const webOrigin = process.env.WEB_ORIGIN?.split(',')[0]?.trim()
  if (webOrigin) return `${webOrigin}${path}`

  // 2. Vercel environment (automatically set by Vercel at runtime)
  const vercelUrl = process.env.VERCEL_URL ?? process.env.VERCEL_BRANCH_URL
  if (vercelUrl) return `https://${vercelUrl}${path}`

  // 3. Fallback for local development
  return `http://localhost:3000${path}`
}
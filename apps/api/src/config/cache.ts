export function addNoCacheHeaders(reply: { header: (key: string, value: string) => void }) {
  reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  reply.header('Pragma', 'no-cache')
  reply.header('Expires', '0')
  reply.header('Surrogate-Control', 'no-store')
}
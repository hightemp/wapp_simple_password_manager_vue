// Schemes that run code instead of opening a page
const UNSAFE_SCHEMES = /^(javascript|data|vbscript):/i
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i
// Hosts that only make sense on a local network (never sent to the icon service)
const LOCAL_HOST = /(^localhost$)|\.(local|lan|internal|home\.arpa|localhost)$/i
const IP_ADDRESS = /^(\d{1,3}(\.\d{1,3}){3}|\[[0-9a-f:.]+\])$/i

/** A URL for a link: "example.com" becomes "https://example.com"; unsafe schemes give '' */
export function openableUrl(url: string): string {
  const text = url.trim()
  if (!text || UNSAFE_SCHEMES.test(text)) return ''
  return HAS_SCHEME.test(text) ? text : `https://${text}`
}

/** Public domain of a web address, for its icon; null for local hosts, IP addresses and non-web URLs */
export function siteDomain(url: string): string | null {
  const href = openableUrl(url)
  if (!href) return null
  let parsed: URL
  try {
    parsed = new URL(href)
  } catch (_) {
    return null
  }
  const host = parsed.hostname.toLowerCase()
  if (!/^https?:$/.test(parsed.protocol) || !host.includes('.') || LOCAL_HOST.test(host) || IP_ADDRESS.test(host)) return null
  return host
}

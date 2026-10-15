// Have I Been Pwned "Pwned Passwords": only the first 5 characters of the SHA-1 hash leave
// the browser (k-anonymity); the rest is compared here
const RANGE_URL = 'https://api.pwnedpasswords.com/range/'
// Requests at the same time
const CONCURRENCY = 4

export async function sha1Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()
}

/** Hash suffixes of a range response → how often each was seen (padding lines have count 0) */
export function parseRange(text: string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const line of text.split('\n')) {
    const [suffix, count] = line.trim().split(':')
    if (suffix && Number(count) > 0) counts.set(suffix.toUpperCase(), Number(count))
  }
  return counts
}

async function fetchRange(prefix: string, signal?: AbortSignal): Promise<Map<string, number>> {
  let response: Response
  try {
    // Padding hides the real number of matches from anyone watching the traffic
    response = await fetch(RANGE_URL + prefix, { headers: { 'Add-Padding': 'true' }, signal })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error('Could not reach the breach check service. Check the internet connection.', { cause: error })
  }
  if (!response.ok) throw new Error(`The breach check service answered with an error (${response.status})`)
  return parseRange(await response.text())
}

/**
 * How many times each password was seen in known data breaches (0 = not found).
 * One request per distinct hash prefix; `onProgress` gets the number of finished requests.
 */
export async function checkPasswords(
  passwords: string[],
  { signal, onProgress }: { signal?: AbortSignal; onProgress?: (done: number, total: number) => void } = {},
): Promise<Map<string, number>> {
  const unique = [...new Set(passwords.filter(Boolean))]
  const hashes = new Map(await Promise.all(unique.map(async (password) => [password, await sha1Hex(password)] as const)))
  const prefixes = [...new Set([...hashes.values()].map((hash) => hash.slice(0, 5)))]
  const ranges = new Map<string, Map<string, number>>()

  let next = 0
  let done = 0
  onProgress?.(0, prefixes.length)
  async function worker() {
    while (next < prefixes.length) {
      const prefix = prefixes[next++]
      ranges.set(prefix, await fetchRange(prefix, signal))
      onProgress?.(++done, prefixes.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, prefixes.length) }, worker))

  const result = new Map<string, number>()
  for (const [password, hash] of hashes) {
    result.set(password, ranges.get(hash.slice(0, 5))?.get(hash.slice(5)) ?? 0)
  }
  return result
}

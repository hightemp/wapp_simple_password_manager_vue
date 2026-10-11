/**
 * Database encryption with backward compatibility.
 *
 * v3 (current): AES-256-GCM + PBKDF2-SHA256 via the Web Crypto API. JSON envelope:
 *   { v: 3, kdf: 'PBKDF2-SHA256', iterations, salt: <base64>, iv: <base64>, data: <base64> }
 *   GCM authenticates the ciphertext, so a wrong password or a tampered file
 *   always fails with DecryptionError instead of producing garbage.
 *
 * v2 (legacy, read-only): AES-256-CBC + PBKDF2 via crypto-js, no integrity check:
 *   { v: 2, kdf?: 'sha256' | 'sha1', salt: <hex>, iv: <hex>, data: <crypto-js string> }
 *   crypto-js changed the PBKDF2 default from SHA1 to SHA256 in 4.2.0, so envelopes
 *   without `kdf` may use either — both are tried.
 *
 * v1 (legacy, read-only): raw 3DES ciphertext from CryptoJS.TripleDES.
 *
 * Writing always produces v3; v1/v2 files are migrated on the next save.
 */
import CryptoJS from 'crypto-js'
import DES from 'crypto-js/tripledes.js'

// OWASP recommendation for PBKDF2-HMAC-SHA256 (2023)
const V3_ITERATIONS = 600_000
const V3_SALT_BYTES = 16
const V3_IV_BYTES = 12 // standard GCM nonce size

const V2_ITERATIONS = 100_000
const V2_KEY_WORDS = 256 / 32

/** Wrong password, or the data is corrupted / was tampered with */
export class DecryptionError extends Error {
  constructor(message = 'Incorrect password or corrupted data') {
    super(message)
    this.name = 'DecryptionError'
  }
}

export interface V3Envelope {
  v: 3
  kdf: 'PBKDF2-SHA256'
  iterations: number
  salt: string
  iv: string
  data: string
}

export type V2Hash = 'sha256' | 'sha1'

export interface V2Envelope {
  v: 2
  kdf?: V2Hash
  salt: string
  iv: string
  data: string
}

export interface PasswordOptions {
  uppercase?: boolean
  lowercase?: boolean
  digits?: boolean
  symbols?: boolean
}

// ===============================================================
// Public API
// ===============================================================

/** Encrypt data (always v3 format) */
export function encrypt(data: string, password: string): Promise<string> {
  return encryptV3(data, password)
}

/**
 * Decrypt data in any supported format (v3, v2 or v1).
 * Throws DecryptionError when the password is wrong or the data is damaged.
 */
export async function decrypt(data: string, password: string): Promise<string> {
  const envelope = parseEnvelope(data)
  if (envelope?.v === 3) return decryptV3(envelope, password)

  let decrypted = ''
  try {
    decrypted = envelope?.v === 2 ? decryptV2(envelope, password) : decryptV1(data, password)
  } catch (_) {
    // crypto-js throws "Malformed UTF-8 data" for most wrong keys
  }
  if (!decrypted) throw new DecryptionError()
  return decrypted
}

function parseEnvelope(data: string): V3Envelope | V2Envelope | null {
  try {
    const parsed = JSON.parse(data)
    if (parsed?.v === 3 && parsed.data && parsed.salt && parsed.iv && parsed.iterations) return parsed
    if (parsed?.v === 2 && parsed.data && parsed.salt && parsed.iv) return parsed
  } catch (_) {
    // Not JSON — v1
  }
  return null
}

// ===============================================================
// v3 — AES-256-GCM via Web Crypto
// ===============================================================

function getSubtle(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is unavailable. Open the app over HTTPS (or localhost).')
  }
  return globalThis.crypto.subtle
}

async function deriveKeyV3(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const subtle = getSubtle()
  const baseKey = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptV3(data: string, password: string, iterations = V3_ITERATIONS): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(V3_SALT_BYTES))
  const iv = crypto.getRandomValues(new Uint8Array(V3_IV_BYTES))
  const key = await deriveKeyV3(password, salt, iterations)
  const ciphertext = await getSubtle().encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(data))

  return JSON.stringify({
    v: 3,
    kdf: 'PBKDF2-SHA256',
    iterations,
    salt: toBase64(salt),
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(ciphertext)),
  } satisfies V3Envelope)
}

export async function decryptV3(envelope: V3Envelope, password: string): Promise<string> {
  const key = await deriveKeyV3(password, fromBase64(envelope.salt), envelope.iterations)
  let plaintext: ArrayBuffer
  try {
    plaintext = await getSubtle().decrypt({ name: 'AES-GCM', iv: fromBase64(envelope.iv) }, key, fromBase64(envelope.data))
  } catch (_) {
    // GCM authentication tag mismatch
    throw new DecryptionError()
  }
  return new TextDecoder().decode(plaintext)
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

// ===============================================================
// v2 / v1 — legacy crypto-js formats (read-only in the app)
// ===============================================================

function deriveKeyV2(password: string, salt: CryptoJS.lib.WordArray, hash: V2Hash): CryptoJS.lib.WordArray {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: V2_KEY_WORDS,
    iterations: V2_ITERATIONS,
    hasher: hash === 'sha1' ? CryptoJS.algo.SHA1 : CryptoJS.algo.SHA256,
  })
}

/** Encrypt in the legacy v2 format — only used to produce test fixtures */
export function encryptV2(data: string, password: string, hash: V2Hash = 'sha256'): string {
  const salt = CryptoJS.lib.WordArray.random(16)
  const iv = CryptoJS.lib.WordArray.random(16)
  const encrypted = CryptoJS.AES.encrypt(data, deriveKeyV2(password, salt, hash), {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString()

  return JSON.stringify({
    v: 2,
    kdf: hash,
    salt: salt.toString(CryptoJS.enc.Hex),
    iv: iv.toString(CryptoJS.enc.Hex),
    data: encrypted,
  } satisfies V2Envelope)
}

function decryptV2WithHash(envelope: V2Envelope, password: string, hash: V2Hash): string {
  const salt = CryptoJS.enc.Hex.parse(envelope.salt)
  const iv = CryptoJS.enc.Hex.parse(envelope.iv)
  const decrypted = CryptoJS.AES.decrypt(envelope.data, deriveKeyV2(password, salt, hash), {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
  return decrypted.toString(CryptoJS.enc.Utf8)
}

/**
 * Decrypt v2 format. Envelopes without `kdf` are tried with SHA256 first,
 * then SHA1 (crypto-js < 4.2.0 default).
 */
export function decryptV2(envelope: V2Envelope, password: string): string {
  if (envelope.kdf) {
    return decryptV2WithHash(envelope, password, envelope.kdf)
  }
  try {
    const decrypted = decryptV2WithHash(envelope, password, 'sha256')
    if (decrypted) return decrypted
  } catch (_) {
    // Wrong key usually yields invalid UTF-8 — fall through to the legacy hasher
  }
  return decryptV2WithHash(envelope, password, 'sha1')
}

/** Decrypt v1 format (3DES, password used directly as key) */
export function decryptV1(data: string, password: string): string {
  return DES.decrypt(data, password).toString(CryptoJS.enc.Utf8)
}

// ===============================================================
// Password generator
// ===============================================================

/**
 * Generate a random password
 */
export function generatePassword(length: number = 16, options: PasswordOptions = {}): string {
  const {
    uppercase = true,
    lowercase = true,
    digits = true,
    symbols = true,
  } = options

  let chars = ''
  if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz'
  if (digits) chars += '0123456789'
  if (symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?'

  if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz0123456789'

  const randomValues = new Uint32Array(length)
  crypto.getRandomValues(randomValues)

  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length]
  }
  return result
}

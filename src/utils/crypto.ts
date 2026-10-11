/**
 * Crypto module with backward compatibility.
 *
 * OLD format (v1): 3DES encrypted string (raw ciphertext from CryptoJS.TripleDES)
 * NEW format (v2): JSON envelope { v: 2, data: <AES-encrypted-string>, salt: <hex>, iv: <hex> }
 *
 * Reading: tries to parse as v2 JSON first, falls back to 3DES for old files.
 * Writing: always uses AES with PBKDF2 key derivation (v2 format).
 */
import CryptoJS from 'crypto-js'
import DES from 'crypto-js/tripledes.js'

const PBKDF2_ITERATIONS = 100000
const PBKDF2_KEY_SIZE = 256 / 32  // 256-bit key
const SALT_SIZE = 128 / 8         // 128-bit salt
const IV_SIZE = 128 / 8           // 128-bit IV

export interface V2Envelope {
  v: 2
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

/**
 * Derive a key from password using PBKDF2
 */
export function deriveKey(password: string, salt: CryptoJS.lib.WordArray): CryptoJS.lib.WordArray {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: PBKDF2_KEY_SIZE,
    iterations: PBKDF2_ITERATIONS,
  })
}

/**
 * Encrypt data with AES + PBKDF2 (v2 format)
 */
export function encryptV2(data: string, password: string): string {
  const salt = CryptoJS.lib.WordArray.random(SALT_SIZE)
  const iv = CryptoJS.lib.WordArray.random(IV_SIZE)
  const key = deriveKey(password, salt)
  const encrypted = CryptoJS.AES.encrypt(data, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString()

  return JSON.stringify({
    v: 2,
    salt: salt.toString(CryptoJS.enc.Hex),
    iv: iv.toString(CryptoJS.enc.Hex),
    data: encrypted,
  } satisfies V2Envelope)
}

/**
 * Decrypt v2 format (AES + PBKDF2)
 */
export function decryptV2(envelope: V2Envelope, password: string): string {
  const salt = CryptoJS.enc.Hex.parse(envelope.salt)
  const iv = CryptoJS.enc.Hex.parse(envelope.iv)
  const key = deriveKey(password, salt)
  const decrypted = CryptoJS.AES.decrypt(envelope.data, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
  return decrypted.toString(CryptoJS.enc.Utf8)
}

/**
 * Decrypt v1 format (legacy 3DES, password used directly as key)
 */
export function decryptV1(data: string, password: string): string {
  return DES.decrypt(data, password).toString(CryptoJS.enc.Utf8)
}

/**
 * Decrypt data with automatic version detection.
 * Tries v2 (AES+PBKDF2) first, falls back to v1 (3DES) for backward compatibility.
 */
export function decrypt(data: string, password: string): string {
  try {
    const parsed = JSON.parse(data)
    if (parsed && parsed.v === 2 && parsed.data && parsed.salt && parsed.iv) {
      return decryptV2(parsed as V2Envelope, password)
    }
  } catch (_) {
    // Not JSON — fall through to v1
  }

  return decryptV1(data, password)
}

/**
 * Encrypt data (always v2 format)
 */
export function encrypt(data: string, password: string): string {
  return encryptV2(data, password)
}

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

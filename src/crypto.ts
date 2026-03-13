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
export function fnDeriveKey(sPassword: string, oSalt: CryptoJS.lib.WordArray): CryptoJS.lib.WordArray {
  return CryptoJS.PBKDF2(sPassword, oSalt, {
    keySize: PBKDF2_KEY_SIZE,
    iterations: PBKDF2_ITERATIONS,
  })
}

/**
 * Encrypt data with AES + PBKDF2 (v2 format)
 */
export function fnEncryptV2(sData: string, sPassword: string): string {
  const oSalt = CryptoJS.lib.WordArray.random(SALT_SIZE)
  const oIV = CryptoJS.lib.WordArray.random(IV_SIZE)
  const oKey = fnDeriveKey(sPassword, oSalt)
  const sEncrypted = CryptoJS.AES.encrypt(sData, oKey, {
    iv: oIV,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString()

  return JSON.stringify({
    v: 2,
    salt: oSalt.toString(CryptoJS.enc.Hex),
    iv: oIV.toString(CryptoJS.enc.Hex),
    data: sEncrypted,
  } satisfies V2Envelope)
}

/**
 * Decrypt v2 format (AES + PBKDF2)
 */
export function fnDecryptV2(oEnvelope: V2Envelope, sPassword: string): string {
  const oSalt = CryptoJS.enc.Hex.parse(oEnvelope.salt)
  const oIV = CryptoJS.enc.Hex.parse(oEnvelope.iv)
  const oKey = fnDeriveKey(sPassword, oSalt)
  const oDecrypted = CryptoJS.AES.decrypt(oEnvelope.data, oKey, {
    iv: oIV,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
  return oDecrypted.toString(CryptoJS.enc.Utf8)
}

/**
 * Decrypt v1 format (legacy 3DES, password used directly as key)
 */
export function fnDecryptV1(sData: string, sPassword: string): string {
  return DES.decrypt(sData, sPassword).toString(CryptoJS.enc.Utf8)
}

/**
 * Decrypt data with automatic version detection.
 * Tries v2 (AES+PBKDF2) first, falls back to v1 (3DES) for backward compatibility.
 */
export function fnDecrypt(sData: string, sPassword: string): string {
  try {
    const oParsed = JSON.parse(sData)
    if (oParsed && oParsed.v === 2 && oParsed.data && oParsed.salt && oParsed.iv) {
      return fnDecryptV2(oParsed as V2Envelope, sPassword)
    }
  } catch (_) {
    // Not JSON — fall through to v1
  }

  return fnDecryptV1(sData, sPassword)
}

/**
 * Encrypt data (always v2 format)
 */
export function fnEncrypt(sData: string, sPassword: string): string {
  return fnEncryptV2(sData, sPassword)
}

/**
 * Generate a random password
 */
export function fnGeneratePassword(iLength: number = 16, oOptions: PasswordOptions = {}): string {
  const {
    uppercase = true,
    lowercase = true,
    digits = true,
    symbols = true,
  } = oOptions

  let sChars = ''
  if (uppercase) sChars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (lowercase) sChars += 'abcdefghijklmnopqrstuvwxyz'
  if (digits) sChars += '0123456789'
  if (symbols) sChars += '!@#$%^&*()_+-=[]{}|;:,.<>?'

  if (!sChars) sChars = 'abcdefghijklmnopqrstuvwxyz0123456789'

  const aRandom = new Uint32Array(iLength)
  crypto.getRandomValues(aRandom)

  let sResult = ''
  for (let i = 0; i < iLength; i++) {
    sResult += sChars[aRandom[i] % sChars.length]
  }
  return sResult
}

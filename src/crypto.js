/**
 * Crypto module with backward compatibility.
 * 
 * OLD format (v1): 3DES encrypted string (raw ciphertext from CryptoJS.TripleDES)
 * NEW format (v2): JSON envelope { v: 2, data: <AES-encrypted-string>, salt: <hex> }
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

/**
 * Derive a key from password using PBKDF2
 * @param {string} sPassword 
 * @param {CryptoJS.lib.WordArray} oSalt 
 * @returns {CryptoJS.lib.WordArray}
 */
export function fnDeriveKey(sPassword, oSalt) {
  return CryptoJS.PBKDF2(sPassword, oSalt, {
    keySize: PBKDF2_KEY_SIZE,
    iterations: PBKDF2_ITERATIONS,
  })
}

/**
 * Encrypt data with AES + PBKDF2 (v2 format)
 * @param {string} sData - JSON string to encrypt
 * @param {string} sPassword - user password
 * @returns {string} - JSON string with v2 envelope
 */
export function fnEncryptV2(sData, sPassword) {
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
  })
}

/**
 * Decrypt v2 format (AES + PBKDF2)
 * @param {object} oEnvelope - parsed { v, salt, data }
 * @param {string} sPassword
 * @returns {string} - decrypted JSON string
 */
export function fnDecryptV2(oEnvelope, sPassword) {
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
 * @param {string} sData - raw 3DES ciphertext
 * @param {string} sPassword
 * @returns {string} - decrypted JSON string
 */
export function fnDecryptV1(sData, sPassword) {
  return DES.decrypt(sData, sPassword).toString(CryptoJS.enc.Utf8)
}

/**
 * Decrypt data with automatic version detection.
 * Tries v2 (AES+PBKDF2) first, falls back to v1 (3DES) for backward compatibility.
 * @param {string} sData - raw file content
 * @param {string} sPassword
 * @returns {string} - decrypted JSON string
 */
export function fnDecrypt(sData, sPassword) {
  // Try to parse as v2 JSON envelope
  try {
    const oParsed = JSON.parse(sData)
    if (oParsed && oParsed.v === 2 && oParsed.data && oParsed.salt && oParsed.iv) {
      return fnDecryptV2(oParsed, sPassword)
    }
  } catch (_) {
    // Not JSON — fall through to v1
  }

  // Fallback: v1 legacy 3DES
  return fnDecryptV1(sData, sPassword)
}

/**
 * Encrypt data (always v2 format)
 * @param {string} sData - JSON string
 * @param {string} sPassword
 * @returns {string} - encrypted string (v2 JSON envelope)
 */
export function fnEncrypt(sData, sPassword) {
  return fnEncryptV2(sData, sPassword)
}

/**
 * Generate a random password
 * @param {number} iLength - length of password (default 16)
 * @param {object} oOptions - { uppercase, lowercase, digits, symbols }
 * @returns {string}
 */
export function fnGeneratePassword(iLength = 16, oOptions = {}) {
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

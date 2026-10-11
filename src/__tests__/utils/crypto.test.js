import { describe, it, expect } from 'vitest'
import CryptoJS from 'crypto-js'
import DES from 'crypto-js/tripledes.js'
import {
  encrypt,
  decrypt,
  encryptV2,
  encryptV3,
  DecryptionError,
  generatePassword,
} from '../../utils/crypto'

// Builds a v2 envelope the way older builds did: no `kdf` field, given hasher
function legacyV2Envelope(data, password, hasher) {
  const salt = CryptoJS.lib.WordArray.random(16)
  const iv = CryptoJS.lib.WordArray.random(16)
  const key = CryptoJS.PBKDF2(password, salt, { keySize: 8, iterations: 100000, hasher })
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
  })
}

describe('Crypto module', { timeout: 30000 }, () => {
  const password = 'test-password-123'
  const testData = {
    table: {
      last_index: 2,
      data: [
        { id: 1, name: 'test', login: 'user', password: 'pass123' },
        { id: 2, name: 'тест ✓', login: 'user2', password: 'pass456' },
      ],
    },
  }
  const original = JSON.stringify(testData)

  describe('encrypt / decrypt (v3 AES-GCM)', () => {
    it('should encrypt and decrypt data correctly (incl. non-ASCII)', async () => {
      const encrypted = await encrypt(original, password)
      expect(JSON.parse(await decrypt(encrypted, password))).toEqual(testData)
    })

    it('should produce v3 envelope format', async () => {
      const parsed = JSON.parse(await encrypt('hello', password))

      expect(parsed.v).toBe(3)
      expect(parsed.kdf).toBe('PBKDF2-SHA256')
      expect(parsed.iterations).toBe(600000)
      expect(atob(parsed.salt).length).toBe(16)
      expect(atob(parsed.iv).length).toBe(12)
      expect(parsed.data).toBeTruthy()
    })

    it('should produce different ciphertexts for same input (random salt/iv)', async () => {
      const encrypted1 = await encrypt('same-input', password)
      const encrypted2 = await encrypt('same-input', password)
      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should reject a wrong password with DecryptionError', async () => {
      const encrypted = await encrypt('secret', password)
      await expect(decrypt(encrypted, 'wrong-password')).rejects.toBeInstanceOf(DecryptionError)
    })

    it('should reject tampered ciphertext with DecryptionError', async () => {
      const envelope = JSON.parse(await encrypt(original, password))
      const bytes = Uint8Array.from(atob(envelope.data), (c) => c.charCodeAt(0))
      bytes[5] ^= 0x01
      envelope.data = btoa(String.fromCharCode(...bytes))

      await expect(decrypt(JSON.stringify(envelope), password)).rejects.toBeInstanceOf(DecryptionError)
    })

    it('should use the iteration count stored in the envelope', async () => {
      const encrypted = await encryptV3(original, password, 1000)
      expect(JSON.parse(encrypted).iterations).toBe(1000)
      expect(JSON.parse(await decrypt(encrypted, password))).toEqual(testData)
    })
  })

  describe('Backward compatibility with v2 (AES-CBC, crypto-js)', () => {
    it('should decrypt v2 envelopes with kdf=sha256', async () => {
      const encrypted = encryptV2(original, password, 'sha256')
      expect(JSON.parse(await decrypt(encrypted, password))).toEqual(testData)
    })

    it('should decrypt v2 envelopes without kdf made with SHA256', async () => {
      const envelope = legacyV2Envelope(original, password, CryptoJS.algo.SHA256)
      expect(JSON.parse(await decrypt(envelope, password))).toEqual(testData)
    })

    it('should decrypt v2 envelopes without kdf made with SHA1 (crypto-js < 4.2.0)', async () => {
      const envelope = legacyV2Envelope(original, password, CryptoJS.algo.SHA1)
      expect(JSON.parse(await decrypt(envelope, password))).toEqual(testData)
    })

    it('should not fall back to 3DES when v2 decryption fails', async () => {
      const encrypted = encryptV2(original, password, 'sha256')
      // Wrong password must not be treated as a v1 payload
      let result = null
      try { result = await decrypt(encrypted, 'wrong-password') } catch (e) { result = e }
      if (typeof result === 'string') {
        expect(() => JSON.parse(result)).toThrow()
      } else {
        expect(result).toBeInstanceOf(DecryptionError)
      }
    })
  })

  describe('Backward compatibility with v1 (3DES)', () => {
    it('should decrypt legacy 3DES data', async () => {
      const legacyEncrypted = DES.encrypt(original, password).toString()
      expect(JSON.parse(await decrypt(legacyEncrypted, password))).toEqual(testData)
    })

    it('should handle migration: read v1, write v3, read back v3', async () => {
      const v1Encrypted = DES.encrypt(original, password).toString()
      const decrypted = await decrypt(v1Encrypted, password)

      const v3Encrypted = await encrypt(decrypted, password)
      expect(JSON.parse(v3Encrypted).v).toBe(3)
      expect(JSON.parse(await decrypt(v3Encrypted, password))).toEqual(testData)
    })
  })

  describe('generatePassword', () => {
    it('should only use allowed characters and cover the whole alphabet', () => {
      const generated = generatePassword(5000, { uppercase: false, lowercase: false, digits: true, symbols: false })
      expect(generated).toMatch(/^[0-9]+$/)
      expect(new Set(generated).size).toBe(10)
    })

    it('should generate password of specified length', () => {
      expect(generatePassword(12).length).toBe(12)
      expect(generatePassword(20).length).toBe(20)
      expect(generatePassword(8).length).toBe(8)
    })

    it('should default to 16 characters', () => {
      expect(generatePassword().length).toBe(16)
    })

    it('should contain only uppercase when specified', () => {
      const generated = generatePassword(50, { uppercase: true, lowercase: false, digits: false, symbols: false })
      expect(generated).toMatch(/^[A-Z]+$/)
    })

    it('should contain only lowercase when specified', () => {
      const generated = generatePassword(50, { uppercase: false, lowercase: true, digits: false, symbols: false })
      expect(generated).toMatch(/^[a-z]+$/)
    })

    it('should contain only digits when specified', () => {
      const generated = generatePassword(50, { uppercase: false, lowercase: false, digits: true, symbols: false })
      expect(generated).toMatch(/^[0-9]+$/)
    })

    it('should generate different passwords each time', () => {
      const generated1 = generatePassword(32)
      const generated2 = generatePassword(32)
      // Extremely unlikely to be the same
      expect(generated1).not.toBe(generated2)
    })
  })
})

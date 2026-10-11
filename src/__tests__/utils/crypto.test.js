import { describe, it, expect } from 'vitest'
import CryptoJS from 'crypto-js'
import DES from 'crypto-js/tripledes.js'
import {
  encrypt,
  decrypt,
  encryptV2,
  decryptV2,
  decryptV1,
  deriveKey,
  generatePassword,
} from '../../utils/crypto'

describe('Crypto module', () => {
  const password = 'test-password-123'
  const testData = {
    table: {
      last_index: 2,
      data: [
        { id: 1, name: 'test', login: 'user', password: 'pass123' },
        { id: 2, name: 'test2', login: 'user2', password: 'pass456' },
      ],
    },
  }

  describe('encrypt / decrypt (v2 AES+PBKDF2)', () => {
    it('should encrypt and decrypt data correctly', () => {
      const original = JSON.stringify(testData)
      const encrypted = encrypt(original, password)
      const decrypted = decrypt(encrypted, password)

      expect(JSON.parse(decrypted)).toEqual(testData)
    })

    it('should produce v2 envelope format', () => {
      const encrypted = encrypt('hello', password)
      const parsed = JSON.parse(encrypted)

      expect(parsed.v).toBe(2)
      expect(parsed.salt).toBeTruthy()
      expect(parsed.iv).toBeTruthy()
      expect(parsed.data).toBeTruthy()
    })

    it('should produce different ciphertexts for same input (random salt)', () => {
      const data = 'same-input'
      const encrypted1 = encrypt(data, password)
      const encrypted2 = encrypt(data, password)

      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should fail with wrong password', () => {
      const encrypted = encrypt('secret', password)
      // Wrong password should produce garbage or empty string
      const decrypted = decrypt(encrypted, 'wrong-password')
      expect(decrypted).not.toBe('secret')
    })
  })

  describe('Backward compatibility with v1 (3DES)', () => {
    it('should decrypt legacy 3DES data', () => {
      const original = JSON.stringify(testData)
      // Encrypt with old method (3DES, password as direct key)
      const legacyEncrypted = DES.encrypt(original, password).toString()

      // decrypt should detect v1 format and decrypt correctly
      const decrypted = decrypt(legacyEncrypted, password)

      expect(JSON.parse(decrypted)).toEqual(testData)
    })

    it('should decrypt legacy 3DES with different passwords', () => {
      const data = JSON.stringify({ name: 'legacy-test' })
      const key = 'my-old-password'
      const legacy = DES.encrypt(data, key).toString()

      const decrypted = decrypt(legacy, key)
      expect(JSON.parse(decrypted)).toEqual({ name: 'legacy-test' })
    })

    it('should handle migration: read v1, write v2, read back v2', () => {
      const original = JSON.stringify(testData)
      // Step 1: old format (3DES)
      const v1Encrypted = DES.encrypt(original, password).toString()

      // Step 2: decrypt with new decrypt (auto-detects v1)
      const decrypted = decrypt(v1Encrypted, password)
      expect(JSON.parse(decrypted)).toEqual(testData)

      // Step 3: re-encrypt with new encrypt (v2)
      const v2Encrypted = encrypt(decrypted, password)

      // Step 4: decrypt v2
      const decrypted2 = decrypt(v2Encrypted, password)
      expect(JSON.parse(decrypted2)).toEqual(testData)
    })
  })

  describe('deriveKey', () => {
    it('should produce consistent key for same password+salt', () => {
      const salt = CryptoJS.enc.Hex.parse('aabbccdd11223344')
      const key1 = deriveKey('password', salt)
      const key2 = deriveKey('password', salt)

      expect(key1.toString()).toBe(key2.toString())
    })

    it('should produce different keys for different passwords', () => {
      const salt = CryptoJS.enc.Hex.parse('aabbccdd11223344')
      const key1 = deriveKey('password1', salt)
      const key2 = deriveKey('password2', salt)

      expect(key1.toString()).not.toBe(key2.toString())
    })

    it('should produce different keys for different salts', () => {
      const salt1 = CryptoJS.enc.Hex.parse('aabbccdd11223344')
      const salt2 = CryptoJS.enc.Hex.parse('11223344aabbccdd')
      const key1 = deriveKey('password', salt1)
      const key2 = deriveKey('password', salt2)

      expect(key1.toString()).not.toBe(key2.toString())
    })
  })

  describe('generatePassword', () => {
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

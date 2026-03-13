import { describe, it, expect } from 'vitest'
import CryptoJS from 'crypto-js'
import DES from 'crypto-js/tripledes.js'
import {
  fnEncrypt,
  fnDecrypt,
  fnEncryptV2,
  fnDecryptV2,
  fnDecryptV1,
  fnDeriveKey,
  fnGeneratePassword,
} from '../crypto'

describe('Crypto module', () => {
  const sPassword = 'test-password-123'
  const oTestData = {
    table: {
      last_index: 2,
      data: [
        { id: 1, name: 'test', login: 'user', password: 'pass123' },
        { id: 2, name: 'test2', login: 'user2', password: 'pass456' },
      ],
    },
  }

  describe('fnEncrypt / fnDecrypt (v2 AES+PBKDF2)', () => {
    it('should encrypt and decrypt data correctly', () => {
      const sOriginal = JSON.stringify(oTestData)
      const sEncrypted = fnEncrypt(sOriginal, sPassword)
      const sDecrypted = fnDecrypt(sEncrypted, sPassword)

      expect(JSON.parse(sDecrypted)).toEqual(oTestData)
    })

    it('should produce v2 envelope format', () => {
      const sEncrypted = fnEncrypt('hello', sPassword)
      const oParsed = JSON.parse(sEncrypted)

      expect(oParsed.v).toBe(2)
      expect(oParsed.salt).toBeTruthy()
      expect(oParsed.iv).toBeTruthy()
      expect(oParsed.data).toBeTruthy()
    })

    it('should produce different ciphertexts for same input (random salt)', () => {
      const sData = 'same-input'
      const sEnc1 = fnEncrypt(sData, sPassword)
      const sEnc2 = fnEncrypt(sData, sPassword)

      expect(sEnc1).not.toBe(sEnc2)
    })

    it('should fail with wrong password', () => {
      const sEncrypted = fnEncrypt('secret', sPassword)
      // Wrong password should produce garbage or empty string
      const sDecrypted = fnDecrypt(sEncrypted, 'wrong-password')
      expect(sDecrypted).not.toBe('secret')
    })
  })

  describe('Backward compatibility with v1 (3DES)', () => {
    it('should decrypt legacy 3DES data', () => {
      const sOriginal = JSON.stringify(oTestData)
      // Encrypt with old method (3DES, password as direct key)
      const sLegacyEncrypted = DES.encrypt(sOriginal, sPassword).toString()

      // fnDecrypt should detect v1 format and decrypt correctly
      const sDecrypted = fnDecrypt(sLegacyEncrypted, sPassword)

      expect(JSON.parse(sDecrypted)).toEqual(oTestData)
    })

    it('should decrypt legacy 3DES with different passwords', () => {
      const sData = JSON.stringify({ name: 'legacy-test' })
      const sKey = 'my-old-password'
      const sLegacy = DES.encrypt(sData, sKey).toString()

      const sDecrypted = fnDecrypt(sLegacy, sKey)
      expect(JSON.parse(sDecrypted)).toEqual({ name: 'legacy-test' })
    })

    it('should handle migration: read v1, write v2, read back v2', () => {
      const sOriginal = JSON.stringify(oTestData)
      // Step 1: old format (3DES)
      const sV1Encrypted = DES.encrypt(sOriginal, sPassword).toString()

      // Step 2: decrypt with new fnDecrypt (auto-detects v1)
      const sDecrypted = fnDecrypt(sV1Encrypted, sPassword)
      expect(JSON.parse(sDecrypted)).toEqual(oTestData)

      // Step 3: re-encrypt with new fnEncrypt (v2)
      const sV2Encrypted = fnEncrypt(sDecrypted, sPassword)

      // Step 4: decrypt v2
      const sDecrypted2 = fnDecrypt(sV2Encrypted, sPassword)
      expect(JSON.parse(sDecrypted2)).toEqual(oTestData)
    })
  })

  describe('fnDeriveKey', () => {
    it('should produce consistent key for same password+salt', () => {
      const oSalt = CryptoJS.enc.Hex.parse('aabbccdd11223344')
      const oKey1 = fnDeriveKey('password', oSalt)
      const oKey2 = fnDeriveKey('password', oSalt)

      expect(oKey1.toString()).toBe(oKey2.toString())
    })

    it('should produce different keys for different passwords', () => {
      const oSalt = CryptoJS.enc.Hex.parse('aabbccdd11223344')
      const oKey1 = fnDeriveKey('password1', oSalt)
      const oKey2 = fnDeriveKey('password2', oSalt)

      expect(oKey1.toString()).not.toBe(oKey2.toString())
    })

    it('should produce different keys for different salts', () => {
      const oSalt1 = CryptoJS.enc.Hex.parse('aabbccdd11223344')
      const oSalt2 = CryptoJS.enc.Hex.parse('11223344aabbccdd')
      const oKey1 = fnDeriveKey('password', oSalt1)
      const oKey2 = fnDeriveKey('password', oSalt2)

      expect(oKey1.toString()).not.toBe(oKey2.toString())
    })
  })

  describe('fnGeneratePassword', () => {
    it('should generate password of specified length', () => {
      expect(fnGeneratePassword(12).length).toBe(12)
      expect(fnGeneratePassword(20).length).toBe(20)
      expect(fnGeneratePassword(8).length).toBe(8)
    })

    it('should default to 16 characters', () => {
      expect(fnGeneratePassword().length).toBe(16)
    })

    it('should contain only uppercase when specified', () => {
      const sPwd = fnGeneratePassword(50, { uppercase: true, lowercase: false, digits: false, symbols: false })
      expect(sPwd).toMatch(/^[A-Z]+$/)
    })

    it('should contain only lowercase when specified', () => {
      const sPwd = fnGeneratePassword(50, { uppercase: false, lowercase: true, digits: false, symbols: false })
      expect(sPwd).toMatch(/^[a-z]+$/)
    })

    it('should contain only digits when specified', () => {
      const sPwd = fnGeneratePassword(50, { uppercase: false, lowercase: false, digits: true, symbols: false })
      expect(sPwd).toMatch(/^[0-9]+$/)
    })

    it('should generate different passwords each time', () => {
      const sPwd1 = fnGeneratePassword(32)
      const sPwd2 = fnGeneratePassword(32)
      // Extremely unlikely to be the same
      expect(sPwd1).not.toBe(sPwd2)
    })
  })
})

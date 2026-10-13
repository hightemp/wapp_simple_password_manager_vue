import { describe, it, expect } from 'vitest'
import { cardBrand, isValidCardNumber, formatCardNumber, formatExpiry, lastFour } from '../../utils/card'

describe('card helpers', () => {
  it.each([
    ['4242 4242 4242 4242', 'Visa'],
    ['5555555555554444', 'Mastercard'],
    ['2221000000000009', 'Mastercard'],
    ['378282246310005', 'American Express'],
    ['2200 1234 5678 9010', 'Mir'],
    ['6011111111111117', 'Discover'],
    ['9999', ''],
  ])('should detect the brand of %s', (number, brand) => {
    expect(cardBrand(number)).toBe(brand)
  })

  it('should check the Luhn checksum', () => {
    expect(isValidCardNumber('4242 4242 4242 4242')).toBe(true)
    expect(isValidCardNumber('4242 4242 4242 4241')).toBe(false)
    expect(isValidCardNumber('4242')).toBe(false)
  })

  it('should format numbers in groups', () => {
    expect(formatCardNumber('4242424242424242')).toBe('4242 4242 4242 4242')
    expect(formatCardNumber('3782 822463 10005')).toBe('3782 822463 10005')
    expect(formatCardNumber('42a42')).toBe('4242')
    expect(lastFour('4242 4242 4242 1234')).toBe('1234')
  })

  it('should format expiry dates as MM/YY', () => {
    expect(formatExpiry('1')).toBe('1')
    expect(formatExpiry('122')).toBe('12/2')
    expect(formatExpiry('1227')).toBe('12/27')
    expect(formatExpiry('12/2027')).toBe('12/27')
  })
})

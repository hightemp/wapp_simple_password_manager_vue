/** Helpers for payment card numbers and expiry dates */

const BRANDS: { name: string; pattern: RegExp }[] = [
  { name: 'Mir', pattern: /^220[0-4]/ },
  { name: 'Visa', pattern: /^4/ },
  { name: 'Mastercard', pattern: /^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d\d|27[01]\d|2720)/ },
  { name: 'American Express', pattern: /^3[47]/ },
  { name: 'JCB', pattern: /^35/ },
  { name: 'Discover', pattern: /^(6011|65|64[4-9])/ },
  { name: 'UnionPay', pattern: /^62/ },
  { name: 'Maestro', pattern: /^(5018|5020|5038|56|57|58|6304|6759|676[1-3])/ },
]

export function digitsOnly(value: string): string {
  return (value ?? '').replace(/\D/g, '')
}

/** Card brand by the number's prefix ('' when unknown) */
export function cardBrand(number: string): string {
  const digits = digitsOnly(number)
  return BRANDS.find((brand) => brand.pattern.test(digits))?.name ?? ''
}

/** Luhn checksum — catches most typos in a card number */
export function isValidCardNumber(number: string): boolean {
  const digits = digitsOnly(number)
  if (digits.length < 12 || digits.length > 19) return false
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i])
    if (i % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  return sum % 10 === 0
}

/** Groups of 4 digits (American Express: 4-6-5) */
export function formatCardNumber(number: string): string {
  const digits = digitsOnly(number).slice(0, 19)
  if (/^3[47]/.test(digits)) {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)].filter(Boolean).join(' ')
  }
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
}

export function lastFour(number: string): string {
  return digitsOnly(number).slice(-4)
}

/** Typing "1227" or "12/2027" gives "12/27" */
export function formatExpiry(value: string): string {
  const digits = digitsOnly(value)
  if (digits.length <= 2) return digits
  const year = digits.length >= 6 ? digits.slice(4, 6) : digits.slice(2, 4)
  return `${digits.slice(0, 2)}/${year}`
}

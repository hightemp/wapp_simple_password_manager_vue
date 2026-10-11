import { describe, it, expect } from 'vitest'
import { debounce } from '../../utils/debounce'

describe('debounce', () => {
  it('should delay function execution', async () => {
    let count = 0
    const debounced = debounce(() => { count++ }, 50)

    debounced()
    debounced()
    debounced()

    expect(count).toBe(0)

    await new Promise(r => setTimeout(r, 100))
    expect(count).toBe(1)
  })

  it('should only call once after burst', async () => {
    let count = 0
    const debounced = debounce(() => { count++ }, 50)

    for (let i = 0; i < 10; i++) {
      debounced()
    }

    await new Promise(r => setTimeout(r, 100))
    expect(count).toBe(1)
  })

  it('should pass arguments to the function', async () => {
    let result = ''
    const debounced = debounce((value) => { result = value }, 50)

    debounced('hello')

    await new Promise(r => setTimeout(r, 100))
    expect(result).toBe('hello')
  })
})

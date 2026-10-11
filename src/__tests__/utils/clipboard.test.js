import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { copySecret, CLIPBOARD_CLEAR_DELAY } from '../../utils/clipboard'

describe('copySecret', () => {
  let clipboard

  beforeEach(() => {
    vi.useFakeTimers()
    clipboard = { writeText: vi.fn(() => Promise.resolve()) }
    Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should copy and clear the clipboard after the delay', async () => {
    await copySecret('p@ss')
    expect(clipboard.writeText).toHaveBeenLastCalledWith('p@ss')

    await vi.advanceTimersByTimeAsync(CLIPBOARD_CLEAR_DELAY)
    expect(clipboard.writeText).toHaveBeenLastCalledWith('')
  })

  it('should restart the timer on every copy', async () => {
    await copySecret('one')
    await vi.advanceTimersByTimeAsync(CLIPBOARD_CLEAR_DELAY - 1000)
    await copySecret('two')
    await vi.advanceTimersByTimeAsync(CLIPBOARD_CLEAR_DELAY - 1000)
    expect(clipboard.writeText).toHaveBeenLastCalledWith('two')

    await vi.advanceTimersByTimeAsync(1000)
    expect(clipboard.writeText).toHaveBeenLastCalledWith('')
  })

  it('should retry clearing when the window regains focus', async () => {
    await copySecret('p@ss')
    clipboard.writeText.mockImplementationOnce(() => Promise.reject(new Error('Document is not focused')))
    await vi.advanceTimersByTimeAsync(CLIPBOARD_CLEAR_DELAY)
    expect(clipboard.writeText).toHaveBeenCalledTimes(2)

    window.dispatchEvent(new Event('focus'))
    expect(clipboard.writeText).toHaveBeenCalledTimes(3)
    expect(clipboard.writeText).toHaveBeenLastCalledWith('')
  })
})

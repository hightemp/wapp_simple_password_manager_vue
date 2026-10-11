export const CLIPBOARD_CLEAR_DELAY = 30_000

let clearTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Copy a secret and clear the clipboard after CLIPBOARD_CLEAR_DELAY.
 * Each copy restarts the timer. The clipboard can't be read without a permission
 * prompt, so it is cleared unconditionally — even if the user copied something else.
 */
export async function copySecret(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
  if (clearTimer) clearTimeout(clearTimer)
  clearTimer = setTimeout(clearClipboard, CLIPBOARD_CLEAR_DELAY)
}

function clearClipboard() {
  clearTimer = null
  navigator.clipboard.writeText('').catch(() => {
    // Browsers refuse clipboard writes while the page is not focused
    // (the user is usually pasting in another window) — retry on return
    window.addEventListener('focus', clearClipboard, { once: true })
  })
}

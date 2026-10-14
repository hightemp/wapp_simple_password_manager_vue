import { onMounted, onUnmounted } from 'vue'

export const AUTO_LOCK_TIMEOUT = 5 * 60 * 1000
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click']

/** Call `lock` after AUTO_LOCK_TIMEOUT without mouse or keyboard activity */
export function useAutoLock(lock: () => void) {
  let timer: ReturnType<typeof setTimeout> | null = null

  function reset() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(lock, AUTO_LOCK_TIMEOUT)
  }

  onMounted(() => {
    for (const eventName of ACTIVITY_EVENTS) document.addEventListener(eventName, reset)
    reset()
  })

  onUnmounted(() => {
    for (const eventName of ACTIVITY_EVENTS) document.removeEventListener(eventName, reset)
    if (timer) clearTimeout(timer)
  })
}

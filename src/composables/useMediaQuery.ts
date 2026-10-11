import { ref, onMounted, onUnmounted, type Ref } from 'vue'

/** Reactive `window.matchMedia(query).matches` */
export function useMediaQuery(query: string): Ref<boolean> {
  const mediaQuery = window.matchMedia(query)
  const matches = ref(mediaQuery.matches)
  const update = (event: MediaQueryListEvent) => { matches.value = event.matches }

  onMounted(() => mediaQuery.addEventListener('change', update))
  onUnmounted(() => mediaQuery.removeEventListener('change', update))

  return matches
}

// Keep in sync with the `max-width: 768px` breakpoint used in component styles
export const MOBILE_QUERY = '(max-width: 768px)'

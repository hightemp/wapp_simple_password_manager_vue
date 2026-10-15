import { ref, watch } from 'vue'

// Per-browser setting: icons are loaded from an outside service, so they are off by default
const STORAGE_KEY = 'siteIcons'

function load(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch (_) {
    return false
  }
}

const enabled = ref(load())

watch(enabled, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, String(value))
  } catch (_) {
    // Storage unavailable (private mode) — the setting just won't persist
  }
})

/** Website icons next to entries (DuckDuckGo icon service) */
export function useSiteIcons() {
  function toggleSiteIcons() {
    enabled.value = !enabled.value
  }
  return { siteIconsEnabled: enabled, toggleSiteIcons }
}

export function siteIconUrl(domain: string): string {
  return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`
}

import { ref } from 'vue'

// localStorage key kept as-is so the saved theme survives the rename
const THEME_STORAGE_KEY = 'bDarkTheme'

/** Light / dark theme, remembered in this browser */
export function useTheme() {
  const isDarkTheme = ref(localStorage.getItem(THEME_STORAGE_KEY) === 'true')
  if (isDarkTheme.value) document.documentElement.setAttribute('data-theme', 'dark')

  function toggleTheme() {
    isDarkTheme.value = !isDarkTheme.value
    localStorage.setItem(THEME_STORAGE_KEY, String(isDarkTheme.value))
    document.documentElement.setAttribute('data-theme', isDarkTheme.value ? 'dark' : 'light')
  }

  return { isDarkTheme, toggleTheme }
}

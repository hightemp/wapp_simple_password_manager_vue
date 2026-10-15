import { onMounted, onUnmounted } from 'vue'

export function isInputFocused() {
  const tag = document.activeElement?.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

export function isModalOpen() {
  return document.querySelector('.modal-overlay') !== null
}

interface HotkeyHandlers {
  save: () => void
  newEntry: () => void
  edit: () => void
  remove: () => void
  escape: () => void
}

/** App-wide keyboard shortcuts (the table handles the arrow keys itself) */
export function useHotkeys(handlers: HotkeyHandlers) {
  function onKeydown(event: KeyboardEvent) {
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault()
      handlers.save()
    }
    if (event.ctrlKey && event.key === 'n') {
      event.preventDefault()
      handlers.newEntry()
    }
    if (event.ctrlKey && event.key === 'f') {
      event.preventDefault()
      document.querySelector<HTMLInputElement>('.table-search-input, .mobile-search-input')?.focus()
    }
    // Table shortcuts below must not fire behind an open modal
    if (isModalOpen()) return

    if (event.key === 'Delete' && !event.ctrlKey && !event.altKey && !isInputFocused()) {
      handlers.remove()
    }
    if (event.key === 'Enter' && !event.ctrlKey && !event.altKey && !isInputFocused()) {
      event.preventDefault()
      handlers.edit()
    }
    if (event.key === 'Escape') handlers.escape()
  }

  onMounted(() => document.addEventListener('keydown', onKeydown))
  onUnmounted(() => document.removeEventListener('keydown', onKeydown))
}

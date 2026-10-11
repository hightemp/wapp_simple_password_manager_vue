import { inject, type InjectionKey } from 'vue'

export type NotificationType = 'success' | 'error' | 'info'

export type NotifyFn = (title: string, message?: string, type?: NotificationType, duration?: number) => void

export const NOTIFY_KEY: InjectionKey<NotifyFn> = Symbol('notify')

/** Show a toast notification (provided by App.vue) */
export function useNotify(): NotifyFn {
  return inject(NOTIFY_KEY, () => {})
}

import { inject, type InjectionKey } from 'vue'

export interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  // Red confirm button for destructive actions
  danger?: boolean
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

export const CONFIRM_KEY: InjectionKey<ConfirmFn> = Symbol('confirm')

/** Ask the user to confirm an action (dialog provided by App.vue); resolves to true on confirm */
export function useConfirm(): ConfirmFn {
  return inject(CONFIRM_KEY, async () => false)
}

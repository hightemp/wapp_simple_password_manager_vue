import { effectScope, type EffectScope } from 'vue'

const resets: (() => void)[] = []

/**
 * One instance of a composable shared by every component, created on first use.
 * It runs in a detached scope so its computeds and watchers outlive the component that created it.
 */
export function sharedComposable<T>(factory: () => T): () => T {
  let scope: EffectScope | null = null
  let state: T | null = null
  resets.push(() => {
    scope?.stop()
    scope = null
    state = null
  })
  return () => {
    if (!state) {
      scope = effectScope(true)
      state = scope.run(factory)!
    }
    return state
  }
}

/** Forget every shared instance (tests create a new store for each case) */
export function resetSharedComposables() {
  resets.forEach((reset) => reset())
}

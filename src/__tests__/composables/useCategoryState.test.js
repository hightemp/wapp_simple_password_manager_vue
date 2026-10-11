import { describe, it, expect, beforeEach } from 'vitest'
import { useCategoryState } from '../../composables/useCategoryState'

describe('useCategoryState selection', () => {
  const state = useCategoryState()
  const selection = () => [...state.selectedSet.value]

  beforeEach(() => state.selectOnly(null))

  it('should select one category with a plain click', () => {
    state.selectOnly('Work')
    expect(selection()).toEqual(['Work'])
    expect(state.effectiveSelections(['Work'])).toEqual(['Work'])
  })

  it('should add and remove categories with Ctrl+click', () => {
    state.selectOnly('A')
    state.toggleSelection('B')
    state.toggleSelection('')
    expect(selection()).toEqual(['A', 'B', ''])

    state.toggleSelection('B')
    expect(selection()).toEqual(['A', ''])
    // Removing the primary one promotes the next
    state.toggleSelection('A')
    expect(state.selected.value).toBe('')
    expect(selection()).toEqual([''])
  })

  it('should not combine "All" with other categories', () => {
    state.toggleSelection('A')
    expect(selection()).toEqual(['A'])
    expect(state.effectiveSelections(['A'])).toEqual(['A'])
    state.selectOnly(null)
    expect(state.effectiveSelections(['A'])).toEqual([null])
  })

  it('should select a range keeping the anchor', () => {
    state.selectOnly('B')
    state.selectRange(['A', 'B', 'C'])
    expect(state.selected.value).toBe('B')
    expect(selection().sort()).toEqual(['A', 'B', 'C'])
  })

  it('should ignore selected categories missing from the open database', () => {
    state.selectOnly('A')
    state.toggleSelection('Gone')
    expect(state.effectiveSelections(['A'])).toEqual(['A'])
    state.selectOnly('Gone')
    expect(state.effectiveSelections(['A'])).toEqual([null])
  })

  it('should follow renames and deletes of selected categories', () => {
    state.selectOnly('Work')
    state.toggleSelection('Work/Email')
    state.toggleSelection('Other')
    state.followRename('Work', 'Job')
    expect(selection()).toEqual(['Job', 'Job/Email', 'Other'])

    state.followDelete('Job', '')
    expect(selection()).toEqual(['Email', 'Other'])
  })
})

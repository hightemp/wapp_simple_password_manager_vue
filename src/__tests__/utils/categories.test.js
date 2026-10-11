import { describe, it, expect } from 'vitest'
import {
  normalizePath,
  parentPath,
  pathName,
  joinPath,
  isWithin,
  withAncestors,
  replacePrefix,
  collectPaths,
  buildTree,
} from '../../utils/categories'

describe('categories', () => {
  it('should normalize paths', () => {
    expect(normalizePath(' Work // Email ')).toBe('Work/Email')
    expect(normalizePath('/Work/')).toBe('Work')
    expect(normalizePath('')).toBe('')
    expect(normalizePath(undefined)).toBe('')
  })

  it('should split paths', () => {
    expect(parentPath('Work/Email/Old')).toBe('Work/Email')
    expect(parentPath('Work')).toBe('')
    expect(pathName('Work/Email')).toBe('Email')
    expect(pathName('Work')).toBe('Work')
    expect(joinPath('', 'Work')).toBe('Work')
    expect(joinPath('Work', ' Email ')).toBe('Work/Email')
    expect(withAncestors('A/B/C')).toEqual(['A', 'A/B', 'A/B/C'])
  })

  it('should check nesting without matching name prefixes', () => {
    expect(isWithin('Work/Email', 'Work')).toBe(true)
    expect(isWithin('Work', 'Work')).toBe(true)
    expect(isWithin('Workshop', 'Work')).toBe(false)
    expect(isWithin('Work', 'Work/Email')).toBe(false)
  })

  it('should replace path prefixes', () => {
    expect(replacePrefix('Work/Email/Old', 'Work/Email', 'Mail')).toBe('Mail/Old')
    expect(replacePrefix('Work/Email', 'Work/Email', 'Personal/Email')).toBe('Personal/Email')
    // Moving to the root ("" target) — used when deleting a root category
    expect(replacePrefix('Work/Email', 'Work', '')).toBe('Email')
    expect(replacePrefix('Work', 'Work', '')).toBe('')
    expect(replacePrefix('Workshop', 'Work', 'X')).toBe('Workshop')
  })

  it('should collect distinct paths with ancestors, sorted', () => {
    expect(collectPaths(['Empty'], ['work/Email', 'Banking', '', 'work/Email'])).toEqual([
      'Banking', 'Empty', 'work', 'work/Email',
    ])
  })

  it('should build a tree with counts including subcategories', () => {
    const tree = buildTree(['Personal'], ['Work', 'Work/Email', 'Work/Email', 'Work/Servers', '', 'Bank'])
    expect(tree.map((n) => [n.name, n.count])).toEqual([['Bank', 1], ['Personal', 0], ['Work', 4]])
    const work = tree.find((n) => n.name === 'Work')
    expect(work.children.map((n) => [n.path, n.count])).toEqual([['Work/Email', 2], ['Work/Servers', 1]])
  })
})

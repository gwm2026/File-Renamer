import { describe, it, expect } from 'vitest'
import { sanitizeFilename } from './sanitize'

describe('sanitizeFilename', () => {
  it('replaces invalid filename characters with dash', () => {
    expect(sanitizeFilename('a/b\\c*d?e"f<g>h|i')).toBe('a-b-c-d-e-f-g-h-i')
  })

  it('trims trailing dots and spaces', () => {
    expect(sanitizeFilename('  name  ...  ')).toBe('name')
  })

  it('collapses whitespace by default', () => {
    expect(sanitizeFilename('hello    world')).toBe('hello world')
  })

  it('returns untitled for empty result', () => {
    expect(sanitizeFilename('...')).toBe('untitled')
    expect(sanitizeFilename('   ')).toBe('untitled')
  })

  it('keeps parentheses, hyphens, underscores', () => {
    expect(sanitizeFilename('(PRSLxGW)_V1_STEM')).toBe('(PRSLxGW)_V1_STEM')
  })
})

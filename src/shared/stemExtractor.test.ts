import { describe, it, expect } from 'vitest'
import { extractStemFromFilename, extractStemsFromFilePaths } from './stemExtractor'

describe('extractStemFromFilename', () => {
  it('extracts segment after last underscore', () => {
    expect(extractStemFromFilename('Song_V1_STEM_Original Vocals.wav')).toBe('Original Vocals')
  })

  it('returns empty when no underscore', () => {
    expect(extractStemFromFilename('SingleName.wav')).toBe('')
  })

  it('handles path with directory', () => {
    expect(extractStemFromFilename('/path/to/A_B_Original Vocals.wav')).toBe('Original Vocals')
  })
})

describe('extractStemsFromFilePaths', () => {
  it('returns record of path -> stem', () => {
    const paths = ['/a/foo_Bass.wav', '/b/bar_Vocals.wav']
    expect(extractStemsFromFilePaths(paths)).toEqual({
      '/a/foo_Bass.wav': 'Bass',
      '/b/bar_Vocals.wav': 'Vocals',
    })
  })
})

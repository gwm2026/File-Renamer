import { describe, it, expect } from 'vitest'
import { parseFilename } from './parse'
import type { CompanyTemplate } from './types'

const westOneTemplate: CompanyTemplate = {
  id: 'westone',
  name: 'West One',
  pattern: '',
  tokens: [],
  rules: {},
  parsingHints: {
    regex: '^([A-Za-z0-9]+)_([A-Za-z]+)_([^_]+)_([A-G](?:#|b)?(?:maj|min))_([0-9]{2,3})BPM_(v[0-9]+)$',
    captureToToken: ['projectCode', 'composer', 'trackTitle', 'key', 'bpm', 'version'],
  },
}

describe('parseFilename', () => {
  it('West One: parses FEMMPP194_GW_Awakening_Dmaj_77BPM_v1', () => {
    const result = parseFilename('FEMMPP194_GW_Awakening_Dmaj_77BPM_v1.wav', westOneTemplate)
    expect(result.projectCode).toBe('FEMMPP194')
    expect(result.composer).toBe('GW')
    expect(result.trackTitle).toBe('Awakening')
    expect(result.key).toBe('Dmaj')
    expect(result.bpm).toBe('77')
    expect(result.version).toBe('v1')
  })
})

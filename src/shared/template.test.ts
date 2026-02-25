import { describe, it, expect } from 'vitest'
import { renderPattern } from './template'
import type { CompanyTemplate } from './types'

describe('renderPattern', () => {
  it('replaces tokens with values (Parasol-style)', () => {
    const pattern = '{artist} - {title} ({codes})_{version}_{type}_{stem}'
    const values = {
      artist: 'Vagabon',
      title: 'Home Soon',
      codes: 'PRSLxGW',
      version: 'V1',
      type: 'STEM',
      stem: 'Original Vocals',
    }
    expect(renderPattern(pattern, values)).toBe(
      'Vagabon - Home Soon (PRSLxGW)_V1_STEM_Original Vocals'
    )
  })

  it('appends extension when provided', () => {
    expect(renderPattern('{name}', { name: 'test' }, 'wav')).toBe('test.wav')
  })

  it('West One pattern with bpm and version', () => {
    const pattern = '{projectCode}_{composer}_{trackTitle}_{key}_{bpm}BPM_{version}'
    const values = {
      projectCode: 'FEMMPP194',
      composer: 'GW',
      trackTitle: 'Awakening',
      key: 'Dmaj',
      bpm: '77',
      version: 'v1',
    }
    expect(renderPattern(pattern, values)).toBe(
      'FEMMPP194_GW_Awakening_Dmaj_77BPM_v1'
    )
  })
})

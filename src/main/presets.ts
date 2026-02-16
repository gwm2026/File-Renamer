import type { Company, Scheme, TokenDefinition } from '../shared/types'

function token(
  schemeId: string,
  key: string,
  label: string,
  opts: { required?: boolean; example?: string; allowedValues?: string[]; numeric?: boolean; renderSuffix?: string; renderPrefix?: string } = {}
): TokenDefinition {
  return {
    id: schemeId + '-token-' + key,
    key,
    label,
    required: opts.required ?? true,
    defaultValue: '',
    example: opts.example ?? '',
    allowedValues: opts.allowedValues,
    numeric: opts.numeric,
    renderSuffix: opts.renderSuffix,
    renderPrefix: opts.renderPrefix,
  }
}

export function getDefaultCompanies(): Company[] {
  const parasolId = 'preset-parasol-music'
  const parasolSchemeId = parasolId + '-default'
  const parasolScheme: Scheme = {
    id: parasolSchemeId,
    name: 'Default',
    pattern: '{artist} - {title} ({codes})_{version}_{type}_{stem}',
    tokens: [
      token(parasolSchemeId, 'artist', 'Artist', { example: 'Vagabon' }),
      token(parasolSchemeId, 'title', 'Title', { example: 'Home Soon' }),
      token(parasolSchemeId, 'codes', 'Codes', { example: 'PRSLxGW' }),
      token(parasolSchemeId, 'version', 'Version', { example: 'V1', allowedValues: ['V1', 'V2', 'V3'] }),
      token(parasolSchemeId, 'type', 'Type', {
        example: 'STEM',
        allowedValues: ['STEM', 'MIX', 'ALT', 'INSTR', 'FULL', 'STEREOMIX'],
      }),
      token(parasolSchemeId, 'stem', 'Stem', { example: 'Original Vocals', required: false }),
    ],
    rules: { sanitize: true, whitespace: true, allowedTypes: ['STEM', 'MIX', 'ALT', 'INSTR'] },
  }

  const westOneId = 'preset-west-one-music-group'
  const westOneSchemeId = westOneId + '-default'
  const westOneScheme: Scheme = {
    id: westOneSchemeId,
    name: 'Default',
    pattern: '{projectCode}_{composer}_{trackTitle}_{key}_{bpm}BPM_{version}',
    tokens: [
      token(westOneSchemeId, 'projectCode', 'Project Code', { example: 'FEMMPP194' }),
      token(westOneSchemeId, 'composer', 'Composer Initials', { example: 'GW' }),
      token(westOneSchemeId, 'trackTitle', 'Track Title', { example: 'Awakening' }),
      token(westOneSchemeId, 'key', 'Key', { example: 'Dmaj' }),
      token(westOneSchemeId, 'bpm', 'BPM', { example: '77', numeric: true }),
      token(westOneSchemeId, 'version', 'Version', { example: 'v1', allowedValues: ['v1', 'v2', 'v3'], renderPrefix: 'v' }),
    ],
    rules: { sanitize: true, whitespace: true, keepUnderscores: true },
    parsingHints: {
      regex: '^([A-Za-z0-9]+)_([A-Za-z]+)_([^_]+)_([A-G](?:#|b)?(?:maj|min))_([0-9]{2,3})BPM_(v[0-9]+)$',
      captureToToken: ['projectCode', 'composer', 'trackTitle', 'key', 'bpm', 'version'],
    },
  }

  return [
    { id: parasolId, name: 'Parasol Music', types: ['STEM', 'MIX', 'ALT', 'INSTR', 'FULL', 'STEREOMIX'], schemes: [parasolScheme] },
    { id: westOneId, name: 'West One Music Group', types: [], schemes: [westOneScheme] },
  ]
}

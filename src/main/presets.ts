import type { CompanyTemplate, TokenDefinition } from '../shared/types'

function token(
  templateId: string,
  key: string,
  label: string,
  opts: { required?: boolean; example?: string; allowedValues?: string[]; numeric?: boolean; renderSuffix?: string; renderPrefix?: string } = {}
): TokenDefinition {
  return {
    id: templateId + '-token-' + key,
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

export function getDefaultTemplates(): CompanyTemplate[] {
  const parasolId = 'preset-parasol-music'
  const parasol: CompanyTemplate = {
    id: parasolId,
    name: 'Parasol Music',
    pattern: '{artist} - {title} ({codes})_{version}_{type}_{stem}',
    tokens: [
      token(parasolId, 'artist', 'Artist', { example: 'Vagabon' }),
      token(parasolId, 'title', 'Title', { example: 'Home Soon' }),
      token(parasolId, 'codes', 'Codes', { example: 'PRSLxGW' }),
      token(parasolId, 'version', 'Version', { example: 'V1', allowedValues: ['V1', 'V2', 'V3'] }),
      token(parasolId, 'type', 'Type', {
        example: 'STEM',
        allowedValues: ['STEM', 'MIX', 'ALT', 'INSTR', 'FULL', 'STEREOMIX'],
      }),
      token(parasolId, 'stem', 'Stem', { example: 'Original Vocals', required: false }),
    ],
    rules: { sanitize: true, whitespace: true, allowedTypes: ['STEM', 'MIX', 'ALT', 'INSTR'] },
  }

  const westOneId = 'preset-west-one-music-group'
  const westOne: CompanyTemplate = {
    id: westOneId,
    name: 'West One Music Group',
    pattern: '{projectCode}_{composer}_{trackTitle}_{key}_{bpm}BPM_{version}',
    tokens: [
      token(westOneId, 'projectCode', 'Project Code', { example: 'FEMMPP194' }),
      token(westOneId, 'composer', 'Composer Initials', { example: 'GW' }),
      token(westOneId, 'trackTitle', 'Track Title', { example: 'Awakening' }),
      token(westOneId, 'key', 'Key', { example: 'Dmaj' }),
      token(westOneId, 'bpm', 'BPM', { example: '77', numeric: true }),
      token(westOneId, 'version', 'Version', { example: 'v1', allowedValues: ['v1', 'v2', 'v3'], renderPrefix: 'v' }),
    ],
    rules: { sanitize: true, whitespace: true, keepUnderscores: true },
    parsingHints: {
      regex: '^([A-Za-z0-9]+)_([A-Za-z]+)_([^_]+)_([A-G](?:#|b)?(?:maj|min))_([0-9]{2,3})BPM_(v[0-9]+)$',
      captureToToken: ['projectCode', 'composer', 'trackTitle', 'key', 'bpm', 'version'],
    },
  }

  return [parasol, westOne]
}

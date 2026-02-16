import type { CompanyTemplate, TokenDefinition } from './types'

function applyCaseStyle(value: string, style?: string): string {
  if (!value || style === 'none' || !style) return value
  switch (style) {
    case 'upper':
      return value.toUpperCase()
    case 'lower':
      return value.toLowerCase()
    case 'title':
      return value.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
    default:
      return value
  }
}

function getTokenDisplayValue(
  key: string,
  value: string,
  token?: TokenDefinition
): string {
  if (value === undefined || value === null) return ''
  let out = String(value).trim()
  if (token?.renderPrefix) {
    const prefix = token.renderPrefix
    const rest = out.replace(new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*', 'i'), '')
    out = prefix + rest.toLowerCase()
  }
  if (token?.caseStyle) out = applyCaseStyle(out, token.caseStyle)
  if (token?.renderSuffix && out !== '') out = out + token.renderSuffix
  return out
}

/**
 * Render pattern with token values. Handles renderPrefix/renderSuffix (e.g. bpm+BPM, v+version).
 */
export function renderPattern(
  pattern: string,
  tokenValues: Record<string, string>,
  extension?: string,
  template?: CompanyTemplate
): string {
  const tokenMap = new Map<string, TokenDefinition>()
  if (template?.tokens) {
    for (const t of template.tokens) tokenMap.set(t.key, t)
  }
  let result = pattern.replace(/\{(\w+)\}/g, (_, key: string) => {
    const raw = tokenValues[key]
    const token = tokenMap.get(key)
    const display = getTokenDisplayValue(key, raw ?? '', token)
    return display
  })
  if (extension !== undefined && extension !== '') {
    const dot = extension.startsWith('.') ? extension : '.' + extension
    if (!result.endsWith(dot)) result += dot
  }
  return result
}

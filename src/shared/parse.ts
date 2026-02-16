import type { CompanyTemplate } from './types'

/**
 * Parse a filename using template's parsing regex (capture groups) or heuristic.
 * Returns record of token key -> value.
 */
export function parseFilename(filename: string, template: CompanyTemplate): Record<string, string> {
  const stem = filename.replace(/\.[^/.]+$/, '')
  const hints = template.parsingHints
  if (hints?.regex && hints.captureToToken?.length) {
    const re = new RegExp(hints.regex!)
    const m = stem.match(re)
    if (m) {
      const out: Record<string, string> = {}
      hints.captureToToken.forEach((tokenKey, i) => {
        const raw = m[i + 1]
        if (raw !== undefined && tokenKey) {
          if (tokenKey === 'bpm') {
            out[tokenKey] = raw.replace(/\s*BPM\s*/gi, '').trim()
          } else {
            out[tokenKey] = raw.trim()
          }
        }
      })
      return out
    }
  }
  return heuristicParse(stem, template)
}

function heuristicParse(stem: string, template: CompanyTemplate): Record<string, string> {
  const out: Record<string, string> = {}
  if (stem.includes(' - ') && stem.includes('(') && stem.includes(')')) {
    const dashIdx = stem.indexOf(' - ')
    out['artist'] = stem.slice(0, dashIdx).trim()
    const afterDash = stem.slice(dashIdx + 3)
    const parenStart = afterDash.indexOf('(')
    const parenEnd = afterDash.indexOf(')', parenStart)
    if (parenEnd !== -1) {
      out['title'] = afterDash.slice(0, parenStart).trim()
      out['codes'] = afterDash.slice(parenStart + 1, parenEnd).trim()
      const tail = afterDash.slice(parenEnd + 1).replace(/^_+/, '')
      const parts = tail.split('_')
      if (parts.length >= 3) {
        out['version'] = parts[0]
        out['type'] = parts[1]
        out['stem'] = parts.slice(2).join(' ')
      }
    }
  } else if (stem.includes('_')) {
    const parts = stem.split('_')
    const tokens = template.tokens.map((t) => t.key)
    parts.forEach((p, i) => {
      if (tokens[i]) out[tokens[i]] = p
    })
  }
  return out
}

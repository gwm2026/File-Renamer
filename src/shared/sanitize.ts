import type { TemplateRules } from './types'

const INVALID_FILENAME_CHARS = /[\\/:*?"<>|]+/g

/**
 * Normalize unicode to NFC (canonical composition).
 */
function normalizeUnicode(s: string): string {
  return s.normalize('NFC')
}

/**
 * Sanitize a filename for macOS: replace invalid chars, optional whitespace collapse, trim.
 */
export function sanitizeFilename(name: string, rules?: TemplateRules): string {
  let cleaned = normalizeUnicode(name)
  cleaned = cleaned.replace(INVALID_FILENAME_CHARS, '-')
  if (rules?.whitespace !== false) {
    cleaned = cleaned.replace(/\s+/g, ' ').trim()
  }
  cleaned = cleaned.trim().replace(/\.+$/, '').trim()
  return cleaned || 'untitled'
}

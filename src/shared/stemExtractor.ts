/**
 * Extract stem-like suffix from filename (segment after last underscore, no extension).
 * e.g. "Song_V1_STEM_Original Vocals.wav" -> "Original Vocals"
 * Works in both Node and browser (no path module).
 */
export function extractStemFromFilename(filePath: string): string {
  const basename = filePath.split(/[/\\]/).pop() ?? filePath
  const stem = basename.replace(/\.[^/.]+$/, '')
  const lastUnderscore = stem.lastIndexOf('_')
  if (lastUnderscore === -1) return ''
  return stem.slice(lastUnderscore + 1).trim()
}

/**
 * Run stem extractor on multiple file paths. Returns Record<filePath, stem>.
 */
export function extractStemsFromFilePaths(filePaths: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const p of filePaths) {
    out[p] = extractStemFromFilename(p)
  }
  return out
}

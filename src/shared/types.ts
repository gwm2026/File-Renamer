export type CaseStyle = 'none' | 'upper' | 'lower' | 'title'

export interface TokenDefinition {
  id: string
  key: string
  label: string
  required: boolean
  defaultValue: string
  example: string
  allowedValues?: string[]
  caseStyle?: CaseStyle
  numeric?: boolean
  renderSuffix?: string
  renderPrefix?: string
}

export interface TemplateRules {
  sanitize?: boolean
  whitespace?: boolean
  caseStylePerToken?: Record<string, CaseStyle>
  delimiterPolicies?: Record<string, string>
  allowedTypes?: string[]
  keepUnderscores?: boolean
}

export interface ParsingHints {
  regex?: string
  captureToToken?: string[]
}

/** A naming scheme (pattern + tokens + rules). Previously embedded in CompanyTemplate. */
export interface Scheme {
  id: string
  name: string
  pattern: string
  tokens: TokenDefinition[]
  rules: TemplateRules
  parsingHints?: ParsingHints
}

/** Company with multiple schemes and optional custom types list. */
export interface Company {
  id: string
  name: string
  types: string[]
  schemes: Scheme[]
}

/** @deprecated Use Scheme for scheme data; Company for company + schemes. Kept for migration. */
export interface CompanyTemplate {
  id: string
  name: string
  tokens: TokenDefinition[]
  pattern: string
  rules: TemplateRules
  parsingHints?: ParsingHints
}

export interface RenameJournalEntry {
  timestamp: number
  operations: { fromPath: string; toPath: string }[]
}

export type PreviewStatus = 'ok' | 'collision' | 'duplicate' | 'invalid_chars' | 'exists'

export interface PreviewRow {
  originalPath: string
  originalName: string
  newName: string
  status: PreviewStatus
  targetFolder: string
  warnings?: string[]
  stemOverride?: string
  /** Folder path (for display when rows are built from file selection) */
  path?: string
  /** File extension (for display when rows are built from file selection) */
  extension?: string
}

export interface PreviewRenameArgs {
  /** Scheme id (resolved from companies in main process). */
  schemeId: string
  batchValues: Record<string, string>
  fileStemOverrides?: Record<string, string>
  filePaths: string[]
  targetFolder?: string | null
  copyInsteadOfRename?: boolean
}

export interface ApplyRenameResult {
  success: boolean
  applied?: { fromPath: string; toPath: string }[]
  error?: string
}

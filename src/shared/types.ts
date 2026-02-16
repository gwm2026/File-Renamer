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
}

export interface PreviewRenameArgs {
  templateId: string
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

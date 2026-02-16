/// <reference types="vite/client" />
import type { CompanyTemplate, PreviewRow, PreviewRenameArgs, ApplyRenameResult, RenameJournalEntry } from '../shared/types'

declare global {
  interface Window {
    schemerename: {
      selectFiles: () => Promise<string[]>
      selectFolder: () => Promise<string | null>
      getTemplates: () => Promise<CompanyTemplate[]>
      saveTemplates: (templates: CompanyTemplate[]) => Promise<void>
      previewRename: (args: PreviewRenameArgs) => Promise<PreviewRow[]>
      applyRename: (args: {
        operations: { fromPath: string; toPath: string }[]
        copyInsteadOfRename?: boolean
      }) => Promise<ApplyRenameResult>
      undoLastRename: () => Promise<{ success: boolean; error?: string; undone?: boolean }>
      getRenameJournal: () => Promise<RenameJournalEntry[]>
    }
  }
}

export {}

import { contextBridge, ipcRenderer } from 'electron'
import type { Company, PreviewRow, PreviewRenameArgs, ApplyRenameResult, RenameJournalEntry } from '../shared/types'

const api = {
  selectFiles: (): Promise<string[]> => ipcRenderer.invoke('schemerename:selectFiles'),
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('schemerename:selectFolder'),
  getCompanies: (): Promise<Company[]> => ipcRenderer.invoke('schemerename:getCompanies'),
  saveCompanies: (companies: Company[]): Promise<void> =>
    ipcRenderer.invoke('schemerename:saveCompanies', companies),
  previewRename: (args: PreviewRenameArgs): Promise<PreviewRow[]> =>
    ipcRenderer.invoke('schemerename:previewRename', args),
  applyRename: (args: {
    operations: { fromPath: string; toPath: string }[]
    copyInsteadOfRename?: boolean
  }): Promise<ApplyRenameResult> => ipcRenderer.invoke('schemerename:applyRename', args),
  undoLastRename: (): Promise<{ success: boolean; error?: string; undone?: boolean }> =>
    ipcRenderer.invoke('schemerename:undoLastRename'),
  getRenameJournal: (): Promise<RenameJournalEntry[]> =>
    ipcRenderer.invoke('schemerename:getRenameJournal'),
}

contextBridge.exposeInMainWorld('schemerename', api)

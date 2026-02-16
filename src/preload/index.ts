import { contextBridge, ipcRenderer } from 'electron'
import type { CompanyTemplate, PreviewRow, PreviewRenameArgs, ApplyRenameResult, RenameJournalEntry } from '../shared/types'

const api = {
  selectFiles: (): Promise<string[]> => ipcRenderer.invoke('schemerename:selectFiles'),
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('schemerename:selectFolder'),
  getTemplates: (): Promise<CompanyTemplate[]> => ipcRenderer.invoke('schemerename:getTemplates'),
  saveTemplates: (templates: CompanyTemplate[]): Promise<void> =>
    ipcRenderer.invoke('schemerename:saveTemplates', templates),
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

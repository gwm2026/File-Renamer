import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import Store from 'electron-store'
import {
  getDefaultTemplates,
  previewRename as doPreviewRename,
  applyRename as doApplyRename,
  undoLastRename as doUndoLastRename,
} from './ipc-handlers'

const store = new Store<{
  companyTemplates: import('../shared/types').CompanyTemplate[]
  renameJournal: import('../shared/types').RenameJournalEntry[]
  lastUsedValuesPerCompany: Record<string, Record<string, string>>
}>({ name: 'schemerename' })

const JOURNAL_MAX = 50

function ensureDefaults() {
  let templates = store.get('companyTemplates', [])
  if (templates.length === 0) {
    templates = getDefaultTemplates()
    store.set('companyTemplates', templates)
  }
  if (!Array.isArray(store.get('renameJournal'))) {
    store.set('renameJournal', [])
  }
}

function getTemplates(): import('../shared/types').CompanyTemplate[] {
  ensureDefaults()
  return store.get('companyTemplates', [])
}

function createWindow() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../../dist-preload/preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'))
  }
}

app.whenReady().then(() => {
  ensureDefaults()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('schemerename:selectFiles', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Audio', extensions: ['wav', 'aif', 'aiff', 'mp3'] }],
  })
  if (result.canceled) return []
  return result.filePaths
})

ipcMain.handle('schemerename:selectFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  })
  if (result.canceled) return null
  return result.filePaths[0] ?? null
})

ipcMain.handle('schemerename:getTemplates', async () => {
  return getTemplates()
})

ipcMain.handle('schemerename:saveTemplates', async (_, templates: import('../shared/types').CompanyTemplate[]) => {
  store.set('companyTemplates', templates)
})

ipcMain.handle('schemerename:previewRename', async (_, args: import('../shared/types').PreviewRenameArgs) => {
  const templates = getTemplates()
  return doPreviewRename(args, templates, fs)
})

ipcMain.handle('schemerename:applyRename', async (_, args: { operations: { fromPath: string; toPath: string }[]; copyInsteadOfRename?: boolean }) => {
  const result = await doApplyRename(args, fs)
  if (result.success && result.applied?.length) {
    let journal = store.get('renameJournal', [])
    journal.push({ timestamp: Date.now(), operations: result.applied })
    if (journal.length > JOURNAL_MAX) journal = journal.slice(-JOURNAL_MAX)
    store.set('renameJournal', journal)
  }
  return result
})

ipcMain.handle('schemerename:undoLastRename', async () => {
  const journal = store.get('renameJournal', [])
  const result = await doUndoLastRename(journal, fs)
  if (result.success && result.undone) {
    let j = store.get('renameJournal', [])
    j = j.slice(0, -1)
    store.set('renameJournal', j)
  }
  return result
})

ipcMain.handle('schemerename:getRenameJournal', async () => {
  return store.get('renameJournal', [])
})

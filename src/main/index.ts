import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import Store from 'electron-store'
import type { Company, CompanyTemplate } from '../shared/types'
import {
  getDefaultCompanies,
  previewRename as doPreviewRename,
  applyRename as doApplyRename,
  undoLastRename as doUndoLastRename,
} from './ipc-handlers'

const store = new Store<{
  companies: Company[]
  companyTemplates: CompanyTemplate[]
  renameJournal: import('../shared/types').RenameJournalEntry[]
  lastUsedValuesPerCompany: Record<string, Record<string, string>>
}>({ name: 'schemerename' })

const JOURNAL_MAX = 50

function isLegacyTemplate(t: unknown): t is CompanyTemplate {
  return (
    typeof t === 'object' &&
    t != null &&
    'pattern' in t &&
    'tokens' in t &&
    Array.isArray((t as CompanyTemplate).tokens)
  )
}

function migrateCompanyTemplatesToCompanies(): Company[] {
  const legacy = store.get('companyTemplates', [])
  if (!Array.isArray(legacy) || legacy.length === 0) return []
  const companies: Company[] = legacy
    .filter(isLegacyTemplate)
    .map((t) => ({
      id: t.id,
      name: t.name,
      types: [],
      schemes: [
        {
          id: t.id + '-default',
          name: 'Default',
          pattern: t.pattern,
          tokens: t.tokens,
          rules: t.rules,
          parsingHints: t.parsingHints,
        },
      ],
    }))
  store.set('companies', companies)
  return companies
}

function ensureDefaults() {
  let companies = store.get('companies', [])
  if (!Array.isArray(companies) || companies.length === 0) {
    const migrated = migrateCompanyTemplatesToCompanies()
    if (migrated.length > 0) {
      companies = migrated
    } else {
      companies = getDefaultCompanies()
      store.set('companies', companies)
    }
  }
  if (!Array.isArray(store.get('renameJournal'))) {
    store.set('renameJournal', [])
  }
}

function getCompanies(): Company[] {
  ensureDefaults()
  return store.get('companies', [])
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
    // No filter: allow any file type (audio, PDFs, contracts, etc.)
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

ipcMain.handle('schemerename:getCompanies', async () => {
  return getCompanies()
})

ipcMain.handle('schemerename:saveCompanies', async (_, companies: Company[]) => {
  store.set('companies', companies)
})

ipcMain.handle('schemerename:previewRename', async (_, args: import('../shared/types').PreviewRenameArgs) => {
  const companies = getCompanies()
  return doPreviewRename(args, companies, fs)
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

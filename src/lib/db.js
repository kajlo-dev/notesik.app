import { openDB } from 'idb'

const DB_NAME = 'notesik-app'
const DB_VERSION = 1
const PROGRAMS_STORE = 'programs'
const SETTINGS_STORE = 'settings'
const SETTINGS_KEY = 'app-settings'

const DEFAULT_SETTINGS = {
  autosaveIntervalMinutes: 2,
  activeProgramId: null,
  hasSeenOnboarding: false,
}

function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(PROGRAMS_STORE)) {
        db.createObjectStore(PROGRAMS_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE)
      }
    },
  })
}

export async function listPrograms() {
  const db = await getDb()
  const all = await db.getAll(PROGRAMS_STORE)
  return all.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
}

export async function getProgram(id) {
  const db = await getDb()
  return db.get(PROGRAMS_STORE, id)
}

export async function saveProgram(program) {
  const db = await getDb()
  await db.put(PROGRAMS_STORE, program)
  return program
}

export async function deleteProgram(id) {
  const db = await getDb()
  await db.delete(PROGRAMS_STORE, id)
  const settings = await getSettings()
  if (settings.activeProgramId === id) {
    await saveSettings({ ...settings, activeProgramId: null })
  }
}

export async function getSettings() {
  const db = await getDb()
  const stored = await db.get(SETTINGS_STORE, SETTINGS_KEY)
  return { ...DEFAULT_SETTINGS, ...(stored || {}) }
}

export async function saveSettings(settings) {
  const db = await getDb()
  await db.put(SETTINGS_STORE, settings, SETTINGS_KEY)
  return settings
}

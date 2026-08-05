import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbFile = path.join(__dirname, '..', 'data.sqlite')

const SQL = await initSqlJs()

let buffer = null
if (fs.existsSync(dbFile)) {
  buffer = fs.readFileSync(dbFile)
}
export const db = new SQL.Database(buffer)

const SCHEMA = `
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  grade TEXT,
  subject TEXT,
  phone TEXT,
  fee_per_hour REAL DEFAULT 0,
  parent_name TEXT,
  parent_phone TEXT,
  personality TEXT,
  weakness TEXT,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  duration_hours REAL DEFAULT 1.5,
  fee REAL DEFAULT 0,
  focus_level INTEGER DEFAULT 3,
  performance TEXT,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS knowledge_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  point TEXT NOT NULL,
  status TEXT DEFAULT 'learning',
  mastery INTEGER DEFAULT 50,
  note TEXT,
  updated_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS feedbacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  session_id INTEGER,
  date TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS trainings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  point TEXT NOT NULL,
  suggestion TEXT NOT NULL,
  done INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS ai_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  base_url TEXT DEFAULT 'https://api.openai.com/v1',
  model TEXT DEFAULT 'gpt-4o-mini',
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS ai_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scene TEXT NOT NULL,
  question TEXT,
  answer TEXT NOT NULL,
  tokens INTEGER,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
INSERT OR IGNORE INTO ai_config (id) VALUES (1);
`
db.run(SCHEMA)
db.run('PRAGMA foreign_keys = ON;')

let saveTimer = null
export function persist() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const data = db.export()
    fs.writeFileSync(dbFile, Buffer.from(data))
    saveTimer = null
  }, 200)
}

export const now = () => new Date().toISOString().slice(0, 10)

function clean(v) {
  if (v === undefined) return null
  if (typeof v === 'boolean') return v ? 1 : 0
  return v
}

export function all(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params.map(clean))
  const rows = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

export function get(sql, params = []) {
  const rows = all(sql, params)
  return rows[0] || null
}

export function run(sql, params = []) {
  db.run(sql, params.map(clean))
  persist()
  const changes = db.getRowsModified()
  const res = db.exec('SELECT last_insert_rowid() AS id')
  const id = res.length ? res[0].values[0][0] : null
  return { id, changes }
}

function addColumnIfMissing(table, column, def) {
  const cols = all(`PRAGMA table_info(${table})`)
  if (!cols.some((c) => c.name === column)) {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`)
    persist()
    console.log(`[db] 已添加列 ${table}.${column}`)
  }
}
addColumnIfMissing('students', 'address', 'TEXT')
addColumnIfMissing('students', 'commute_min', 'INTEGER DEFAULT 0')

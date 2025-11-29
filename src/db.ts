import { Database } from 'bun:sqlite';
import type { Note, CreateNoteInput, UpdateNoteInput } from './types';

const DB_PATH = './data/posts.db';

// Initialize database
const db = new Database(DB_PATH, { create: true });

// Create tables
db.run(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text',
    x REAL NOT NULL DEFAULT 0,
    y REAL NOT NULL DEFAULT 0,
    width REAL DEFAULT 250,
    height REAL DEFAULT 200,
    z_index INTEGER DEFAULT 0,
    color TEXT DEFAULT '#ffffa5',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT
  )
`);

// Add z_index column if it doesn't exist (migration for existing databases)
try {
  db.run('ALTER TABLE notes ADD COLUMN z_index INTEGER DEFAULT 0');
} catch (e) {
  // Column already exists, ignore
}

// Prepared statements
const getAllNotesStmt = db.prepare('SELECT * FROM notes ORDER BY z_index ASC, created_at DESC');
const getNoteByIdStmt = db.prepare('SELECT * FROM notes WHERE id = ?');
const insertNoteStmt = db.prepare(`
  INSERT INTO notes (content, content_type, x, y, width, height, z_index, color, metadata)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const updateNoteStmt = db.prepare(`
  UPDATE notes SET
    content = COALESCE(?, content),
    content_type = COALESCE(?, content_type),
    x = COALESCE(?, x),
    y = COALESCE(?, y),
    width = COALESCE(?, width),
    height = COALESCE(?, height),
    z_index = COALESCE(?, z_index),
    color = COALESCE(?, color),
    metadata = COALESCE(?, metadata),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);
const deleteNoteStmt = db.prepare('DELETE FROM notes WHERE id = ?');
const getMaxZIndexStmt = db.prepare('SELECT MAX(z_index) as max_z FROM notes');
const getMinZIndexStmt = db.prepare('SELECT MIN(z_index) as min_z FROM notes');

export function getAllNotes(): Note[] {
  return getAllNotesStmt.all() as Note[];
}

export function getNoteById(id: number): Note | null {
  return getNoteByIdStmt.get(id) as Note | null;
}

export function createNote(input: CreateNoteInput): Note {
  // Get max z_index to place new note on top
  const maxZ = (getMaxZIndexStmt.get() as { max_z: number | null })?.max_z ?? 0;

  const {
    content,
    content_type = 'text',
    x = Math.random() * 500,
    y = Math.random() * 500,
    width = 250,
    height = 200,
    z_index = maxZ + 1,
    color = '#ffffa5',
    metadata = null,
  } = input;

  const result = insertNoteStmt.run(
    content,
    content_type,
    x,
    y,
    width,
    height,
    z_index,
    color,
    metadata ? JSON.stringify(metadata) : null
  );

  return getNoteById(Number(result.lastInsertRowid))!;
}

export function updateNote(id: number, input: UpdateNoteInput): Note | null {
  const existing = getNoteById(id);
  if (!existing) return null;

  updateNoteStmt.run(
    input.content ?? null,
    input.content_type ?? null,
    input.x ?? null,
    input.y ?? null,
    input.width ?? null,
    input.height ?? null,
    input.z_index ?? null,
    input.color ?? null,
    input.metadata ? JSON.stringify(input.metadata) : null,
    id
  );

  return getNoteById(id);
}

export function getMaxZIndex(): number {
  return (getMaxZIndexStmt.get() as { max_z: number | null })?.max_z ?? 0;
}

export function getMinZIndex(): number {
  return (getMinZIndexStmt.get() as { min_z: number | null })?.min_z ?? 0;
}

export function deleteNote(id: number): boolean {
  const result = deleteNoteStmt.run(id);
  return result.changes > 0;
}

export { db };

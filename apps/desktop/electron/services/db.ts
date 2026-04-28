import { app } from "electron";
import { join } from "path";
import { readFileSync, writeFileSync, existsSync } from "fs";
import initSqlJs, { type Database } from "sql.js";

export interface EventLogRow {
  id: string;
  type: string;
  payload: string;
  created_at: number;
}

export interface SoundFileRow {
  id: string;
  name: string;
  file_path: string;
  duration_ms: number | null;
  volume: number;
  created_at: number;
}

export interface SoundRuleRow {
  id: string;
  event_type: string;
  condition_json: string;
  sound_id: string;
  enabled: number;
  created_at: number;
}

export interface OverlayRuleRow {
  id: string;
  trigger_type: string;
  overlay_type: string;
  config_json: string;
  enabled: number;
  created_at: number;
}

export interface CommandRow {
  id: string;
  command: string;
  action_type: string;
  action_config_json: string;
  cooldown_seconds: number;
  enabled: number;
  created_at: number;
}

export interface DbService {
  getSettings(key: string): string | undefined;
  setSettings(key: string, value: string): void;
  logEvent(id: string, type: string, payload: string): void;
  getRecentEvents(limit: number): EventLogRow[];

  getSoundFiles(): SoundFileRow[];
  addSoundFile(row: SoundFileRow): void;
  deleteSoundFile(id: string): void;
  updateSoundFileVolume(id: string, volume: number): void;

  getSoundRules(): SoundRuleRow[];
  addSoundRule(row: SoundRuleRow): void;
  deleteSoundRule(id: string): void;
  toggleSoundRule(id: string, enabled: boolean): void;

  getOverlayRules(): OverlayRuleRow[];
  addOverlayRule(row: OverlayRuleRow): void;
  deleteOverlayRule(id: string): void;
  toggleOverlayRule(id: string, enabled: boolean): void;

  getCommands(): CommandRow[];
  addCommand(row: CommandRow): void;
  deleteCommand(id: string): void;
  updateCommand(row: CommandRow): void;
  toggleCommand(id: string, enabled: boolean): void;

  close(): void;
}

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS event_logs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sound_files (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  duration_ms INTEGER,
  volume REAL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sound_rules (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  condition_json TEXT NOT NULL,
  sound_id TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tts_rules (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  condition_json TEXT NOT NULL,
  config_json TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS overlay_rules (
  id TEXT PRIMARY KEY,
  trigger_type TEXT NOT NULL,
  overlay_type TEXT NOT NULL,
  config_json TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS commands (
  id TEXT PRIMARY KEY,
  command TEXT NOT NULL UNIQUE,
  action_type TEXT NOT NULL,
  action_config_json TEXT NOT NULL,
  cooldown_seconds INTEGER DEFAULT 0,
  enabled INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL
);
`;

class SqlJsDbService implements DbService {
  private db: Database;
  private dbPath: string;
  private dirty = false;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(db: Database, dbPath: string) {
    this.db = db;
    this.dbPath = dbPath;
    this.db.run(MIGRATION_SQL);
    this.flushTimer = setInterval(() => {
      if (this.dirty) this.persist();
    }, 10_000);
  }

  getSettings(key: string): string | undefined {
    const stmt = this.db.prepare("SELECT value FROM app_settings WHERE key = ?");
    stmt.bind([key]);
    if (stmt.step()) {
      const row = stmt.getAsObject() as { value: string };
      stmt.free();
      return row.value;
    }
    stmt.free();
    return undefined;
  }

  setSettings(key: string, value: string): void {
    this.db.run(
      "INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      [key, value, Date.now()]
    );
    this.dirty = true;
  }

  logEvent(id: string, type: string, payload: string): void {
    this.db.run(
      "INSERT OR IGNORE INTO event_logs (id, type, payload, created_at) VALUES (?, ?, ?, ?)",
      [id, type, payload, Date.now()]
    );
    this.db.run(
      "DELETE FROM event_logs WHERE id NOT IN (SELECT id FROM event_logs ORDER BY created_at DESC LIMIT 5000)"
    );
    this.dirty = true;
  }

  getRecentEvents(limit: number): EventLogRow[] {
    const stmt = this.db.prepare(
      "SELECT id, type, payload, created_at FROM event_logs ORDER BY created_at DESC LIMIT ?"
    );
    stmt.bind([limit]);
    const rows: EventLogRow[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as unknown as EventLogRow);
    }
    stmt.free();
    return rows;
  }

  // ── Sound Files ────────────────────────────────────────────────────────────

  getSoundFiles(): SoundFileRow[] {
    const stmt = this.db.prepare(
      "SELECT id, name, file_path, duration_ms, volume, created_at FROM sound_files ORDER BY created_at ASC"
    );
    const rows: SoundFileRow[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as unknown as SoundFileRow);
    }
    stmt.free();
    return rows;
  }

  addSoundFile(row: SoundFileRow): void {
    this.db.run(
      "INSERT OR REPLACE INTO sound_files (id, name, file_path, duration_ms, volume, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [row.id, row.name, row.file_path, row.duration_ms ?? null, row.volume, row.created_at]
    );
    this.dirty = true;
  }

  deleteSoundFile(id: string): void {
    this.db.run("DELETE FROM sound_files WHERE id = ?", [id]);
    this.db.run("DELETE FROM sound_rules WHERE sound_id = ?", [id]);
    this.dirty = true;
  }

  updateSoundFileVolume(id: string, volume: number): void {
    this.db.run("UPDATE sound_files SET volume = ? WHERE id = ?", [volume, id]);
    this.dirty = true;
  }

  // ── Sound Rules ────────────────────────────────────────────────────────────

  getSoundRules(): SoundRuleRow[] {
    const stmt = this.db.prepare(
      "SELECT id, event_type, condition_json, sound_id, enabled, created_at FROM sound_rules ORDER BY created_at ASC"
    );
    const rows: SoundRuleRow[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as unknown as SoundRuleRow);
    }
    stmt.free();
    return rows;
  }

  addSoundRule(row: SoundRuleRow): void {
    this.db.run(
      "INSERT OR REPLACE INTO sound_rules (id, event_type, condition_json, sound_id, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [row.id, row.event_type, row.condition_json, row.sound_id, row.enabled, row.created_at]
    );
    this.dirty = true;
  }

  deleteSoundRule(id: string): void {
    this.db.run("DELETE FROM sound_rules WHERE id = ?", [id]);
    this.dirty = true;
  }

  toggleSoundRule(id: string, enabled: boolean): void {
    this.db.run("UPDATE sound_rules SET enabled = ? WHERE id = ?", [enabled ? 1 : 0, id]);
    this.dirty = true;
  }

  // ── Overlay Rules ──────────────────────────────────────────────────────────

  getOverlayRules(): OverlayRuleRow[] {
    const stmt = this.db.prepare(
      "SELECT id, trigger_type, overlay_type, config_json, enabled, created_at FROM overlay_rules ORDER BY created_at ASC"
    );
    const rows: OverlayRuleRow[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as unknown as OverlayRuleRow);
    stmt.free();
    return rows;
  }

  addOverlayRule(row: OverlayRuleRow): void {
    this.db.run(
      "INSERT OR REPLACE INTO overlay_rules (id, trigger_type, overlay_type, config_json, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [row.id, row.trigger_type, row.overlay_type, row.config_json, row.enabled, row.created_at]
    );
    this.dirty = true;
  }

  deleteOverlayRule(id: string): void {
    this.db.run("DELETE FROM overlay_rules WHERE id = ?", [id]);
    this.dirty = true;
  }

  toggleOverlayRule(id: string, enabled: boolean): void {
    this.db.run("UPDATE overlay_rules SET enabled = ? WHERE id = ?", [enabled ? 1 : 0, id]);
    this.dirty = true;
  }

  // ── Commands ───────────────────────────────────────────────────────────────

  getCommands(): CommandRow[] {
    const stmt = this.db.prepare(
      "SELECT id, command, action_type, action_config_json, cooldown_seconds, enabled, created_at FROM commands ORDER BY created_at ASC"
    );
    const rows: CommandRow[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as unknown as CommandRow);
    stmt.free();
    return rows;
  }

  addCommand(row: CommandRow): void {
    this.db.run(
      "INSERT OR REPLACE INTO commands (id, command, action_type, action_config_json, cooldown_seconds, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [row.id, row.command, row.action_type, row.action_config_json, row.cooldown_seconds, row.enabled, row.created_at]
    );
    this.dirty = true;
  }

  deleteCommand(id: string): void {
    this.db.run("DELETE FROM commands WHERE id = ?", [id]);
    this.dirty = true;
  }

  updateCommand(row: CommandRow): void {
    this.db.run(
      "UPDATE commands SET command = ?, action_type = ?, action_config_json = ?, cooldown_seconds = ?, enabled = ? WHERE id = ?",
      [row.command, row.action_type, row.action_config_json, row.cooldown_seconds, row.enabled, row.id]
    );
    this.dirty = true;
  }

  toggleCommand(id: string, enabled: boolean): void {
    this.db.run("UPDATE commands SET enabled = ? WHERE id = ?", [enabled ? 1 : 0, id]);
    this.dirty = true;
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  persist(): void {
    try {
      const data = this.db.export();
      writeFileSync(this.dbPath, Buffer.from(data));
      this.dirty = false;
    } catch (err) {
      console.error("[db] Failed to persist:", err);
    }
  }

  close(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.dirty) this.persist();
    this.db.close();
  }
}

let instance: DbService | null = null;

export async function initDb(): Promise<void> {
  if (instance) return;

  const userData = app.getPath("userData");
  const dbPath = join(userData, "tikke.db");

  try {
    const wasmPath = app.isPackaged
      ? join(process.resourcesPath, "sql-wasm.wasm")
      : require.resolve("sql.js/dist/sql-wasm.wasm");

    const SQL = await initSqlJs({ locateFile: () => wasmPath });
    let db: Database;

    if (existsSync(dbPath)) {
      const fileBuffer = readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }

    instance = new SqlJsDbService(db, dbPath);
    console.log(`[db] SQLite ready at ${dbPath}`);
  } catch (err) {
    console.error("[db] Failed to initialize SQLite, falling back to in-memory:", err);
    instance = new InMemoryFallback();
  }
}

export function getDb(): DbService {
  if (!instance) {
    console.warn("[db] getDb() called before initDb(). Using temporary in-memory store.");
    instance = new InMemoryFallback();
  }
  return instance;
}

export function closeDb(): void {
  instance?.close();
  instance = null;
}

class InMemoryFallback implements DbService {
  private settings = new Map<string, string>();
  private events: EventLogRow[] = [];
  private soundFiles: SoundFileRow[] = [];
  private soundRules: SoundRuleRow[] = [];
  private overlayRules: OverlayRuleRow[] = [];
  private commands: CommandRow[] = [];

  getSettings(key: string): string | undefined { return this.settings.get(key); }
  setSettings(key: string, value: string): void { this.settings.set(key, value); }

  logEvent(id: string, type: string, payload: string): void {
    this.events.push({ id, type, payload, created_at: Date.now() });
    if (this.events.length > 5000) this.events.shift();
  }

  getRecentEvents(limit: number): EventLogRow[] {
    return [...this.events].reverse().slice(0, limit);
  }

  getSoundFiles(): SoundFileRow[] { return [...this.soundFiles]; }
  addSoundFile(row: SoundFileRow): void {
    this.soundFiles = this.soundFiles.filter((f) => f.id !== row.id);
    this.soundFiles.push(row);
  }
  deleteSoundFile(id: string): void {
    this.soundFiles = this.soundFiles.filter((f) => f.id !== id);
    this.soundRules = this.soundRules.filter((r) => r.sound_id !== id);
  }
  updateSoundFileVolume(id: string, volume: number): void {
    const f = this.soundFiles.find((x) => x.id === id);
    if (f) f.volume = volume;
  }

  getSoundRules(): SoundRuleRow[] { return [...this.soundRules]; }
  addSoundRule(row: SoundRuleRow): void {
    this.soundRules = this.soundRules.filter((r) => r.id !== row.id);
    this.soundRules.push(row);
  }
  deleteSoundRule(id: string): void { this.soundRules = this.soundRules.filter((r) => r.id !== id); }
  toggleSoundRule(id: string, enabled: boolean): void {
    const r = this.soundRules.find((x) => x.id === id);
    if (r) r.enabled = enabled ? 1 : 0;
  }

  getOverlayRules(): OverlayRuleRow[] { return [...this.overlayRules]; }
  addOverlayRule(row: OverlayRuleRow): void {
    this.overlayRules = this.overlayRules.filter((r) => r.id !== row.id);
    this.overlayRules.push(row);
  }
  deleteOverlayRule(id: string): void { this.overlayRules = this.overlayRules.filter((r) => r.id !== id); }
  toggleOverlayRule(id: string, enabled: boolean): void {
    const r = this.overlayRules.find((x) => x.id === id);
    if (r) r.enabled = enabled ? 1 : 0;
  }

  getCommands(): CommandRow[] { return [...this.commands]; }
  addCommand(row: CommandRow): void {
    this.commands = this.commands.filter((c) => c.id !== row.id);
    this.commands.push(row);
  }
  deleteCommand(id: string): void { this.commands = this.commands.filter((c) => c.id !== id); }
  updateCommand(row: CommandRow): void {
    const i = this.commands.findIndex((c) => c.id === row.id);
    if (i >= 0) this.commands[i] = row;
  }
  toggleCommand(id: string, enabled: boolean): void {
    const c = this.commands.find((x) => x.id === id);
    if (c) c.enabled = enabled ? 1 : 0;
  }

  close(): void {}
}

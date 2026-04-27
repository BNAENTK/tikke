// TODO: Replace with better-sqlite3 when build toolchain supports native module rebuild.
// On Windows, better-sqlite3 requires node-gyp + Visual Studio Build Tools.
// Current implementation uses an in-memory Map as a drop-in stub.

export interface DbRow {
  key: string;
  value: string;
  updated_at: number;
}

export interface DbService {
  getSettings(key: string): string | undefined;
  setSettings(key: string, value: string): void;
  logEvent(id: string, type: string, payload: string): void;
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

export function getMigrationSQL(): string {
  return MIGRATION_SQL;
}

class InMemoryDbService implements DbService {
  private settings = new Map<string, string>();
  private events: Array<{ id: string; type: string; payload: string; created_at: number }> = [];

  getSettings(key: string): string | undefined {
    return this.settings.get(key);
  }

  setSettings(key: string, value: string): void {
    this.settings.set(key, value);
  }

  logEvent(id: string, type: string, payload: string): void {
    this.events.push({ id, type, payload, created_at: Date.now() });
    if (this.events.length > 5000) {
      this.events.shift();
    }
  }

  close(): void {
    // no-op for in-memory implementation
  }
}

let instance: DbService | null = null;

export function getDb(): DbService {
  if (!instance) {
    instance = new InMemoryDbService();
    console.log("[db] Using in-memory stub. TODO: wire better-sqlite3.");
  }
  return instance;
}

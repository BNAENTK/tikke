import { existsSync } from "fs";
import { randomUUID } from "crypto";
import type { BrowserWindow } from "electron";
import type { TikkeEvent } from "@tikke/shared";
import { getDb, type SoundFileRow, type SoundRuleRow } from "./db";

export interface SoundFile {
  id: string;
  name: string;
  filePath: string;
  durationMs: number | null;
  volume: number;
  createdAt: number;
}

export interface SoundCondition {
  giftId?: number;
  giftName?: string;
  minDiamonds?: number;
  contains?: string;
}

export interface SoundRule {
  id: string;
  eventType: string;
  condition: SoundCondition;
  soundId: string;
  enabled: boolean;
  createdAt: number;
}

export interface SoundPlayPayload {
  ruleId: string;
  fileId: string;
  url: string;
  volume: number;
  name: string;
}

const ALLOWED_EXTENSIONS = new Set([".mp3", ".wav", ".ogg", ".m4a", ".flac"]);

function rowToFile(row: SoundFileRow): SoundFile {
  return {
    id: row.id,
    name: row.name,
    filePath: row.file_path,
    durationMs: row.duration_ms,
    volume: row.volume,
    createdAt: row.created_at,
  };
}

function rowToRule(row: SoundRuleRow): SoundRule {
  let condition: SoundCondition = {};
  try {
    condition = JSON.parse(row.condition_json) as SoundCondition;
  } catch {}
  return {
    id: row.id,
    eventType: row.event_type,
    condition,
    soundId: row.sound_id,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
  };
}

function isAllowedExtension(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return [...ALLOWED_EXTENSIONS].some((ext) => lower.endsWith(ext));
}

function matchCondition(event: TikkeEvent, cond: SoundCondition): boolean {
  const e = event as unknown as Record<string, unknown>;
  if (cond.giftId !== undefined && e["giftId"] !== cond.giftId) return false;
  if (cond.giftName !== undefined && e["giftName"] !== cond.giftName) return false;
  if (cond.minDiamonds !== undefined) {
    const d = typeof e["diamondCount"] === "number" ? e["diamondCount"] : 0;
    if (d < cond.minDiamonds) return false;
  }
  if (cond.contains !== undefined) {
    const msg = typeof e["message"] === "string" ? e["message"] : "";
    if (!msg.includes(cond.contains)) return false;
  }
  return true;
}

class SoundService {
  private files = new Map<string, SoundFile>();
  private rules: SoundRule[] = [];
  private win: BrowserWindow | null = null;

  init(win: BrowserWindow): void {
    this.win = win;
    this.reload();
  }

  reload(): void {
    const db = getDb();
    this.files = new Map(db.getSoundFiles().map((r) => [r.id, rowToFile(r)]));
    this.rules = db.getSoundRules().map(rowToRule);
    console.log(`[sound] Loaded ${this.files.size} files, ${this.rules.length} rules`);
  }

  handleEvent(event: TikkeEvent): void {
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      if (rule.eventType !== "*" && rule.eventType !== event.type) continue;
      if (!matchCondition(event, rule.condition)) continue;

      const file = this.files.get(rule.soundId);
      if (!file) continue;
      if (!existsSync(file.filePath)) {
        console.warn(`[sound] File not found: ${file.filePath}`);
        continue;
      }

      this.pushPlay(rule.id, file);
      break; // first matching rule wins per event
    }
  }

  playFile(id: string): void {
    const file = this.files.get(id);
    if (!file) return;
    if (!existsSync(file.filePath)) {
      console.warn(`[sound] Manual play: file not found: ${file.filePath}`);
      return;
    }
    this.pushPlay(randomUUID(), file);
  }

  stopAll(): void {
    this.win?.webContents.send("tikke:sound:stopAll");
  }

  private pushPlay(ruleId: string, file: SoundFile): void {
    const encoded = encodeURIComponent(file.filePath.replace(/\\/g, "/"));
    const url = `tikke-sound://${encoded}`;
    const payload: SoundPlayPayload = {
      ruleId,
      fileId: file.id,
      url,
      volume: file.volume,
      name: file.name,
    };
    this.win?.webContents.send("tikke:sound:play", payload);
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  getFiles(): SoundFile[] {
    return [...this.files.values()].sort((a, b) => a.createdAt - b.createdAt);
  }

  addFile(file: SoundFile): { error?: string } {
    if (!isAllowedExtension(file.filePath)) {
      return { error: "지원하지 않는 파일 형식입니다. (mp3, wav, ogg, m4a, flac)" };
    }
    if (!existsSync(file.filePath)) {
      return { error: "파일을 찾을 수 없습니다." };
    }
    getDb().addSoundFile({
      id: file.id,
      name: file.name,
      file_path: file.filePath,
      duration_ms: file.durationMs,
      volume: file.volume,
      created_at: file.createdAt,
    });
    this.files.set(file.id, file);
    return {};
  }

  removeFile(id: string): void {
    getDb().deleteSoundFile(id);
    this.files.delete(id);
    this.rules = this.rules.filter((r) => r.soundId !== id);
  }

  updateVolume(id: string, volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    getDb().updateSoundFileVolume(id, clamped);
    const file = this.files.get(id);
    if (file) file.volume = clamped;
  }

  getRules(): SoundRule[] {
    return [...this.rules];
  }

  addRule(rule: SoundRule): { error?: string } {
    if (!this.files.has(rule.soundId)) {
      return { error: "존재하지 않는 사운드 파일입니다." };
    }
    getDb().addSoundRule({
      id: rule.id,
      event_type: rule.eventType,
      condition_json: JSON.stringify(rule.condition),
      sound_id: rule.soundId,
      enabled: rule.enabled ? 1 : 0,
      created_at: rule.createdAt,
    });
    this.rules = this.rules.filter((r) => r.id !== rule.id);
    this.rules.push(rule);
    return {};
  }

  removeRule(id: string): void {
    getDb().deleteSoundRule(id);
    this.rules = this.rules.filter((r) => r.id !== id);
  }

  toggleRule(id: string, enabled: boolean): void {
    getDb().toggleSoundRule(id, enabled);
    const rule = this.rules.find((r) => r.id === id);
    if (rule) rule.enabled = enabled;
  }
}

export const soundService = new SoundService();

import type { TikkeEvent } from "@tikke/shared";
import { getDb, type CommandRow } from "./db";
import { overlayServer } from "./overlay-server";
import { soundService } from "./sound-service";
import type { BrowserWindow } from "electron";

export type CommandActionType = "sound" | "marquee" | "fireworks" | "overlay_clear" | "tts";

export interface CommandActionConfig {
  soundId?: string;
  text?: string;
  durationMs?: number;
  intensity?: number;
}

export interface Command {
  id: string;
  command: string;
  actionType: CommandActionType;
  actionConfig: CommandActionConfig;
  cooldownSeconds: number;
  enabled: boolean;
  createdAt: number;
}

export interface CommandLog {
  commandId: string;
  command: string;
  triggeredBy: string;
  timestamp: number;
}

function rowToCommand(row: CommandRow): Command {
  let actionConfig: CommandActionConfig = {};
  try { actionConfig = JSON.parse(row.action_config_json) as CommandActionConfig; } catch {}
  return {
    id: row.id,
    command: row.command,
    actionType: row.action_type as CommandActionType,
    actionConfig,
    cooldownSeconds: row.cooldown_seconds,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
  };
}

class CommandService {
  private commands: Command[] = [];
  private cooldowns = new Map<string, number>(); // commandId → last triggered timestamp
  private recentLogs: CommandLog[] = [];
  private win: BrowserWindow | null = null;

  init(win: BrowserWindow): void {
    this.win = win;
    this.reload();
  }

  reload(): void {
    this.commands = getDb().getCommands().map(rowToCommand);
    console.log(`[command] Loaded ${this.commands.length} commands`);
  }

  handleChatEvent(event: TikkeEvent): void {
    if (event.type !== "chat") return;
    const e = event as unknown as Record<string, unknown>;
    const message = String(e["message"] ?? "").trim();
    if (!message.startsWith("!")) return;

    const parts = message.split(/\s+/);
    const trigger = parts[0].toLowerCase();

    for (const cmd of this.commands) {
      if (!cmd.enabled) continue;
      if (cmd.command.toLowerCase() !== trigger) continue;

      // Check cooldown
      const last = this.cooldowns.get(cmd.id) ?? 0;
      if (cmd.cooldownSeconds > 0 && Date.now() - last < cmd.cooldownSeconds * 1000) {
        console.log(`[command] '${cmd.command}' on cooldown`);
        continue;
      }

      this.cooldowns.set(cmd.id, Date.now());

      const user = e["user"] as Record<string, unknown> | undefined;
      const nick = String(user?.["nickname"] ?? user?.["uniqueId"] ?? "");

      const log: CommandLog = { commandId: cmd.id, command: cmd.command, triggeredBy: nick, timestamp: Date.now() };
      this.recentLogs = [...this.recentLogs.slice(-49), log];
      this.win?.webContents.send("tikke:command:triggered", log);

      console.log(`[command] '${cmd.command}' triggered by @${nick}`);
      this.executeAction(cmd, nick);
      break;
    }
  }

  private executeAction(cmd: Command, triggeredBy: string): void {
    const cfg = cmd.actionConfig;
    switch (cmd.actionType) {
      case "sound":
        if (cfg.soundId) soundService.playFile(cfg.soundId);
        break;
      case "marquee": {
        const text = cfg.text ? cfg.text.replace(/\{nickname\}/g, triggeredBy) : `${triggeredBy}님이 ${cmd.command} 실행!`;
        overlayServer.broadcast({ type: "marquee", text, durationMs: cfg.durationMs ?? 5000 });
        break;
      }
      case "fireworks":
        overlayServer.broadcast({ type: "fireworks", intensity: cfg.intensity ?? 3, durationMs: cfg.durationMs ?? 3000 });
        break;
      case "overlay_clear":
        overlayServer.broadcast({ type: "clear" });
        break;
      case "tts":
        // Delegate to renderer TTS engine via IPC
        if (cfg.text) {
          const text = cfg.text.replace(/\{nickname\}/g, triggeredBy);
          this.win?.webContents.send("tikke:tts:speak", { text });
        }
        break;
    }
  }

  getRecentLogs(): CommandLog[] { return [...this.recentLogs]; }

  getCommands(): Command[] { return [...this.commands]; }

  addCommand(cmd: Command): { error?: string } {
    if (!cmd.command.trim()) return { error: "명령어를 입력하세요." };
    if (!cmd.command.startsWith("!")) return { error: "명령어는 !로 시작해야 합니다." };
    getDb().addCommand({
      id: cmd.id,
      command: cmd.command,
      action_type: cmd.actionType,
      action_config_json: JSON.stringify(cmd.actionConfig),
      cooldown_seconds: cmd.cooldownSeconds,
      enabled: cmd.enabled ? 1 : 0,
      created_at: cmd.createdAt,
    });
    this.commands = this.commands.filter((c) => c.id !== cmd.id);
    this.commands.push(cmd);
    return {};
  }

  updateCommand(cmd: Command): void {
    getDb().updateCommand({
      id: cmd.id,
      command: cmd.command,
      action_type: cmd.actionType,
      action_config_json: JSON.stringify(cmd.actionConfig),
      cooldown_seconds: cmd.cooldownSeconds,
      enabled: cmd.enabled ? 1 : 0,
      created_at: cmd.createdAt,
    });
    const i = this.commands.findIndex((c) => c.id === cmd.id);
    if (i >= 0) this.commands[i] = cmd;
  }

  removeCommand(id: string): void {
    getDb().deleteCommand(id);
    this.commands = this.commands.filter((c) => c.id !== id);
    this.cooldowns.delete(id);
  }

  toggleCommand(id: string, enabled: boolean): void {
    getDb().toggleCommand(id, enabled);
    const cmd = this.commands.find((c) => c.id === id);
    if (cmd) cmd.enabled = enabled;
  }
}

export const commandService = new CommandService();

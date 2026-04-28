import type { TikkeEvent } from "@tikke/shared";
import { getDb, type OverlayRuleRow } from "./db";
import { overlayServer } from "./overlay-server";

export interface OverlayCondition {
  giftId?: number;
  giftName?: string;
  minDiamonds?: number;
  contains?: string;
}

export interface OverlayRuleConfig {
  textTemplate?: string;
  durationMs?: number;
  intensity?: number;
}

export interface OverlayRule {
  id: string;
  triggerType: string;
  overlayType: "marquee" | "fireworks";
  condition: OverlayCondition;
  config: OverlayRuleConfig;
  enabled: boolean;
  createdAt: number;
}

// Template vars: {nickname}, {giftName}, {repeatCount}, {diamondCount}, {message}
function applyTemplate(template: string, event: TikkeEvent): string {
  const e = event as unknown as Record<string, unknown>;
  const user = e["user"] as Record<string, unknown> | undefined;
  return template
    .replace(/\{nickname\}/g, String(user?.["nickname"] ?? user?.["uniqueId"] ?? ""))
    .replace(/\{giftName\}/g, String(e["giftName"] ?? ""))
    .replace(/\{repeatCount\}/g, String(e["repeatCount"] ?? "1"))
    .replace(/\{diamondCount\}/g, String(e["diamondCount"] ?? "0"))
    .replace(/\{message\}/g, String(e["message"] ?? ""));
}

function matchCondition(event: TikkeEvent, cond: OverlayCondition): boolean {
  const e = event as unknown as Record<string, unknown>;
  if (cond.giftId !== undefined && e["giftId"] !== cond.giftId) return false;
  if (cond.giftName !== undefined && e["giftName"] !== cond.giftName) return false;
  if (cond.minDiamonds !== undefined) {
    const d = (Number(e["repeatCount"] ?? 1)) * (Number(e["diamondCount"] ?? 0));
    if (d < cond.minDiamonds) return false;
  }
  if (cond.contains !== undefined) {
    const msg = typeof e["message"] === "string" ? e["message"] : "";
    if (!msg.includes(cond.contains)) return false;
  }
  return true;
}

function rowToRule(row: OverlayRuleRow): OverlayRule {
  let condition: OverlayCondition = {};
  let config: OverlayRuleConfig = {};
  try { condition = JSON.parse(row.config_json) as OverlayCondition; } catch {}
  // config_json actually holds both condition and config combined
  try {
    const parsed = JSON.parse(row.config_json) as OverlayCondition & OverlayRuleConfig;
    condition = { giftId: parsed.giftId, giftName: parsed.giftName, minDiamonds: parsed.minDiamonds, contains: parsed.contains };
    config = { textTemplate: parsed.textTemplate, durationMs: parsed.durationMs, intensity: parsed.intensity };
  } catch {}
  return {
    id: row.id,
    triggerType: row.trigger_type,
    overlayType: row.overlay_type as "marquee" | "fireworks",
    condition,
    config,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
  };
}

class OverlayRulesService {
  private rules: OverlayRule[] = [];

  reload(): void {
    this.rules = getDb().getOverlayRules().map(rowToRule);
    console.log(`[overlay-rules] Loaded ${this.rules.length} rules`);
  }

  handleEvent(event: TikkeEvent): void {
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      if (rule.triggerType !== "*" && rule.triggerType !== event.type) continue;
      if (!matchCondition(event, rule.condition)) continue;

      if (rule.overlayType === "marquee") {
        const text = rule.config.textTemplate
          ? applyTemplate(rule.config.textTemplate, event)
          : this.defaultText(event);
        overlayServer.broadcast({ type: "marquee", text, durationMs: rule.config.durationMs ?? 6000 });
      } else if (rule.overlayType === "fireworks") {
        overlayServer.broadcast({ type: "fireworks", intensity: rule.config.intensity ?? 3, durationMs: rule.config.durationMs ?? 3000 });
      }
    }
  }

  private defaultText(event: TikkeEvent): string {
    const e = event as unknown as Record<string, unknown>;
    const user = e["user"] as Record<string, unknown> | undefined;
    const nick = String(user?.["nickname"] ?? user?.["uniqueId"] ?? "");
    switch (event.type) {
      case "gift": return `${nick}님이 ${String(e["giftName"] ?? "선물")} 보내셨습니다!`;
      case "follow": return `${nick}님이 팔로우했습니다!`;
      case "subscribe": return `${nick}님이 구독했습니다!`;
      default: return `${nick}님 이벤트 발생`;
    }
  }

  getRules(): OverlayRule[] { return [...this.rules]; }

  addRule(rule: OverlayRule): void {
    const configJson = JSON.stringify({ ...rule.condition, ...rule.config });
    getDb().addOverlayRule({
      id: rule.id,
      trigger_type: rule.triggerType,
      overlay_type: rule.overlayType,
      config_json: configJson,
      enabled: rule.enabled ? 1 : 0,
      created_at: rule.createdAt,
    });
    this.rules = this.rules.filter((r) => r.id !== rule.id);
    this.rules.push(rule);
  }

  removeRule(id: string): void {
    getDb().deleteOverlayRule(id);
    this.rules = this.rules.filter((r) => r.id !== id);
  }

  toggleRule(id: string, enabled: boolean): void {
    getDb().toggleOverlayRule(id, enabled);
    const rule = this.rules.find((r) => r.id === id);
    if (rule) rule.enabled = enabled;
  }
}

export const overlayRulesService = new OverlayRulesService();

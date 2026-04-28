import type { TikkeEvent } from "@tikke/shared";

// Phase 7+ 에서 sound/TTS/overlay 액션으로 확장
export type RuleActionType = "sound" | "tts" | "overlay" | "webhook";

export interface RuleCondition {
  field: string;
  operator: "eq" | "gte" | "lte" | "contains";
  value: unknown;
}

export interface Rule {
  id: string;
  eventType: string;
  conditions: RuleCondition[];
  actions: RuleActionType[];
  enabled: boolean;
}

type ActionHandler = (event: TikkeEvent, rule: Rule) => void;

class RuleEngine {
  private rules: Rule[] = [];
  private actionHandlers = new Map<RuleActionType, ActionHandler>();

  loadRules(rules: Rule[]): void {
    this.rules = rules;
  }

  registerAction(type: RuleActionType, handler: ActionHandler): void {
    this.actionHandlers.set(type, handler);
  }

  evaluate(event: TikkeEvent): void {
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      if (rule.eventType !== "*" && rule.eventType !== event.type) continue;
      if (!this.matchConditions(event, rule.conditions)) continue;

      for (const actionType of rule.actions) {
        const handler = this.actionHandlers.get(actionType);
        if (handler) {
          try {
            handler(event, rule);
          } catch (err) {
            console.error(`[rule-engine] action ${actionType} error:`, err);
          }
        }
      }
    }
  }

  private matchConditions(event: TikkeEvent, conditions: RuleCondition[]): boolean {
    const flat = event as unknown as Record<string, unknown>;
    for (const cond of conditions) {
      const actual = flat[cond.field];
      switch (cond.operator) {
        case "eq":
          if (actual !== cond.value) return false;
          break;
        case "gte":
          if (typeof actual !== "number" || actual < (cond.value as number)) return false;
          break;
        case "lte":
          if (typeof actual !== "number" || actual > (cond.value as number)) return false;
          break;
        case "contains":
          if (typeof actual !== "string" || !actual.includes(String(cond.value))) return false;
          break;
      }
    }
    return true;
  }
}

export const ruleEngine = new RuleEngine();

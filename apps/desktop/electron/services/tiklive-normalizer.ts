import { randomUUID } from "crypto";
import type { TikkeEvent, TikkeUser } from "@tikke/shared";

function makeUser(data: Record<string, unknown>): TikkeUser | undefined {
  if (!data || typeof data !== "object") return undefined;
  return {
    userId: data.userId as string | undefined,
    uniqueId: data.uniqueId as string | undefined,
    nickname: data.nickname as string | undefined,
    profilePictureUrl: data.profilePictureUrl as string | undefined,
  };
}

export function normalizeEvent(type: string, data: unknown): TikkeEvent | null {
  const raw = (data ?? {}) as Record<string, unknown>;
  const base = {
    id: randomUUID(),
    timestamp: Date.now(),
    user: makeUser(raw),
    raw: data,
  };

  switch (type) {
    case "chat":
      return { ...base, type: "chat", message: String(raw.comment ?? "") };

    case "gift":
      return {
        ...base,
        type: "gift",
        giftId: raw.giftId as number | undefined,
        giftName: raw.giftName as string | undefined,
        repeatCount: raw.repeatCount as number | undefined,
        diamondCount: raw.diamondCount as number | undefined,
        isStreakEnd: (raw.repeatEnd ?? raw.isStreakEnd) as boolean | undefined,
      };

    case "like":
      return {
        ...base,
        type: "like",
        likeCount: raw.likeCount as number | undefined,
        totalLikeCount: raw.totalLikeCount as number | undefined,
      };

    case "member":
      return { ...base, type: "member" };

    case "follow":
      return { ...base, type: "follow" };

    case "share":
      return { ...base, type: "share" };

    case "subscribe":
      return { ...base, type: "subscribe" };

    case "roomUser":
      return { ...base, type: "roomUser" };

    case "streamEnd":
      return { ...base, type: "streamEnd" };

    default:
      return null;
  }
}

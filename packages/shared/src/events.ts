export type TikkeEventType =
  | "chat"
  | "gift"
  | "like"
  | "member"
  | "follow"
  | "share"
  | "subscribe"
  | "emote"
  | "roomUser"
  | "streamEnd"
  | "command"
  | "system";

export interface TikkeUser {
  userId?: string;
  uniqueId?: string;
  nickname?: string;
  profilePictureUrl?: string;
}

export interface TikkeEventBase {
  id: string;
  type: TikkeEventType;
  timestamp: number;
  user?: TikkeUser;
  raw?: unknown;
}

export interface ChatEvent extends TikkeEventBase {
  type: "chat";
  message: string;
}

export interface GiftEvent extends TikkeEventBase {
  type: "gift";
  giftId?: number;
  giftName?: string;
  repeatCount?: number;
  diamondCount?: number;
  isStreakEnd?: boolean;
}

export interface LikeEvent extends TikkeEventBase {
  type: "like";
  likeCount?: number;
  totalLikeCount?: number;
}

export interface MemberEvent extends TikkeEventBase {
  type: "member";
}

export interface FollowEvent extends TikkeEventBase {
  type: "follow";
}

export interface ShareEvent extends TikkeEventBase {
  type: "share";
}

export interface SubscribeEvent extends TikkeEventBase {
  type: "subscribe";
}

export interface SystemEvent extends TikkeEventBase {
  type: "system";
  message: string;
}

export type TikkeEvent =
  | ChatEvent
  | GiftEvent
  | LikeEvent
  | MemberEvent
  | FollowEvent
  | ShareEvent
  | SubscribeEvent
  | SystemEvent
  | TikkeEventBase;

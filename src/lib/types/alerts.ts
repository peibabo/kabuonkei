export type AlertMarket = "us" | "jp";
export type AlertState = "cold" | "neutral" | "hot";
export type AlertKind = "cold" | "hot";
export type AlertVariant = "us_cold" | "us_hot" | "jp_cold" | "jp_hot";

export const ALERT_VARIANTS: readonly AlertVariant[] = [
  "us_cold",
  "us_hot",
  "jp_cold",
  "jp_hot",
] as const;

export interface AlertSubscriber {
  uuid: string;
  email: string;
  emailHash: string;
  variants: AlertVariant[];
  verified: boolean;
  createdAt: string;
  verifiedAt: string | null;
  unsubscribeToken: string;
}

export interface AlertTokenPayload {
  uuid: string;
  action: "verify" | "unsubscribe";
  exp: number | null;
}

export interface AlertFireDecision {
  fire: boolean;
  kind: AlertKind | null;
}

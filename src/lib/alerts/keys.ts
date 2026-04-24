import type { AlertMarket, AlertVariant } from "@/lib/types";

export const KEY_PREFIX = "alerts";

export const subscriberKey = (uuid: string) => `${KEY_PREFIX}:sub:${uuid}`;

export const emailIndexKey = (emailHashHex: string) =>
  `${KEY_PREFIX}:email:${emailHashHex}`;

export const verifyPendingKey = (tokenHashHex: string) =>
  `${KEY_PREFIX}:verify-pending:${tokenHashHex}`;

export const lastStateKey = (market: AlertMarket) =>
  `${KEY_PREFIX}:last-state:${market}-fg`;

export const variantIndexKey = (v: AlertVariant) =>
  `${KEY_PREFIX}:index:${v}`;

export const rateIpKey = (ip: string) => `${KEY_PREFIX}:rate:ip:${ip}`;

export const rateEmailKey = (hash: string) =>
  `${KEY_PREFIX}:rate:email:${hash}`;

export const failuresKey = (dateJst: string, v: AlertVariant) =>
  `${KEY_PREFIX}:failures:${dateJst}:${v}`;

export const blocklistKey = (hash: string) =>
  `${KEY_PREFIX}:blocklist:${hash}`;

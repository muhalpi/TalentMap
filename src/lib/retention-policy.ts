export const RETENTION_DELETE_GRACE_DAYS = 30;

export function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function getContractRetentionUntil(contractEndsAt: Date) {
  return new Date(contractEndsAt);
}

export function getRetentionGraceEndsAt(contractEndsAt: Date) {
  return addUtcDays(contractEndsAt, RETENTION_DELETE_GRACE_DAYS);
}

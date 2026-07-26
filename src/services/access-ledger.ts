export function mergeAccessLedgerRows<T extends { id: string }>(
  liveRows: T[],
  recentRows: T[],
): T[] {
  const seen = new Set<string>();

  return [...liveRows, ...recentRows].filter((row) => {
    if (seen.has(row.id)) {
      return false;
    }

    seen.add(row.id);
    return true;
  });
}

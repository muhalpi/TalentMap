export function assertClientId(clientId: string | null | undefined) {
  if (!clientId) {
    throw new Error("A client_id is required for tenant-scoped data access.");
  }

  return clientId;
}

export function retentionUntilContractEnd(contractEndsAt: Date) {
  return new Date(contractEndsAt);
}

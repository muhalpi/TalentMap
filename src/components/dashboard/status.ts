export function formatDate(value: string | null) {
  if (!value) {
    return "No expiry";
  }

  return value.slice(0, 10);
}

export function tokenStatusClass(status: string) {
  if (status === "completed") {
    return "bg-accent-muted text-accent";
  }

  if (status === "in_progress") {
    return "bg-warning/15 text-warning";
  }

  if (status === "expired") {
    return "bg-danger/10 text-danger";
  }

  return "bg-surface-muted text-foreground/70";
}

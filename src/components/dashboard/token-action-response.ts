interface ActionErrorBody {
  error?: unknown;
}

export async function getTokenActionError(
  response: Response,
  fallback: string,
) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await response.json().catch(() => null)) as ActionErrorBody | null;

    if (typeof body?.error === "string" && body.error.trim()) {
      return body.error;
    }
  } else {
    await response.text().catch(() => "");
  }

  if (response.status === 404) {
    return "The assessment access service is temporarily unavailable. Refresh the page and try again.";
  }

  return `${fallback} (HTTP ${response.status})`;
}

export function getTokenActionNetworkError(action: "rotate" | "cancel") {
  return `Unable to ${action} assessment access because the service could not be reached. Check your connection and try again.`;
}

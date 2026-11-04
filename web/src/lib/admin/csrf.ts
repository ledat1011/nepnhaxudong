import { errorFromResponse, networkError } from "./errors";

export const CSRF_HEADER = "X-XSRF-TOKEN";

let cached: Promise<string> | null = null;

async function loadToken(): Promise<string> {
  let response: Response;
  try {
    response = await fetch("/api/auth/csrf", {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw networkError();
  }
  if (!response.ok) throw await errorFromResponse(response);
  const body = (await response.json()) as { token: string };
  return body.token;
}

/** The CSRF token. It is fetched once and kept in memory; parallel callers share one request. */
export function getCsrfToken(): Promise<string> {
  if (cached === null) {
    const pending = loadToken();
    cached = pending;
    // A failed fetch must not stay cached, or every later call would fail the same way.
    pending.catch(() => {
      if (cached === pending) cached = null;
    });
  }
  return cached;
}

/** Forget the token. Call it after sign-in, sign-out and a password change: the API issues a new one. */
export function resetCsrfToken(): void {
  cached = null;
}

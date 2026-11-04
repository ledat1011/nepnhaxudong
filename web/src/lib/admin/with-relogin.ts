import { isSessionExpired } from "./errors";

/**
 * Runs `fn`. If the session has expired, waits for the user to sign in again and runs `fn` once more.
 * If `requireReLogin()` rejects, that rejection is thrown. A second session-expired error is thrown as it is, so there is no loop.
 */
export async function withReLogin<T>(fn: () => Promise<T>, requireReLogin: () => Promise<void>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (!isSessionExpired(error)) throw error;
    await requireReLogin();
    return fn();
  }
}

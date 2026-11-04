"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AdminApiError, GENERIC_ERROR_MESSAGE, isSessionExpired } from "./errors";
import { useAdminSession } from "./session";

type Options = {
  /** The toast after a success. `null` shows none. */
  successMessage?: string | null;
};

function asApiError(error: unknown): AdminApiError {
  return error instanceof AdminApiError ? error : new AdminApiError(0, GENERIC_ERROR_MESSAGE);
}

/**
 * Runs a save (or any write) once at a time.
 * - A second `save()` while the first runs does nothing.
 * - On a session-expired error it opens the re-login dialog and runs the action again, once.
 *   If the user does not sign in again, `error` is the reason and the form keeps its data.
 */
export function useSave<T>(action: () => Promise<T>, options: Options = {}) {
  const { requireReLogin } = useAdminSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const running = useRef(false);
  const { successMessage } = options;
  const latest = useRef({ action, successMessage });
  // The newest action and message are used by a save that starts after the next render.
  useEffect(() => {
    latest.current = { action, successMessage };
  });

  const save = useCallback(async (): Promise<T | undefined> => {
    if (running.current) return undefined;
    running.current = true;
    setPending(true);
    setError(null);
    try {
      let result: T;
      try {
        result = await latest.current.action();
      } catch (first) {
        if (!isSessionExpired(first)) throw first;
        // Rejects when the user cancels or signs in as someone else. That error says why, so it is shown as it is.
        await requireReLogin();
        // One retry only. A second session-expired error is shown instead of opening the dialog again.
        result = await latest.current.action();
      }
      const message = latest.current.successMessage === undefined ? "Đã lưu." : latest.current.successMessage;
      if (message !== null) toast.success(message);
      return result;
    } catch (failure) {
      setError(asApiError(failure));
      return undefined;
    } finally {
      running.current = false;
      setPending(false);
    }
  }, [requireReLogin]);

  return { save, pending, error };
}

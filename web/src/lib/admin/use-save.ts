"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AdminApiError, GENERIC_ERROR_MESSAGE } from "./errors";
import { useAdminSession } from "./session";
import { withReLogin } from "./with-relogin";

type Options = {
  /** The toast after a success. `null` shows none. */
  successMessage?: string | null;
  /** Called with the error of a failed save (after the re-login step), for example to show it under a field. */
  onError?: (error: AdminApiError) => void;
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
  const { successMessage, onError } = options;
  const latest = useRef({ action, successMessage, onError });
  // useLayoutEffect runs right after the DOM commit and before the browser can deliver the next click or
  // key event, so a save() from an event handler always sees the newest action. A plain useEffect runs later.
  // (Assigning during render would also work, but React may render without committing, which would leave a stale action.)
  useLayoutEffect(() => {
    latest.current = { action, successMessage, onError };
  });

  const save = useCallback(async (): Promise<T | undefined> => {
    if (running.current) return undefined;
    running.current = true;
    setPending(true);
    setError(null);
    try {
      // Rejects when the user cancels or signs in as someone else. That error says why, so it is shown as it is.
      const result = await withReLogin(() => latest.current.action(), requireReLogin);
      const message = latest.current.successMessage === undefined ? "Đã lưu." : latest.current.successMessage;
      if (message !== null) toast.success(message);
      return result;
    } catch (failure) {
      const error = asApiError(failure);
      setError(error);
      latest.current.onError?.(error);
      return undefined;
    } finally {
      running.current = false;
      setPending(false);
    }
  }, [requireReLogin]);

  const reset = useCallback(() => setError(null), []);

  return { save, pending, error, reset };
}

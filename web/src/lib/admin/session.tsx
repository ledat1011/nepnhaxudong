"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ReLoginDialog } from "@/components/admin/shell/ReLoginDialog";
import { adminFetch } from "./api";
import { resetCsrfToken } from "./csrf";
import { AdminApiError } from "./errors";
import { ADMIN_ROUTES } from "./routes";
import type { UserResponse } from "./types";

export type SessionStatus = "loading" | "signed-out" | "must-change-password" | "ready";

export type AdminSession = {
  status: SessionStatus;
  user: UserResponse | null;
  refresh(): Promise<void>;
  signOut(): Promise<void>;
  /** Opens the re-login dialog. Resolves after a sign-in; rejects with a 401 `AdminApiError` when the user cancels. */
  requireReLogin(): Promise<void>;
};

type State = { status: SessionStatus; user: UserResponse | null };

type PendingReLogin = {
  promise: Promise<void>;
  resolve(): void;
  reject(error: Error): void;
};

const CANCELLED_MESSAGE = "Bạn chưa đăng nhập lại.";

const SessionContext = createContext<AdminSession | null>(null);

function stateOf(user: UserResponse | null): State {
  if (user === null) return { status: "signed-out", user: null };
  return { status: user.mustChangePassword ? "must-change-password" : "ready", user };
}

async function loadUser(): Promise<UserResponse | null> {
  try {
    return await adminFetch<UserResponse>("/auth/me");
  } catch {
    // Any failure, not only 401, leaves the user at the login page: nothing private is shown without a session.
    return null;
  }
}

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading", user: null });
  const [reLoginOpen, setReLoginOpen] = useState(false);
  // One pending re-login for all callers: two failed saves at the same time share one dialog.
  const pending = useRef<PendingReLogin | null>(null);

  const refresh = useCallback(async () => {
    setState(stateOf(await loadUser()));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadUser().then((user) => {
      if (!cancelled) setState(stateOf(user));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await adminFetch("/auth/logout", { method: "POST" });
    } catch {
      // The session may already be gone on the server. The local state is cleared in every case.
    }
    resetCsrfToken();
    setState(stateOf(null));
    router.replace(ADMIN_ROUTES.login);
  }, [router]);

  const requireReLogin = useCallback((): Promise<void> => {
    if (pending.current) return pending.current.promise;
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    pending.current = { promise, resolve, reject };
    setReLoginOpen(true);
    return promise;
  }, []);

  const finishReLogin = useCallback((user: UserResponse | null) => {
    const current = pending.current;
    if (!current) return;
    pending.current = null;
    setReLoginOpen(false);
    if (user) {
      setState(stateOf(user));
      current.resolve();
    } else {
      current.reject(new AdminApiError(401, CANCELLED_MESSAGE));
    }
  }, []);

  const value = useMemo<AdminSession>(
    () => ({ status: state.status, user: state.user, refresh, signOut, requireReLogin }),
    [state, refresh, signOut, requireReLogin],
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
      <ReLoginDialog
        open={reLoginOpen}
        defaultEmail={state.user?.email}
        onSuccess={finishReLogin}
        onCancel={() => finishReLogin(null)}
      />
    </SessionContext.Provider>
  );
}

export function useAdminSession(): AdminSession {
  const session = useContext(SessionContext);
  if (session === null) throw new Error("useAdminSession must be used inside AdminSessionProvider");
  return session;
}

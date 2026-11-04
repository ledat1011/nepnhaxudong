"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ReLoginDialog } from "@/components/admin/shell/ReLoginDialog";
import { adminFetch } from "./api";
import { resetCsrfToken } from "./csrf";
import { AdminApiError } from "./errors";
import { ADMIN_ROUTES } from "./routes";
import { allowDraftWrites, clearAllDrafts } from "./story-draft";
import type { UserResponse } from "./types";

/** `error`: the server could not be reached or failed, so it is not known whether the user is signed in. */
export type SessionStatus = "loading" | "signed-out" | "must-change-password" | "ready" | "error";

export type AdminSession = {
  status: SessionStatus;
  user: UserResponse | null;
  /** True after the user chose "Đăng xuất", so the login page needs no `next` address. */
  signedOutOnPurpose: boolean;
  refresh(): Promise<void>;
  signOut(): Promise<void>;
  /**
   * Opens the re-login dialog. Resolves after a sign-in; rejects with a 401 `AdminApiError` when the user cancels.
   * Contract: the function identity is stable for the provider's lifetime (a useCallback with [] deps).
   * Hooks such as useMediaLibrary and useSave list it in effect/callback dependencies and rely on that.
   */
  requireReLogin(): Promise<void>;
};

type State = { status: SessionStatus; user: UserResponse | null; onPurpose: boolean };

type PendingReLogin = {
  promise: Promise<void>;
  resolve(): void;
  reject(error: Error): void;
};

const CANCELLED_MESSAGE = "Bạn chưa đăng nhập lại.";
const OTHER_ACCOUNT_MESSAGE = "Hãy đăng nhập bằng đúng tài khoản đang dùng.";
const MUST_CHANGE_PASSWORD_MESSAGE = "Bạn cần đổi mật khẩu trước. Hãy lưu nội dung ra chỗ khác rồi tải lại trang.";

const SessionContext = createContext<AdminSession | null>(null);

const ERROR_STATE: State = { status: "error", user: null, onPurpose: false };

function stateOf(user: UserResponse | null): State {
  if (user === null) return { status: "signed-out", user: null, onPurpose: false };
  return { status: user.mustChangePassword ? "must-change-password" : "ready", user, onPurpose: false };
}

/** The user, `null` for a 401 (nobody is signed in), or the error state when the answer is unknown. */
async function loadState(): Promise<State> {
  try {
    return stateOf(await adminFetch<UserResponse>("/auth/me"));
  } catch (error) {
    if (error instanceof AdminApiError && error.status === 401) return stateOf(null);
    // A network failure or a 5xx says nothing about the session. Do not send the user to the login page.
    return ERROR_STATE;
  }
}

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading", user: null, onPurpose: false });
  const [reLoginOpen, setReLoginOpen] = useState(false);
  // One pending re-login for all callers: two failed saves at the same time share one dialog.
  const pending = useRef<PendingReLogin | null>(null);

  const refresh = useCallback(async () => {
    setState(await loadState());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadState().then((next) => {
      if (!cancelled) setState(next);
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
    // The phone may be shared: the next person must not see, or restore, a story this user was writing.
    clearAllDrafts();
    setState({ status: "signed-out", user: null, onPurpose: true });
    router.replace(ADMIN_ROUTES.login);
  }, [router]);

  // Drafts are written again once someone is signed in (they were blocked by a sign-out).
  useEffect(() => {
    if (state.status === "ready") allowDraftWrites();
  }, [state.status]);

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

  const currentUserId = state.user?.id;
  const finishReLogin = useCallback(
    (user: UserResponse | null) => {
      const current = pending.current;
      if (!current) return;
      pending.current = null;
      setReLoginOpen(false);
      if (user === null) {
        current.reject(new AdminApiError(401, CANCELLED_MESSAGE));
      } else if (currentUserId !== undefined && user.id !== currentUserId) {
        // A queued save must not run as another family member. End the other session and keep the old state.
        void adminFetch("/auth/logout", { method: "POST" })
          .catch(() => undefined)
          .finally(resetCsrfToken);
        current.reject(new AdminApiError(401, OTHER_ACCOUNT_MESSAGE));
      } else if (user.mustChangePassword) {
        // Going to the change-password page would drop the form the user is editing.
        current.reject(new AdminApiError(401, MUST_CHANGE_PASSWORD_MESSAGE));
      } else {
        setState(stateOf(user));
        current.resolve();
      }
    },
    [currentUserId],
  );

  const value = useMemo<AdminSession>(
    () => ({
      status: state.status,
      user: state.user,
      signedOutOnPurpose: state.onPurpose,
      refresh,
      signOut,
      requireReLogin,
    }),
    [state, refresh, signOut, requireReLogin],
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
      <ReLoginDialog
        open={reLoginOpen}
        lockedEmail={state.user?.email}
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

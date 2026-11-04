"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { Button } from "@/components/admin/ui/button";
import { adminFetch } from "@/lib/admin/api";
import { AdminApiError, GENERIC_ERROR_MESSAGE } from "@/lib/admin/errors";
import { useAdminSession } from "@/lib/admin/session";
import { withReLogin } from "@/lib/admin/with-relogin";

type Props<T> = {
  /** The setting key: the last part of `/admin/settings/{name}`. */
  name: "contact" | "social" | "brand";
  children(value: T): ReactNode;
};

/** Reads one setting, shows loading and error states, and gives the loaded value to `children`. */
export function SettingLoader<T>({ name, children }: Props<T>) {
  const { requireReLogin } = useAdminSession();
  const [value, setValue] = useState<{ value: T } | null>(null);
  const [error, setError] = useState<AdminApiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    withReLogin(() => adminFetch<T>(`/admin/settings/${name}`), requireReLogin).then(
      (loaded) => {
        if (!cancelled) setValue({ value: loaded });
      },
      (failure: unknown) => {
        if (!cancelled) setError(failure instanceof AdminApiError ? failure : new AdminApiError(0, GENERIC_ERROR_MESSAGE));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [name, attempt, requireReLogin]);

  if (value !== null) return <>{children(value.value)}</>;
  if (error !== null) {
    return (
      <div className="flex flex-col gap-3">
        <ProblemMessage error={error} />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setError(null);
            setAttempt((n) => n + 1);
          }}
        >
          Thử lại
        </Button>
      </div>
    );
  }
  return (
    <p role="status" className="text-center text-muted-foreground">
      Đang tải…
    </p>
  );
}

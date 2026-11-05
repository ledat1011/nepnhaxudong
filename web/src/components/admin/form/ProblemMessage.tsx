import type { AdminApiError } from "@/lib/admin/errors";

/**
 * The text of an API error, as the API wrote it, or another message (for example the part of a failed save
 * that names no field). Renders nothing without one.
 */
export function ProblemMessage({ error = null, message = null }: { error?: AdminApiError | null; message?: string | null }) {
  const text = message ?? error?.detail ?? null;
  if (text === null || text === "") return null;
  return (
    <p role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
      {text}
    </p>
  );
}

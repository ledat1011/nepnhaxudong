import type { AdminApiError } from "@/lib/admin/errors";

/** The text of an API error, as the API wrote it. Renders nothing without an error. */
export function ProblemMessage({ error }: { error: AdminApiError | null }) {
  if (error === null) return null;
  return (
    <p role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
      {error.detail}
    </p>
  );
}

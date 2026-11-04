"use client";

import { useState } from "react";
import { Button } from "@/components/admin/ui/button";

/** Shown when the session could not be read because the server is unreachable or failed. */
export function SessionErrorScreen({ onRetry }: { onRetry(): Promise<void> }) {
  const [pending, setPending] = useState(false);

  async function retry() {
    setPending(true);
    try {
      await onRetry();
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 p-4">
      <p role="alert" className="text-lg font-bold">
        Không kết nối được máy chủ.
      </p>
      <Button type="button" onClick={() => void retry()} disabled={pending}>
        Thử lại
      </Button>
    </main>
  );
}

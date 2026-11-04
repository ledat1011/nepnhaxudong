"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { StoryList } from "@/components/admin/story/StoryList";
import { Button } from "@/components/admin/ui/button";
import { adminFetch } from "@/lib/admin/api";
import { AdminApiError, GENERIC_ERROR_MESSAGE } from "@/lib/admin/errors";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import { useAdminSession } from "@/lib/admin/session";
import type { StoryAdminDto } from "@/lib/admin/types";
import { withReLogin } from "@/lib/admin/with-relogin";

/** The list of stories. Tap one to edit it. */
export default function StoriesPage() {
  const { requireReLogin } = useAdminSession();
  const [stories, setStories] = useState<StoryAdminDto[] | null>(null);
  const [error, setError] = useState<AdminApiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    withReLogin(() => adminFetch<StoryAdminDto[]>("/admin/stories"), requireReLogin).then(
      (value) => {
        if (!cancelled) setStories(value);
      },
      (failure: unknown) => {
        if (!cancelled)
          setError(failure instanceof AdminApiError ? failure : new AdminApiError(0, GENERIC_ERROR_MESSAGE));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt, requireReLogin]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <Button asChild>
        <Link href={`${ADMIN_ROUTES.stories}/moi`}>Viết bài mới</Link>
      </Button>
      <ProblemMessage error={error} />
      {error !== null ? (
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
      ) : null}
      {stories === null && error === null ? (
        <p role="status" className="text-center text-muted-foreground">
          Đang tải…
        </p>
      ) : null}
      {stories !== null ? <StoryList stories={stories} /> : null}
    </div>
  );
}

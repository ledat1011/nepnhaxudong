"use client";

import { use, useEffect, useState } from "react";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { StoryForm } from "@/components/admin/story/StoryForm";
import { Button } from "@/components/admin/ui/button";
import { adminFetch } from "@/lib/admin/api";
import { AdminApiError, GENERIC_ERROR_MESSAGE } from "@/lib/admin/errors";
import { useAdminSession } from "@/lib/admin/session";
import type { StoryAdminDto } from "@/lib/admin/types";
import { withReLogin } from "@/lib/admin/with-relogin";

/** The id "moi" means a new story. */
const NEW_STORY_ID = "moi";

export default function StoryEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return id === NEW_STORY_ID ? <StoryForm /> : <ExistingStory id={id} />;
}

function ExistingStory({ id }: { id: string }) {
  const { requireReLogin } = useAdminSession();
  const [story, setStory] = useState<StoryAdminDto | null>(null);
  const [error, setError] = useState<AdminApiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    withReLogin(() => adminFetch<StoryAdminDto>(`/admin/stories/${encodeURIComponent(id)}`), requireReLogin).then(
      (value) => {
        if (!cancelled) setStory(value);
      },
      (failure: unknown) => {
        if (!cancelled)
          setError(failure instanceof AdminApiError ? failure : new AdminApiError(0, GENERIC_ERROR_MESSAGE));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [id, attempt, requireReLogin]);

  if (story !== null) return <StoryForm key={story.id} initial={story} />;
  return (
    <div className="flex flex-col gap-4 p-4">
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
      ) : (
        <p role="status" className="text-center text-muted-foreground">
          Đang tải…
        </p>
      )}
    </div>
  );
}

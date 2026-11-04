"use client";

import Link from "next/link";
import { useState } from "react";
import { MissingEnBadge } from "@/components/admin/form/MissingEnBadge";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import type { StoryAdminDto, StoryStatus } from "@/lib/admin/types";

type Filter = "ALL" | StoryStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "DRAFT", label: "Nháp" },
  { value: "PUBLISHED", label: "Đã đăng" },
];

/** The stories with a filter by status. Tap one to edit it. */
export function StoryList({ stories }: { stories: StoryAdminDto[] }) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const shown = filter === "ALL" ? stories : stories.filter((story) => story.status === filter);
  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Lọc theo trạng thái" className="flex flex-wrap gap-2">
        {FILTERS.map(({ value, label }) => (
          <Button
            key={value}
            type="button"
            variant={filter === value ? "default" : "outline"}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      {stories.length === 0 ? <p className="py-6 text-center text-muted-foreground">Chưa có bài nào.</p> : null}
      {stories.length > 0 && shown.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">Không có bài nào.</p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {shown.map((story) => (
          <li key={story.id}>
            <Link
              href={`${ADMIN_ROUTES.stories}/${story.id}`}
              className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 rounded-md border bg-card p-3 hover:bg-muted active:bg-secondary"
            >
              <span className="min-w-0 flex-1 break-words font-semibold">{story.title.vi ?? story.title.en}</span>
              {story.missingEn ? <MissingEnBadge /> : null}
              {story.status === "DRAFT" ? (
                <Badge variant="secondary">Nháp</Badge>
              ) : (
                <Badge variant="outline">Đã đăng</Badge>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

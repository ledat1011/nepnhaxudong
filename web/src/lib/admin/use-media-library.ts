"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "./api";
import { AdminApiError, GENERIC_ERROR_MESSAGE } from "./errors";
import type { MediaAdminDto } from "./types";
import { useAdminSession } from "./session";
import { MEDIA_PAGE_SIZE, invalidateMediaCache } from "./use-media-by-ids";
import { withReLogin } from "./with-relogin";

/** The media library, newest first, 50 images a page. Used by the Ảnh screen and by the picker. */
export function useMediaLibrary() {
  const { requireReLogin } = useAdminSession();
  const [items, setItems] = useState<MediaAdminDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const nextPage = useRef(0);
  const busy = useRef(false);

  const loadMore = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      const list = await withReLogin(
        () => adminFetch<MediaAdminDto[]>(`/admin/media?page=${nextPage.current}`),
        requireReLogin,
      );
      nextPage.current += 1;
      // An upload shifts the pages, so the same image can come twice. Keep the first copy.
      setItems((current) => [...current, ...list.filter((m) => !current.some((c) => c.id === m.id))]);
      setHasMore(list.length === MEDIA_PAGE_SIZE);
    } catch (failure) {
      setError(failure instanceof AdminApiError ? failure : new AdminApiError(0, GENERIC_ERROR_MESSAGE));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [requireReLogin]);

  useEffect(() => {
    void loadMore();
  }, [loadMore]);

  const added = useCallback((media: MediaAdminDto) => {
    invalidateMediaCache();
    setItems((current) => [media, ...current.filter((m) => m.id !== media.id)]);
  }, []);

  const changed = useCallback((media: MediaAdminDto) => {
    invalidateMediaCache();
    setItems((current) => current.map((m) => (m.id === media.id ? media : m)));
  }, []);

  const removed = useCallback((id: number) => {
    invalidateMediaCache();
    setItems((current) => current.filter((m) => m.id !== id));
  }, []);

  return { items, loading, error, hasMore, loadMore, added, changed, removed };
}

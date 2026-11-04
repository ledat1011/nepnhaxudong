"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { adminFetch } from "./api";
import { useAdminSession } from "./session";
import type { MediaAdminDto } from "./types";
import { withReLogin } from "./with-relogin";

/** The API has no "get one image" endpoint, so the images are found by paging through the library. */
export const MEDIA_PAGE_SIZE = 50;

const byId = new Map<number, MediaAdminDto>();
let nextPage = 0;
let ended = false;
let generation = 0;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Forget every loaded image. Call it after an upload, an edit or a delete, because pages shift. */
export function invalidateMediaCache(): void {
  byId.clear();
  nextPage = 0;
  ended = false;
  generation += 1;
  inFlight = null;
  // Mounted useMediaByIds consumers read `generation`, so they render again and load the images again.
  for (const listener of Array.from(listeners)) listener();
}

/** Adds an image that is already known (for example one just uploaded) so it needs no paging. */
export function rememberMedia(media: MediaAdminDto): void {
  byId.set(media.id, media);
}

function loadNextPage(requireReLogin: () => Promise<void>): Promise<void> {
  if (inFlight !== null) return inFlight;
  const mine = generation;
  const request = withReLogin(() => adminFetch<MediaAdminDto[]>(`/admin/media?page=${nextPage}`), requireReLogin)
    .then((list) => {
      // The cache was reset while this page was loading: the page may be out of date.
      if (mine !== generation) return;
      for (const media of list) byId.set(media.id, media);
      nextPage += 1;
      if (list.length < MEDIA_PAGE_SIZE) ended = true;
    })
    .finally(() => {
      if (inFlight === request) inFlight = null;
    });
  inFlight = request;
  return request;
}

function hasMissing(ids: number[]): boolean {
  return ids.some((id) => !byId.has(id));
}

/**
 * The images for a list of ids, in the order of the ids. An id that is not in the library is left out.
 * Pages are loaded newest first until all ids are found or the library ends; they stay cached for the page load.
 */
export function useMediaByIds(ids: number[]): { items: MediaAdminDto[]; loading: boolean } {
  const { requireReLogin } = useAdminSession();
  const version = useSyncExternalStore(subscribe, () => generation, () => generation);
  const key = ids.join(",");
  const wanted = useMemo(() => (key === "" ? [] : key.split(",").map(Number)), [key]);
  // The key the last search finished for, whether it found every image or not.
  const [settled, setSettled] = useState<{ key: string; version: number } | null>(null);

  useEffect(() => {
    if (!hasMissing(wanted)) return;
    let cancelled = false;
    void (async () => {
      try {
        while (!cancelled && hasMissing(wanted) && !ended) await loadNextPage(requireReLogin);
      } catch {
        // A failed page stops the search; the images found so far are shown.
      }
      if (!cancelled) setSettled({ key, version });
    })();
    return () => {
      cancelled = true;
    };
  }, [key, wanted, version, requireReLogin]);

  const items = wanted.flatMap((id) => byId.get(id) ?? []);
  return { items, loading: hasMissing(wanted) && !ended && (settled?.key !== key || settled.version !== version) };
}

"use client";

import { createContext, useContext, useEffect } from "react";

/** What the header shows about the item open on a detail page. */
export type ScreenDetail = {
  /** The name of the item being edited, or a name such as "Sản phẩm mới" for a new one. */
  name: string;
  /** The page of the public site that shows the item, or `null` while it is not on the site. */
  publicHref: string | null;
};

/** Set by the shell. Outside the shell (in a test of one form) it is `null` and the hook does nothing. */
export const ScreenDetailContext = createContext<((detail: ScreenDetail | null) => void) | null>(null);

/** Tells the shell header which item this detail page edits. The header forgets it when the page goes away. */
export function useScreenDetail({ name, publicHref }: ScreenDetail): void {
  const setDetail = useContext(ScreenDetailContext);
  useEffect(() => {
    if (setDetail === null) return;
    setDetail({ name, publicHref });
    return () => setDetail(null);
  }, [setDetail, name, publicHref]);
}

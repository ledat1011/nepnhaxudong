"use client";

import { useRef } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/admin/ui/alert-dialog";

const TIME = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Ho_Chi_Minh" });
const DAY = new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "numeric", timeZone: "Asia/Ho_Chi_Minh" });

type Props = {
  savedAt: number;
  stale: boolean;
  onRestore(): void;
  onDiscard(): void;
  /** Closed with Escape: no answer. The draft stays for the next time the editor opens. */
  onLater(): void;
};

/** Asks, when the editor opens, whether to bring back the text this phone kept and that was never saved. */
export function DraftRestoreDialog({ savedAt, stale, onRestore, onDiscard, onLater }: Props) {
  const answered = useRef(false);
  const restore = useRef<HTMLButtonElement>(null);
  const when = new Date(savedAt);
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !answered.current) onLater();
      }}
    >
      <AlertDialogContent
        onOpenAutoFocus={(event) => {
          // Radix chooses the cancel button. Here that is "Bỏ bản đó", so a quick tap or Enter would lose the text.
          event.preventDefault();
          restore.current?.focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Có bài đang viết dở</AlertDialogTitle>
          <AlertDialogDescription>
            Máy này còn giữ bản bạn viết lúc {TIME.format(when)} ngày {DAY.format(when)}, chưa được lưu. Khôi phục bản
            đó?
            {stale ? " Bài đã được lưu lại sau lúc đó, có thể từ máy khác. Khôi phục sẽ thay nội dung đang hiện." : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              answered.current = true;
              onDiscard();
            }}
          >
            Bỏ bản đó
          </AlertDialogCancel>
          <AlertDialogAction
            ref={restore}
            onClick={() => {
              answered.current = true;
              onRestore();
            }}
          >
            Khôi phục
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

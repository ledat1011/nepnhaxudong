"use client";

import { Check, X } from "lucide-react";
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
import type { PublishCheck } from "@/lib/admin/publish-checks";

type Props = {
  open: boolean;
  onOpenChange(open: boolean): void;
  checks: PublishCheck[];
  onPublish(): void;
  /** Called after the panel closed on "Quay lại sửa", so the form can move the cursor to the first gap. */
  onFix(): void;
};

/**
 * Opens on "Đăng bài", before anything is published. It lists what a reader will see and what is missing.
 * A gap does not block: "Vẫn đăng bài" publishes, "Quay lại sửa" closes and goes to the first gap.
 * The check mark and the cross only repeat the text next to them, so they are hidden from screen readers.
 */
export function PublishCheckDialog({ open, onOpenChange, checks, onPublish, onFix }: Props) {
  const fixing = useRef(false);
  const gaps = checks.filter((check) => !check.ok).length;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          if (!fixing.current) return;
          // The form moves the cursor to the first gap instead of back to "Đăng bài".
          fixing.current = false;
          event.preventDefault();
          onFix();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Kiểm tra trước khi đăng</AlertDialogTitle>
          <AlertDialogDescription>
            {gaps > 0
              ? "Bài còn thiếu một vài phần. Bạn vẫn đăng được, hoặc quay lại sửa trước."
              : "Bài đã đủ các phần dưới đây."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="flex flex-col gap-2">
          {checks.map((check) => (
            <li key={check.key} className="flex items-start gap-2 text-base">
              {check.ok ? (
                <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
              ) : (
                <X aria-hidden className="mt-0.5 size-5 shrink-0 text-destructive" />
              )}
              <span className={check.ok ? undefined : "font-medium"}>{check.label}</span>
            </li>
          ))}
        </ul>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              fixing.current = gaps > 0;
            }}
          >
            {gaps > 0 ? "Quay lại sửa" : "Để sau"}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onPublish}>{gaps > 0 ? "Vẫn đăng bài" : "Đăng bài"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

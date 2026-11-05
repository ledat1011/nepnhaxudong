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
import type { ShowCheck } from "@/lib/admin/show-checks";

type Props = {
  open: boolean;
  onOpenChange(open: boolean): void;
  checks: ShowCheck[];
  onShow(): void;
  /** Called after the panel closed on "Quay lại sửa", with the first gap, so the caller can go to it. */
  onFix(gap: ShowCheck): void;
  /** Called after the panel closed any other way. The panel has no trigger, so the caller puts the focus back. */
  onClosed(): void;
};

/**
 * Opens when "Hiện trên web" is turned on, before anything changes. It is the "Đăng bài" check of a story, for a
 * product: it lists what a visitor will see and what is missing. A gap does not block: "Vẫn hiện" shows the product,
 * "Quay lại sửa" closes and goes to the first gap. The check mark and the cross only repeat the text next to them,
 * so they are hidden from screen readers.
 */
export function ShowCheckDialog({ open, onOpenChange, checks, onShow, onFix, onClosed }: Props) {
  const fixing = useRef(false);
  const gap = checks.find((check) => !check.ok);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (fixing.current && gap !== undefined) {
            // The caller moves the cursor to the first gap instead of back to the switch.
            fixing.current = false;
            onFix(gap);
          } else {
            onClosed();
          }
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Kiểm tra trước khi hiện trên web</AlertDialogTitle>
          <AlertDialogDescription>
            {gap !== undefined
              ? "Sản phẩm còn thiếu một vài phần. Bạn vẫn hiện được, hoặc quay lại sửa trước."
              : "Sản phẩm đã đủ các phần dưới đây."}
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
              fixing.current = gap !== undefined;
            }}
          >
            {gap !== undefined ? "Quay lại sửa" : "Để sau"}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onShow}>{gap !== undefined ? "Vẫn hiện" : "Hiện trên web"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

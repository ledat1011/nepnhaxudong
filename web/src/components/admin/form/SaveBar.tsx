"use client";

import { useState } from "react";
import { Button } from "@/components/admin/ui/button";
import { ConfirmDialog } from "./ConfirmDialog";

type Props = {
  dirty: boolean;
  pending: boolean;
  /** Another write of the same item runs (for example "Hiện trên web"): both buttons wait, the label stays "Lưu". */
  waiting?: boolean;
  onSave(): void;
  /** Drops the unsaved changes. Runs only after the user said yes to the question. */
  onDiscard(): void;
  /** A short line above the buttons, for example while a field is wrong. */
  notice?: string | null;
};

/**
 * Sticks just above the bottom navigation (a 56 px bar plus the safe area). From 1024 px there is no bottom bar: it
 * sticks to the bottom, right of the left menu (240 px), with its buttons in the 960 px page column.
 * "Bỏ thay đổi" sits next to "Lưu", so it asks first: a slip of the finger must not drop the work.
 */
export function SaveBar({ dirty, pending, waiting = false, onSave, onDiscard, notice }: Props) {
  const [asking, setAsking] = useState(false);
  return (
    <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t bg-card p-3 lg:bottom-0 lg:left-60">
      {/* lg:px-1 adds to p-3 the 16 px inset of the form, so the buttons line up with the boxes above. */}
      <div className="mx-auto flex w-full max-w-[60rem] flex-col gap-2 lg:px-1">
        {notice ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {notice}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setAsking(true)} disabled={pending || waiting || !dirty}>
            Bỏ thay đổi
          </Button>
          <Button type="button" className="flex-1" onClick={onSave} disabled={!dirty || pending || waiting}>
            {pending ? "Đang lưu…" : "Lưu"}
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={asking}
        onOpenChange={setAsking}
        title="Bỏ thay đổi chưa lưu?"
        description="Những gì bạn vừa sửa sẽ mất."
        confirmLabel="Bỏ thay đổi"
        cancelLabel="Tiếp tục sửa"
        destructive
        onConfirm={onDiscard}
      />
    </div>
  );
}

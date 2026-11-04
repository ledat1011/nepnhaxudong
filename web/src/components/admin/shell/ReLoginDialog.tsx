"use client";

import type { UserResponse } from "@/lib/admin/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { LoginForm } from "./LoginForm";

type Props = {
  open: boolean;
  defaultEmail?: string;
  onSuccess(user: UserResponse): void;
  onCancel(): void;
};

/** Shown when a save fails because the session ended. The page and its unsaved form stay behind it. */
export function ReLoginDialog({ open, defaultEmail, onSuccess, onCancel }: Props) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Phiên đăng nhập đã hết hạn</DialogTitle>
          <DialogDescription>Hãy đăng nhập lại để lưu thay đổi. Nội dung bạn đang sửa vẫn được giữ.</DialogDescription>
        </DialogHeader>
        <LoginForm defaultEmail={defaultEmail} onSuccess={onSuccess} onCancel={onCancel} />
      </DialogContent>
    </Dialog>
  );
}

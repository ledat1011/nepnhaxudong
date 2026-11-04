"use client";

import { useState } from "react";
import { BilingualField } from "@/components/admin/form/BilingualField";
import { ConfirmDialog } from "@/components/admin/form/ConfirmDialog";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { adminFetch } from "@/lib/admin/api";
import { toRequestText } from "@/lib/admin/localized";
import type { LocalizedText, MediaAdminDto } from "@/lib/admin/types";
import { useSave } from "@/lib/admin/use-save";
import { MAX_ALT_LENGTH } from "./MediaUploader";

type Props = {
  /** The image to edit, or `null` while the dialog is closed. */
  media: MediaAdminDto | null;
  onClose(): void;
  onChanged(media: MediaAdminDto): void;
  onDeleted(id: number): void;
};

export function MediaEditDialog({ media, onClose, onChanged, onDeleted }: Props) {
  return (
    <Dialog open={media !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        {/* The key resets the form for each image. */}
        {media !== null ? <EditForm key={media.id} media={media} onChanged={onChanged} onDeleted={onDeleted} /> : null}
      </DialogContent>
    </Dialog>
  );
}

type FormProps = { media: MediaAdminDto; onChanged(media: MediaAdminDto): void; onDeleted(id: number): void };

function EditForm({ media, onChanged, onDeleted }: FormProps) {
  const [alt, setAlt] = useState<LocalizedText>({ vi: media.altVi, en: media.altEn });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const request = toRequestText(alt);

  const update = useSave(() =>
    adminFetch<MediaAdminDto>(`/admin/media/${media.id}`, { method: "PUT", body: { altVi: request.vi, altEn: request.en } }),
  );
  const remove = useSave(
    async () => {
      await adminFetch<void>(`/admin/media/${media.id}`, { method: "DELETE" });
      return true;
    },
    { successMessage: "Đã xóa ảnh." },
  );

  const changed = request.vi !== (media.altVi ?? null) || request.en !== (media.altEn ?? null);
  const valid = request.vi !== null && request.en !== null;
  const busy = update.pending || remove.pending;

  async function saveAlt() {
    const saved = await update.save();
    if (saved !== undefined) onChanged(saved);
  }

  async function deleteImage() {
    setConfirmOpen(false);
    // A failed delete gives `undefined`; the API's reason is then shown from `remove.error`.
    if ((await remove.save()) === true) onDeleted(media.id);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Sửa ảnh</DialogTitle>
        <DialogDescription>Chỉ sửa được mô tả. Muốn đổi ảnh, hãy tải ảnh mới lên.</DialogDescription>
      </DialogHeader>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={media.url} alt="Ảnh đang sửa" width={media.width} height={media.height} className="max-h-60 w-full rounded-md border object-contain" />
      <BilingualField label="Mô tả ảnh" value={alt} onChange={setAlt} maxLength={MAX_ALT_LENGTH} viRequired enRequired />
      <ProblemMessage error={update.error} />
      <ProblemMessage error={remove.error} />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => setConfirmOpen(true)} disabled={busy}>
          Xóa ảnh
        </Button>
        <Button type="button" onClick={() => void saveAlt()} disabled={!changed || !valid || busy}>
          {update.pending ? "Đang lưu…" : "Lưu"}
        </Button>
      </DialogFooter>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Xóa ảnh này?"
        description="Ảnh sẽ bị xóa và không khôi phục được. Ảnh đang được dùng thì không xóa được."
        confirmLabel="Xóa"
        destructive
        onConfirm={() => void deleteImage()}
      />
    </>
  );
}

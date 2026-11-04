"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { BilingualField } from "@/components/admin/form/BilingualField";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { adminUpload } from "@/lib/admin/api";
import { toRequestText } from "@/lib/admin/localized";
import type { LocalizedText, MediaAdminDto } from "@/lib/admin/types";
import { IMAGE_ACCEPT, checkImageFile } from "@/lib/admin/upload-check";
import { useSave } from "@/lib/admin/use-save";
import { useUnsavedChanges } from "@/lib/admin/use-unsaved-changes";

/** Same limit as the API (MediaService.MAX_ALT_LENGTH). */
export const MAX_ALT_LENGTH = 300;
const EMPTY_ALT: LocalizedText = { vi: null, en: null };

/**
 * Picks a photo, asks for its description in Vietnamese and English, and uploads it.
 * `accept` has no `capture`, so on a phone the user chooses between the gallery and the camera.
 * After any error the file and the descriptions stay, so the user can try again.
 */
export function MediaUploader({ onUploaded }: { onUploaded(media: MediaAdminDto): void }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [alt, setAlt] = useState<LocalizedText>(EMPTY_ALT);
  // A new key makes React drop the old file input, which clears its chosen file.
  const [inputKey, setInputKey] = useState(0);
  const fileInputId = useId();
  const previewRef = useRef<string | null>(null);
  // A chosen photo or a typed description is lost when the user leaves before the upload.
  useUnsavedChanges(file !== null || alt.vi !== null || alt.en !== null);

  const { save, pending, error, reset } = useSave(
    () => {
      const request = toRequestText(alt);
      const form = new FormData();
      form.append("file", file as File);
      form.append("altVi", request.vi ?? "");
      form.append("altEn", request.en ?? "");
      return adminUpload<MediaAdminDto>("/admin/media", form);
    },
    { successMessage: "Đã tải ảnh lên." },
  );

  // The preview URL is revoked when the file changes (in `choose`) and when the component goes away.
  useEffect(
    () => () => {
      if (previewRef.current !== null) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  function choose(next: File | null) {
    if (previewRef.current !== null) URL.revokeObjectURL(previewRef.current);
    previewRef.current = next === null ? null : URL.createObjectURL(next);
    setPreviewUrl(previewRef.current);
    setFile(next);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    const problem = picked === null ? null : checkImageFile(picked);
    setFileError(problem);
    reset();
    choose(problem === null ? picked : null);
  }

  const request = toRequestText(alt);
  const ready = file !== null && fileError === null && request.vi !== null && request.en !== null;

  async function upload() {
    if (file === null) return;
    const problem = checkImageFile(file);
    if (problem !== null) {
      setFileError(problem);
      return;
    }
    const media = await save();
    if (media === undefined) return;
    choose(null);
    setAlt(EMPTY_ALT);
    setInputKey((key) => key + 1);
    onUploaded(media);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={fileInputId}>Chọn ảnh</Label>
        <Input key={inputKey} id={fileInputId} type="file" accept={IMAGE_ACCEPT} onChange={onFileChange} />
        <p className="text-sm text-muted-foreground">JPEG, PNG hoặc WebP, tối đa 15 MB.</p>
      </div>
      {fileError !== null ? (
        <p role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {fileError}
        </p>
      ) : null}
      {previewUrl !== null ? (
        // A blob: URL of the chosen file; next/image cannot optimize it. The photo's size is unknown
        // until it loads, so the box has a fixed height and the form below does not jump.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="Xem trước" className="h-60 w-full rounded-md border object-contain" />
      ) : null}
      <BilingualField label="Mô tả ảnh" value={alt} onChange={setAlt} maxLength={MAX_ALT_LENGTH} viRequired enRequired />
      <ProblemMessage error={error} />
      <Button type="button" onClick={() => void upload()} disabled={!ready || pending}>
        {pending ? "Đang tải lên…" : error !== null ? "Thử lại" : "Tải lên"}
      </Button>
    </div>
  );
}

"use client";

import { useId, useRef, useState } from "react";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
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
import { Switch } from "@/components/admin/ui/switch";
import { adminFetch } from "@/lib/admin/api";
import type { FieldKey } from "@/lib/admin/field-targets";
import { showChecks } from "@/lib/admin/show-checks";
import type { ProductAdminDto } from "@/lib/admin/types";
import { useSave } from "@/lib/admin/use-save";
import { cn } from "@/lib/admin/utils";
import { ShowCheckDialog } from "./ShowCheckDialog";

type Props = {
  /** The saved product. Without it (a product not saved yet) the switch is off and locked. */
  product?: ProductAdminDto;
  /** The name screen readers hear. A list names the product, because every row has the same visible label. */
  label?: string;
  disabled?: boolean;
  /** The product as the API sent it after the switch changed. */
  onChanged(product: ProductAdminDto): void;
  /** "Quay lại sửa" in the check panel: the field of the first gap. */
  onFix(key: FieldKey): void;
  className?: string;
};

/**
 * The "Hiện trên web" switch of one product (decision 0010, item 2). The switch shows what the API stored: it moves
 * only after the API answered. Turning it on opens the check panel first; turning it off asks first, like "Gỡ bài".
 * The whole row is the label, so the tap target is the full width and at least 44 px high.
 * The panels open from code, not from a trigger, so they give the focus back to the switch themselves. While a change
 * is sent the switch is only marked `aria-disabled`: a real `disabled` would drop the focus to the page.
 */
export function VisibilitySwitch({ product, label, disabled = false, onChanged, onFix, className }: Props) {
  const id = useId();
  const switchRef = useRef<HTMLButtonElement>(null);
  const [checking, setChecking] = useState(false);
  const [askHide, setAskHide] = useState(false);
  const showing = useSave(() => adminFetch<ProductAdminDto>(`/admin/products/${product?.id}/show`, { method: "POST" }), {
    successMessage: "Đã hiện sản phẩm trên web.",
  });
  const hiding = useSave(() => adminFetch<ProductAdminDto>(`/admin/products/${product?.id}/hide`, { method: "POST" }), {
    successMessage: "Đã ẩn sản phẩm khỏi web.",
  });
  const pending = showing.pending || hiding.pending;

  async function change(action: typeof showing) {
    showing.reset();
    hiding.reset();
    const result = await action.save();
    if (result !== undefined) onChanged(result);
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="flex min-h-11 items-center justify-between gap-3 text-base font-semibold">
        <span>Hiện trên web</span>
        <Switch
          ref={switchRef}
          id={id}
          aria-label={label}
          aria-disabled={pending || undefined}
          checked={product?.visible ?? false}
          disabled={product === undefined || disabled}
          onCheckedChange={(next) => {
            if (pending) return;
            if (next) setChecking(true);
            else setAskHide(true);
          }}
        />
      </label>
      <ProblemMessage error={showing.error ?? hiding.error} />
      {product !== undefined ? (
        <>
          <ShowCheckDialog
            open={checking}
            onOpenChange={setChecking}
            checks={showChecks(product)}
            onShow={() => void change(showing)}
            onFix={(gap) => onFix(gap.fix)}
            onClosed={() => switchRef.current?.focus()}
          />
          <AlertDialog open={askHide} onOpenChange={setAskHide}>
            <AlertDialogContent
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                switchRef.current?.focus();
              }}
            >
              <AlertDialogHeader>
                <AlertDialogTitle>Ẩn sản phẩm khỏi website?</AlertDialogTitle>
                <AlertDialogDescription>
                  Khách sẽ không thấy sản phẩm này nữa. Sản phẩm vẫn được giữ ở đây và bạn có thể bật hiện lại.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Không ẩn</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={() => void change(hiding)}>
                  Ẩn sản phẩm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
    </div>
  );
}

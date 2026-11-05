"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { useId } from "react";
import { FieldError, RequiredMark } from "@/components/admin/form/FieldError";
import { MissingEnBadge } from "@/components/admin/form/MissingEnBadge";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { invalidProps } from "@/lib/admin/field-errors";
import { useRemoveWithUndo } from "@/lib/admin/use-remove-with-undo";
import { moved, nextRowKey } from "./rows";

export type FeatureRow = { key: string; vi: string; en: string };

export function newFeatureRow(vi = "", en = ""): FeatureRow {
  return { key: nextRowKey(), vi, en };
}

/** Longest piece of the feature text quoted in the "Đã xóa" message. */
const QUOTE_LENGTH = 40;

function removedMessage(n: number, row: FeatureRow): string {
  const text = row.vi.trim();
  if (text === "") return `Đã xóa đặc điểm ${n}.`;
  const quote = text.length > QUOTE_LENGTH ? `${text.slice(0, QUOTE_LENGTH).trimEnd()}…` : text;
  return `Đã xóa đặc điểm ${n} (${quote}).`;
}

type Props = {
  rows: FeatureRow[];
  onChange(rows: FeatureRow[]): void;
  /** The error of the whole list (at least one Vietnamese item is needed). */
  error?: string | null;
};

/**
 * The product features: one row per feature with a Vietnamese and an English box. The list needs one
 * Vietnamese item. Its error sits under the title; the first Vietnamese box, or "Thêm đặc điểm" when
 * there is no row, is where the cursor goes.
 */
export function FeatureList({ rows, onChange, error }: Props) {
  const errorId = useId();
  const remove = useRemoveWithUndo(rows, onChange);
  function update(index: number, patch: Partial<FeatureRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="mb-2 text-base font-semibold">
        Đặc điểm
        <RequiredMark />
      </legend>
      <FieldError id={errorId} message={error} />
      <ul className="flex flex-col gap-3">
        {rows.map((row, index) => {
          const n = index + 1;
          const missingEn = row.vi.trim() !== "" && row.en.trim() === "";
          return (
            <li key={row.key} className="flex flex-col gap-2 rounded-md border p-3">
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${row.key}-vi`}>Đặc điểm {n} (tiếng Việt)</Label>
                  <Input
                    id={`${row.key}-vi`}
                    value={row.vi}
                    {...(index === 0 ? invalidProps(errorId, error) : {})}
                    onChange={(e) => update(index, { vi: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${row.key}-en`}>Đặc điểm {n} (English)</Label>
                  <Input id={`${row.key}-en`} value={row.en} onChange={(e) => update(index, { en: e.target.value })} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Đưa đặc điểm ${n} lên`}
                  disabled={index === 0}
                  onClick={() => onChange(moved(rows, index, -1))}
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Đưa đặc điểm ${n} xuống`}
                  disabled={index === rows.length - 1}
                  onClick={() => onChange(moved(rows, index, 1))}
                >
                  <ArrowDown />
                </Button>
                {missingEn ? <MissingEnBadge /> : null}
                {/* At the far end of the row, away from the arrows: a slip of the finger moves a row, it does not delete it. */}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Xóa đặc điểm ${n}`}
                  className="ml-auto"
                  onClick={() => remove(index, removedMessage(n, row))}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-muted-foreground">
        Danh sách tiếng Anh theo cùng thứ tự. Ô tiếng Anh để trống sẽ được bỏ qua.
      </p>
      <Button
        type="button"
        variant="outline"
        data-error-target={error && rows.length === 0 ? true : undefined}
        aria-describedby={error && rows.length === 0 ? `${errorId}-error` : undefined}
        onClick={() => onChange([...rows, newFeatureRow()])}
      >
        Thêm đặc điểm
      </Button>
    </fieldset>
  );
}

"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { FieldError, RequiredMark } from "@/components/admin/form/FieldError";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { invalidProps, type FieldErrors } from "@/lib/admin/field-errors";
import { priceReading, priceWarning, weightReading, weightWarning } from "@/lib/admin/packaging-reading";
import { useRemoveWithUndo } from "@/lib/admin/use-remove-with-undo";
import { moved, nextRowKey } from "./rows";

/** Most pack sizes one product can have (the API refuses more). */
export const MAX_PACKAGINGS = 20;

/** The two number boxes are kept as text, so a half-typed number is not changed while the user types. */
export type PackagingRow = { key: string; weight: string; price: string };

export function newPackagingRow(weight = "", price = ""): PackagingRow {
  return { key: nextRowKey(), weight, price };
}

type Props = {
  rows: PackagingRow[];
  showPrice: boolean;
  onChange(rows: PackagingRow[]): void;
  /** Errors by `packagingErrorKey`. */
  errors?: FieldErrors;
};

/** The key of the error of one box of one row. */
export function packagingErrorKey(row: PackagingRow, box: "weight" | "price"): string {
  return `packagings.${row.key}.${box}`;
}

function removedMessage(n: number, row: PackagingRow): string {
  const weight = row.weight.trim();
  return weight === "" ? `Đã xóa quy cách ${n}.` : `Đã xóa quy cách ${n} (${weight} g).`;
}

/**
 * The props of a number box: the error (if any) and then the reading under it are its description,
 * so a screen reader hears "= 2 kg" after the label.
 */
function boxProps(id: string, error: string | null | undefined, hasReading: boolean) {
  const described = [error ? `${id}-error` : null, hasReading ? `${id}-reading` : null].filter(Boolean).join(" ");
  return { ...invalidProps(id, error), "aria-describedby": described === "" ? undefined : described };
}

/**
 * Under a number box: the value as people read it ("= 2 kg", "= 150.000 đ") and, for a value that looks like a
 * slip, a note. The note never blocks saving: a 50 g sample bag is possible.
 */
function Reading({ id, reading, warning }: { id: string; reading: string | null; warning: string | null }) {
  if (reading === null && warning === null) return null;
  return (
    <p id={`${id}-reading`} className="text-sm">
      {reading !== null ? <span className="font-semibold">{reading}</span> : null}
      {/* The space keeps the two parts apart for a screen reader; the note starts on its own line. */}
      {reading !== null && warning !== null ? " " : null}
      {warning !== null ? <span className="block font-medium text-destructive">{warning}</span> : null}
    </p>
  );
}

/** Pack sizes in order. The price box is shown only while the product shows its price. */
export function PackagingList({ rows, showPrice, onChange, errors = {} }: Props) {
  const remove = useRemoveWithUndo(rows, onChange, { keyOf: (row) => row.key, max: MAX_PACKAGINGS });
  function update(index: number, patch: Partial<PackagingRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="mb-2 text-base font-semibold">Quy cách đóng gói</legend>
      <ul className="flex flex-col gap-3">
        {rows.map((row, index) => {
          const n = index + 1;
          const weightError = errors[packagingErrorKey(row, "weight")];
          const priceError = errors[packagingErrorKey(row, "price")];
          const weightNote = { reading: weightReading(row.weight), warning: weightWarning(row.weight) };
          const priceNote = { reading: priceReading(row.price), warning: priceWarning(row.price) };
          return (
            <li key={row.key} className="flex flex-col gap-2 rounded-md border p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${row.key}-w`}>
                    Khối lượng (gam)
                    <RequiredMark />
                  </Label>
                  <Input
                    id={`${row.key}-w`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    required
                    value={row.weight}
                    {...boxProps(`${row.key}-w`, weightError, weightNote.reading !== null || weightNote.warning !== null)}
                    onChange={(e) => update(index, { weight: e.target.value })}
                  />
                  <FieldError id={`${row.key}-w`} message={weightError} />
                  <Reading id={`${row.key}-w`} {...weightNote} />
                </div>
                {showPrice ? (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`${row.key}-p`}>Giá (VND)</Label>
                    <Input
                      id={`${row.key}-p`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={row.price}
                      {...boxProps(`${row.key}-p`, priceError, priceNote.reading !== null || priceNote.warning !== null)}
                      onChange={(e) => update(index, { price: e.target.value })}
                    />
                    <FieldError id={`${row.key}-p`} message={priceError} />
                    <Reading id={`${row.key}-p`} {...priceNote} />
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Đưa quy cách ${n} lên`}
                  disabled={index === 0}
                  onClick={() => onChange(moved(rows, index, -1))}
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Đưa quy cách ${n} xuống`}
                  disabled={index === rows.length - 1}
                  onClick={() => onChange(moved(rows, index, 1))}
                >
                  <ArrowDown />
                </Button>
                {/* At the far end of the row, away from the arrows: a slip of the finger moves a row, it does not delete it. */}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Xóa quy cách ${n}`}
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
      <Button
        type="button"
        variant="outline"
        disabled={rows.length >= MAX_PACKAGINGS}
        onClick={() => onChange([...rows, newPackagingRow()])}
      >
        Thêm quy cách
      </Button>
      {rows.length >= MAX_PACKAGINGS ? (
        <p className="text-sm text-muted-foreground">Một sản phẩm có tối đa {MAX_PACKAGINGS} quy cách.</p>
      ) : null}
    </fieldset>
  );
}

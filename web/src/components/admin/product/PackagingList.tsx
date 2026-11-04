"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
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
};

/** Pack sizes in order. The price box is shown only while the product shows its price. */
export function PackagingList({ rows, showPrice, onChange }: Props) {
  function update(index: number, patch: Partial<PackagingRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="mb-2 text-base font-semibold">Quy cách đóng gói</legend>
      <ul className="flex flex-col gap-3">
        {rows.map((row, index) => {
          const n = index + 1;
          return (
            <li key={row.key} className="flex flex-col gap-2 rounded-md border p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${row.key}-w`}>Khối lượng (gam)</Label>
                  <Input
                    id={`${row.key}-w`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={row.weight}
                    onChange={(e) => update(index, { weight: e.target.value })}
                  />
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
                      onChange={(e) => update(index, { price: e.target.value })}
                    />
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
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Xóa quy cách ${n}`}
                  onClick={() => onChange(rows.filter((_, i) => i !== index))}
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

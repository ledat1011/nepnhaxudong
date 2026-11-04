"use client";

import { useId } from "react";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { Textarea } from "@/components/admin/ui/textarea";
import { isMissingEn } from "@/lib/admin/localized";
import type { LocalizedText } from "@/lib/admin/types";
import { MissingEnBadge } from "./MissingEnBadge";

type Props = {
  label: string;
  value: LocalizedText;
  onChange(value: LocalizedText): void;
  multiline?: boolean;
  maxLength?: number;
  viRequired?: boolean;
  enRequired?: boolean;
};

type BoxProps = {
  id: string;
  label: string;
  value: string | null;
  onChange(value: string | null): void;
  multiline: boolean;
  maxLength?: number;
  required: boolean;
};

function Box({ id, label, value, onChange, multiline, maxLength, required }: BoxProps) {
  const text = value ?? "";
  const common = {
    id,
    value: text,
    maxLength,
    required,
    onChange: (event: { target: { value: string } }) => onChange(event.target.value === "" ? null : event.target.value),
  };
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex min-h-6 items-center justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required ? <span aria-hidden> *</span> : null}
        </Label>
        {maxLength !== undefined ? (
          <span className="text-xs text-muted-foreground">
            {text.length}/{maxLength}
          </span>
        ) : null}
      </div>
      {multiline ? <Textarea rows={4} {...common} /> : <Input {...common} />}
    </div>
  );
}

/** Two boxes, Vietnamese and English, stacked on a phone and side by side on a wide screen. */
export function BilingualField({ label, value, onChange, multiline = false, maxLength, viRequired = false, enRequired = false }: Props) {
  const id = useId();
  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="mb-2 flex items-center gap-2 text-base font-semibold">
        {label}
        {isMissingEn(value) ? <MissingEnBadge /> : null}
      </legend>
      <div className="grid gap-3 md:grid-cols-2">
        <Box
          id={`${id}-vi`}
          label="Tiếng Việt"
          value={value.vi}
          onChange={(vi) => onChange({ ...value, vi })}
          multiline={multiline}
          maxLength={maxLength}
          required={viRequired}
        />
        <Box
          id={`${id}-en`}
          label="English"
          value={value.en}
          onChange={(en) => onChange({ ...value, en })}
          multiline={multiline}
          maxLength={maxLength}
          required={enRequired}
        />
      </div>
    </fieldset>
  );
}

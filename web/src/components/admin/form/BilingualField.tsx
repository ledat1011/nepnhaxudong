"use client";

import { useId } from "react";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { Textarea } from "@/components/admin/ui/textarea";
import { invalidProps } from "@/lib/admin/field-errors";
import { isMissingEn } from "@/lib/admin/localized";
import type { LocalizedText } from "@/lib/admin/types";
import { FieldError, RequiredMark } from "./FieldError";
import { MicHint } from "./MicHint";
import { MissingEnBadge } from "./MissingEnBadge";

type Props = {
  label: string;
  value: LocalizedText;
  onChange(value: LocalizedText): void;
  multiline?: boolean;
  maxLength?: number;
  viRequired?: boolean;
  enRequired?: boolean;
  /** The error of each box, shown right under it. */
  errors?: { vi?: string | null; en?: string | null };
  /** Shows the tip about the keyboard microphone above the boxes (once per screen). On by default for long text. */
  micHint?: boolean;
};

type BoxProps = {
  id: string;
  label: string;
  value: string | null;
  onChange(value: string | null): void;
  multiline: boolean;
  maxLength?: number;
  required: boolean;
  error?: string | null;
};

function Box({ id, label, value, onChange, multiline, maxLength, required, error }: BoxProps) {
  const text = value ?? "";
  const common = {
    id,
    value: text,
    maxLength,
    required,
    ...invalidProps(id, error),
    onChange: (event: { target: { value: string } }) => onChange(event.target.value === "" ? null : event.target.value),
  };
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex min-h-6 items-center justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required ? <RequiredMark /> : null}
        </Label>
        {maxLength !== undefined ? (
          <span className="text-sm text-muted-foreground">
            {text.length}/{maxLength}
          </span>
        ) : null}
      </div>
      {multiline ? <Textarea rows={4} {...common} /> : <Input {...common} />}
      <FieldError id={id} message={error} />
    </div>
  );
}

/** Two boxes, Vietnamese and English, stacked on a phone and side by side on a wide screen. */
export function BilingualField({
  label,
  value,
  onChange,
  multiline = false,
  maxLength,
  viRequired = false,
  enRequired = false,
  errors,
  micHint = multiline,
}: Props) {
  const id = useId();
  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="mb-2 flex items-center gap-2 text-base font-semibold">
        {label}
        {isMissingEn(value) ? <MissingEnBadge /> : null}
      </legend>
      {micHint ? <MicHint /> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <Box
          id={`${id}-vi`}
          label="Tiếng Việt"
          value={value.vi}
          onChange={(vi) => onChange({ ...value, vi })}
          multiline={multiline}
          maxLength={maxLength}
          required={viRequired}
          error={errors?.vi}
        />
        <Box
          id={`${id}-en`}
          label="English"
          value={value.en}
          onChange={(en) => onChange({ ...value, en })}
          multiline={multiline}
          maxLength={maxLength}
          required={enRequired}
          error={errors?.en}
        />
      </div>
    </fieldset>
  );
}

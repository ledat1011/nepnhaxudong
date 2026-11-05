"use client";

import { useId } from "react";
import { FieldError } from "@/components/admin/form/FieldError";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { invalidProps } from "@/lib/admin/field-errors";

type Props = {
  label: string;
  value: string;
  onChange(value: string): void;
  inputMode?: "text" | "tel" | "url";
  placeholder?: string;
  /** Shown right under the box, which is then marked as wrong. */
  error?: string | null;
};

/** One labelled text box of a settings form. */
export function SettingField({ label, value, onChange, inputMode = "text", placeholder, error }: Props) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        {...invalidProps(id, error)}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldError id={id} message={error} />
    </div>
  );
}

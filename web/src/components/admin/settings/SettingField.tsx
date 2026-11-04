"use client";

import { useId } from "react";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";

type Props = {
  label: string;
  value: string;
  onChange(value: string): void;
  inputMode?: "text" | "tel" | "url";
  placeholder?: string;
};

/** One labelled text box of a settings form. */
export function SettingField({ label, value, onChange, inputMode = "text", placeholder }: Props) {
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
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

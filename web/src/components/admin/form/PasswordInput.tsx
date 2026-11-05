"use client";

import { useState, type ComponentProps } from "react";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";

type Props = Omit<ComponentProps<typeof Input>, "type"> & { id: string };

/**
 * A password box with a "Hiện" / "Ẩn" button at its end. Seeing the password helps on a phone keyboard, where a
 * wrong letter is easy to type and hard to see. The button keeps its place, so the box does not jump.
 */
export function PasswordInput({ id, className, ...props }: Props) {
  const [shown, setShown] = useState(false);
  return (
    <div className="flex items-stretch gap-2">
      <Input id={id} type={shown ? "text" : "password"} className={className} {...props} />
      <Button
        type="button"
        variant="outline"
        className="min-w-16"
        aria-label={shown ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        aria-controls={id}
        onClick={() => setShown((value) => !value)}
      >
        {shown ? "Ẩn" : "Hiện"}
      </Button>
    </div>
  );
}

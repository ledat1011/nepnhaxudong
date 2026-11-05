import * as React from "react"
import { cn } from "@/lib/admin/utils"

/** Boxes for an address, an email or a phone number: written as typed, never capitalised or corrected. */
const LITERAL_KINDS = new Set(["url", "email", "tel"])

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  // A phone keyboard turns "https://" into "Https://" and "0912" into a word suggestion. The form can still override.
  const literal = LITERAL_KINDS.has(type ?? "") || LITERAL_KINDS.has(props.inputMode ?? "")
  const literalProps = literal ? { autoCapitalize: "none", autoCorrect: "off", spellCheck: false } : {}
  return (
    <input
      type={type}
      {...literalProps}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }

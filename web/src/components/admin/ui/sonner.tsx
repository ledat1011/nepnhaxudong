"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * Short messages ("Đã lưu.") show at the top of the screen. At the bottom they covered the bottom menu and the
 * Lưu bar for four seconds. Text is 16 px and an action ("Hoàn tác") is a 44 px button, for older eyes and fingers.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="top-center"
      // Below the header row (56 px), so "Quay lại" and "Xem trên web" stay visible and tappable.
      offset={{ top: "4rem" }}
      mobileOffset={{ top: "4rem" }}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "text-base!",
          title: "text-base! font-medium!",
          actionButton: "h-auto! min-h-11! rounded-md! px-4! text-sm! font-semibold!",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }

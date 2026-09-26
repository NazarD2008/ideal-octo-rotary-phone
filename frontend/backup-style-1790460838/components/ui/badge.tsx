import * as React from "react"
import { cn } from "@/lib/utils"

function Badge({ className, variant = "default", ...props }: React.ComponentProps<"div"> & {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "error" | "info" | "primary"
}) {
  const variants: Record<string, string> = {
    default: "badge badge--primary",
    secondary: "badge bg-surface text-foreground border-border",
    destructive: "badge badge--error",
    outline: "badge border-border text-foreground bg-transparent",
    success: "badge badge--success",
    warning: "badge badge--warning",
    error: "badge badge--error",
    info: "badge bg-info/15 text-info border-info/30",
    primary: "badge badge--primary",
  }

  return (
    <div
      className={cn(
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
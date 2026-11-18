import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";
const tones: Record<Tone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  info: "bg-info/10 text-info",
  neutral: "bg-page-muted text-text-secondary",
};
export function BookingStatusBadge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <Badge variant="outline" className={`gap-1.5 border-transparent ${tones[tone]}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {children}
    </Badge>
  );
}

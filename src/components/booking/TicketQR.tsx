import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTicketQr } from "@/services/tickets";

type QRState = { kind: "loading" } | { kind: "ready"; src: string } | { kind: "error" };

export function TicketQR({ ticketId }: { ticketId: string | number }) {
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<QRState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setState({ kind: "loading" });

    getTicketQr(ticketId)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setState({ kind: "ready", src: objectUrl });
      })
      .catch((error: unknown) => {
        const response =
          error && typeof error === "object" && "response" in error
            ? (error as { response?: { status?: number; data?: unknown } }).response
            : undefined;
        console.error("Ticket QR request failed", {
          status: response?.status,
          response,
        });
        if (!cancelled) setState({ kind: "error" });
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [ticketId, retry]);

  return (
    <div className="ticket-qr-size relative flex max-w-full items-center justify-center overflow-hidden rounded-lg border border-subtle bg-surface">
      {state.kind === "loading" && (
        <div
          className="absolute inset-0 animate-pulse bg-page-muted"
          role="status"
          aria-label="Loading ticket QR code"
        />
      )}
      {state.kind === "ready" && (
        <img src={state.src} alt="Ticket QR code" className="ticket-qr-size object-contain" />
      )}
      {state.kind === "error" && (
        <div className="flex flex-col items-center gap-2 px-3 text-center">
          <p className="text-sm text-text-secondary">QR unavailable</p>
          <Button variant="outline" size="sm" onClick={() => setRetry((count) => count + 1)}>
            <RotateCcw className="size-4" />
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { canCheckIn } from "../lib/auth";

export function RequireStaff({ children }: { children: ReactNode }) {
  const { status, user, openAuthModal } = useAuth();
  const router = useRouter();
  const prompted = useRef(false);
  const denied = useRef(false);
  useEffect(() => {
    if (status === "loading") return;
    if (status === "anonymous" && !prompted.current) {
      prompted.current = true;
      openAuthModal({
        onSuccess: () => {
          void router.invalidate();
        },
      });
    }
    if (status === "authenticated" && !canCheckIn(user) && !denied.current) {
      denied.current = true;
      toast.error("You don't have access to this page");
      void router.navigate({ to: "/", replace: true });
    }
  }, [status, user, openAuthModal, router]);
  if (status === "loading")
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-page"
        role="status"
        aria-label="Loading session"
      >
        <LoaderCircle className="size-8 animate-spin text-text-muted" />
      </div>
    );
  if (status === "anonymous")
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-page p-6">
        <LockKeyhole className="size-10 text-text-muted" />
        <h1 className="text-xl font-semibold">Sign in to continue</h1>
        <Button
          onClick={() =>
            openAuthModal({
              onSuccess: () => {
                void router.invalidate();
              },
            })
          }
        >
          Sign in
        </Button>
        <Button
          variant="link"
          onClick={() => {
            void router.navigate({ to: "/" });
          }}
        >
          Back to site
        </Button>
      </div>
    );
  return canCheckIn(user) ? children : null;
}

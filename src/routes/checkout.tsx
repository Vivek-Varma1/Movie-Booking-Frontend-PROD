import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Placeholder } from "@/pages/Placeholder";
import { useAuth } from "@/components/auth/AuthContext";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Cineverse" },
      { name: "description", content: "Review and pay for your tickets." },
      { property: "og:title", content: "Checkout — Cineverse" },
      { property: "og:description", content: "Review and pay for your tickets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CheckoutPage,
});

// Only route that requires auth: prompts the login modal when signed out.
function CheckoutPage() {
  const { isAuthenticated, isReady, openAuthModal, returnToPreviousPage } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (isReady && !isAuthenticated) {
      returnToPreviousPage();
      openAuthModal({ onSuccess: () => { void navigate({ to: "/checkout" }); } });
    }
  }, [isAuthenticated, isReady, openAuthModal, returnToPreviousPage, navigate]);

  if (!isAuthenticated)
    return null;
  return <Placeholder title="Checkout" detail="Coming soon" />;
}

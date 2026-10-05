import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { SESSION_EXPIRED_EVENT } from "@/api/client";
import type { SessionKind } from "@/api/session";
import { withNext } from "@/lib/forms";
import { toast } from "@/stores/toast";

/*
 * Reacts when the API rejects a customer's or staff member's token (expired, revoked, signed out on
 * another device): the API client has already cleared the session; this drops the
 * customer's cached cart and account data and says what happened, with a Sign in
 * link back to the current page. Protected pages redirect on their own because
 * their guard re-renders once the session is gone.
 */
export function SessionWatcher() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const here = useRef(location.pathname + location.search);
  useEffect(() => {
    here.current = location.pathname + location.search;
  }, [location.pathname, location.search]);

  useEffect(() => {
    let shownAt = 0;
    const onExpired = (event: Event) => {
      const kind = (event as CustomEvent<{ kind: SessionKind }>).detail?.kind;
      // Several requests can fail together; one message is enough.
      const repeat = Date.now() - shownAt < 5000;
      if (kind === "staff") {
        queryClient.removeQueries({ queryKey: ["staff"] });
        if (repeat) return;
        shownAt = Date.now();
        const next = here.current.startsWith("/admin") ? here.current : "/admin";
        toast.info({
          title: "Your staff session ended",
          description: "Sign in again to carry on. Sessions last 12 hours.",
          action: { label: "Sign in", href: `/admin/login?next=${encodeURIComponent(next)}` },
          duration: 10_000,
        });
        return;
      }
      if (kind !== "customer") return;
      queryClient.removeQueries({ queryKey: ["cart"] });
      queryClient.removeQueries({ queryKey: ["account"] });
      if (repeat) return;
      shownAt = Date.now();
      toast.info({
        title: "You've been signed out",
        description: "Your session ended. Sign in again to see your cart and orders.",
        action: { label: "Sign in", href: withNext("/login", here.current) },
        duration: 10_000,
      });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [queryClient]);

  return null;
}

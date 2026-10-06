import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { authApi } from "@/api/endpoints/auth";
import { ApiError } from "@/api/errors";
import { FormAlert } from "@/components/form/FormAlert";
import { cn } from "@/lib/utils";
import { anySocialEnabled, isReady, prepare, requestToken, SocialCancelled, socialEnabled, type Provider } from "./social";
import { useAfterSignIn } from "./useAfterSignIn";

/*
 * "Continue with Google / Facebook". A provider shows once its id is configured (src/features/auth/social.ts);
 * with neither configured the buttons stay visible but disabled, marked "coming soon".
 * Pages put the buttons above the email form when they work, below it while they don't.
 */

const NAMES: Record<Provider, string> = { google: "Google", facebook: "Facebook" };

const ICONS: Record<Provider, ReactNode> = {
  google: (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12Z"
      />
    </svg>
  ),
};

const buttonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-input bg-card px-4 text-[15px] font-semibold text-foreground transition-[background-color,border-color] duration-150";

function Divider({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground" aria-hidden="true">
      <span className="h-px flex-1 bg-border" />
      {children}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export function SocialButtons({ next = null }: { next?: string | null }) {
  const enabled = (["google", "facebook"] as const).filter(socialEnabled);
  const afterSignIn = useAfterSignIn();
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState<Partial<Record<Provider, boolean>>>({});
  const [, setLoaded] = useState(0);

  const load = (provider: Provider) =>
    prepare(provider)
      .then(() => {
        setFailed((f) => ({ ...f, [provider]: false }));
        setLoaded((n) => n + 1);
      })
      .catch(() => setFailed((f) => ({ ...f, [provider]: true })));

  // Load the provider scripts as soon as the buttons show, so a click can open the popup.
  const key = enabled.join(",");
  useEffect(() => {
    for (const provider of key ? (key.split(",") as Provider[]) : []) void load(provider);
  }, [key]);

  if (!anySocialEnabled()) {
    return (
      <div className="grid gap-3">
        <Divider>or</Divider>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["google", "facebook"] as const).map((p) => (
            <button key={p} type="button" disabled aria-describedby="social-soon" className={cn(buttonClass, "cursor-not-allowed opacity-60")}>
              {ICONS[p]}
              {NAMES[p]}
            </button>
          ))}
        </div>
        <p id="social-soon" className="text-center text-sm text-muted-foreground">
          Google and Facebook sign-in are coming soon.
        </p>
      </div>
    );
  }

  const start = (provider: Provider) => {
    setError(null);
    if (!isReady(provider)) {
      setError(
        failed[provider]
          ? `${NAMES[provider]} sign-in couldn't load. Check your connection, or allow ${NAMES[provider]} if you use an ad or tracker blocker, then try again.`
          : `${NAMES[provider]} sign-in is still loading. Try again in a moment.`,
      );
      void load(provider);
      return;
    }
    // The popup must open inside this click, so the token is requested before any state update.
    const token = requestToken(provider);
    setBusy(provider);
    token
      .then((accessToken) => authApi.social(provider, accessToken))
      .then((response) => {
        const firstName = response.customer?.name?.split(" ")[0];
        afterSignIn(response.customer, next, firstName ? `Welcome, ${firstName}` : "Welcome to Bookly");
      })
      .catch((err: unknown) => {
        if (err instanceof SocialCancelled) return;
        if (err instanceof Error && err.message === "popup_blocked") {
          setError(`Your browser blocked the ${NAMES[provider]} window. Allow pop-ups for this site, then try again.`);
          return;
        }
        setError(ApiError.from(err).message);
      })
      .finally(() => setBusy(null));
  };

  return (
    <div className="grid gap-4">
      {error ? <FormAlert title={error} /> : null}
      <div className="grid gap-3">
        {enabled.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => start(p)}
            disabled={busy !== null}
            aria-busy={busy === p || undefined}
            className={cn(
              buttonClass,
              "outline-none hover:border-foreground/40 hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-70",
            )}
          >
            {busy === p ? <Loader2 className="size-[18px] animate-spin motion-reduce:animate-none" aria-hidden="true" /> : ICONS[p]}
            Continue with {NAMES[p]}
          </button>
        ))}
      </div>
      <Divider>or use your email</Divider>
    </div>
  );
}

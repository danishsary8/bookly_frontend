import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/api/endpoints/auth";
import { ApiError } from "@/api/errors";
import { FormAlert } from "@/components/form/FormAlert";
import { cn } from "@/lib/utils";
import { anySocialEnabled, isReady, prepare, requestToken, SocialCancelled, socialEnabled, type Provider } from "./social";
import { openTelegram, useTelegramLink } from "./telegram";
import { TelegramWait } from "./TelegramWait";
import { useAfterSignIn } from "./useAfterSignIn";

/*
 * "Continue with Google / Facebook". A provider shows once its id is configured (src/features/auth/social.ts);
 * with neither configured the buttons stay visible but disabled, marked "coming soon".
 * Pages put the buttons above the email form when they work, below it while they don't.
 * `telegram` (sign-in page, while the API's bot is on) adds "Continue with Telegram": the bot asks the
 * customer to share their phone number, and the account that proved that number is signed in.
 */

/** What /sign-up/facebook needs from the first sign-in attempt (kept in memory only, never stored). */
export interface FacebookSignUpState {
  accessToken: string;
  profile: { name: string | null; email: string | null };
  /** Whether the API's Telegram bot is on (the customer can confirm their phone there). */
  telegram: boolean;
  next: string | null;
}

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

const TELEGRAM_ICON = (
  <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
    <circle cx="12" cy="12" r="12" fill="#229ED9" />
    <path
      fill="#FFFFFF"
      d="M5.4 11.8 17 7.3c.5-.2 1 .1.8.9l-2 9.4c-.1.7-.5.8-1.1.5l-3-2.2-1.4 1.4c-.2.2-.3.3-.6.3l.2-3.1 5.6-5c.2-.2 0-.3-.4-.1l-6.9 4.3-3-.9c-.6-.2-.7-.6.2-1Z"
    />
  </svg>
);

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

export function SocialButtons({ next = null, telegram = false }: { next?: string | null; telegram?: boolean }) {
  const enabled = (["google", "facebook"] as const).filter(socialEnabled);
  const afterSignIn = useAfterSignIn();
  const telegramLink = useTelegramLink("login", (customer) => {
    const firstName = customer.name?.split(" ")[0];
    afterSignIn(customer, next, firstName ? `Welcome back, ${firstName}` : "Welcome back");
  });
  const navigate = useNavigate();
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

  if (!anySocialEnabled() && !telegram) {
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

  const startTelegram = async () => {
    setError(null);
    const link = await telegramLink.start();
    if (link) openTelegram(link.url);
  };
  const telegramState = telegramLink.state;
  const telegramError = telegramState.phase === "failed" ? telegramState.message : null;

  const start = (provider: Provider) => {
    setError(null);
    telegramLink.cancel();
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
    let accessToken = "";
    token
      .then((t) => authApi.social(provider, (accessToken = t)))
      .then((response) => {
        const firstName = response.customer?.name?.split(" ")[0];
        afterSignIn(response.customer, next, firstName ? `Welcome, ${firstName}` : "Welcome to Bookly", { verifyBy: response.verify_by });
      })
      .catch((err: unknown) => {
        if (err instanceof SocialCancelled) return;
        const apiError = ApiError.from(err);
        // A new Facebook customer: the API wants their phone number first (owner's rule).
        if (apiError.data.needs === "phone") {
          const state: FacebookSignUpState = {
            accessToken,
            profile: (apiError.data.profile as FacebookSignUpState["profile"]) ?? { name: null, email: null },
            telegram: apiError.data.telegram === true,
            next,
          };
          navigate("/sign-up/facebook", { state });
          return;
        }
        if (err instanceof Error && err.message === "popup_blocked") {
          setError(`Your browser blocked the ${NAMES[provider]} window. Allow pop-ups for this site, then try again.`);
          return;
        }
        setError(apiError.message);
      })
      .finally(() => setBusy(null));
  };

  return (
    <div className="grid gap-4">
      {error || telegramError ? <FormAlert title={error ?? telegramError ?? undefined} /> : null}
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
        {telegram ? (
          telegramState.phase === "waiting" || telegramState.phase === "done" ? (
            telegramState.phase === "waiting" ? <TelegramWait url={telegramState.link.url} onCancel={telegramLink.cancel} /> : null
          ) : (
            <button
              type="button"
              onClick={() => void startTelegram()}
              disabled={busy !== null || telegramState.phase === "starting"}
              aria-busy={telegramState.phase === "starting" || undefined}
              className={cn(
                buttonClass,
                "outline-none hover:border-foreground/40 hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-70",
              )}
            >
              {telegramState.phase === "starting" ? (
                <Loader2 className="size-[18px] animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                TELEGRAM_ICON
              )}
              Continue with Telegram
            </button>
          )
        ) : null}
      </div>
      <Divider>or use your email</Divider>
    </div>
  );
}

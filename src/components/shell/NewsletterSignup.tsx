import { useState, type ChangeEvent, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { newsletterApi } from "@/api/endpoints/newsletter";
import { ApiError } from "@/api/errors";
import { useT } from "@/i18n";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle } from "lucide-react";

export function NewsletterSignup() {
  const { dict, lang } = useT();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (subEmail: string) =>
      newsletterApi.subscribe({
        email: subEmail,
        locale: lang === "km" ? "km" : "en",
      }),
    onSuccess: () => {
      setSubmitted(true);
      setError(null);
      setEmail("");
    },
    onError: (err: unknown) => {
      const msg = ApiError.from(err).message || dict.common.error;
      setError(msg);
    },
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim() || mutation.isPending) return;
    setError(null);
    mutation.mutate(email.trim());
  };

  return (
    <div className="grid content-start gap-2.5">
      <h3 className="font-serif text-base font-semibold text-foreground">
        {dict.newsletter.title}
      </h3>
      <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
        {dict.newsletter.subtitle}
      </p>

      {submitted ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:border-emerald-400/20 dark:text-emerald-300"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{dict.newsletter.subscribedSuccess}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="newsletter-email" className="sr-only">
              {dict.newsletter.emailPlaceholder}
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              value={email}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              placeholder={dict.newsletter.emailPlaceholder}
              disabled={mutation.isPending}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              type="submit"
              disabled={mutation.isPending || !email.trim()}
              className="h-10 shrink-0 font-medium"
            >
              {mutation.isPending ? dict.newsletter.subscribing : dict.newsletter.subscribeButton}
            </Button>
          </div>

          {error && (
            <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>{error}</span>
            </p>
          )}

          <p className="text-[12px] text-muted-foreground">
            {dict.newsletter.privacyNotice}
          </p>
        </form>
      )}
    </div>
  );
}

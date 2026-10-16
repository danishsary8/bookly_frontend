import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { newsletterApi } from "@/api/endpoints/newsletter";
import { useT } from "@/i18n";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function NewsletterUnsubscribePage() {
  const { dict } = useT();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error",
  );
  const [message, setMessage] = useState<string>("");
  const calledRef = useRef(false);

  useEffect(() => {
    if (!token || calledRef.current) return;
    calledRef.current = true;

    newsletterApi
      .unsubscribe(token)
      .then((res) => {
        setStatus("success");
        setMessage(res.message || dict.newsletter.unsubscribeSuccess);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(
          err?.response?.data?.message || dict.newsletter.unsubscribeError,
        );
      });
  }, [token, dict]);

  return (
    <div className="container-shell flex min-h-[60vh] items-center justify-center py-16">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-xs sm:p-8">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="size-8 animate-spin text-primary" />
            <h1 className="font-serif text-xl font-bold text-foreground">
              {dict.newsletter.unsubscribing}
            </h1>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-success-tint text-success">
              <CheckCircle2 className="size-8" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-foreground">
              {dict.newsletter.unsubscribeTitle}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {message || dict.newsletter.unsubscribeSuccess}
            </p>
            <Button asChild className="mt-4">
              <Link to="/">{dict.newsletter.backToHome}</Link>
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="size-8" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-foreground">
              {dict.newsletter.unsubscribeTitle}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {message || dict.newsletter.unsubscribeError}
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/">{dict.newsletter.backToHome}</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

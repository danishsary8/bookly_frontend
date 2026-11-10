import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { newsletterApi } from "@/api/endpoints/newsletter";
import { useT } from "@/i18n";
import { Button } from "@/components/ui/button";
import { StatusPanel } from "@/components/StatusPanel";

export default function NewsletterConfirmPage() {
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
      .confirm(token)
      .then((res) => {
        setStatus("success");
        setMessage(res.message || dict.newsletter.confirmSuccess);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(
          err?.response?.data?.message || dict.newsletter.confirmError,
        );
      });
  }, [token, dict]);

  if (status === "loading") return <StatusPanel tone="loading" title={dict.newsletter.confirming} />;
  return (
    <StatusPanel
      tone={status === "success" ? "success" : "error"}
      title={dict.newsletter.confirmTitle}
      actions={
        <Button asChild variant={status === "success" ? "default" : "outline"}>
          <Link to="/">{dict.newsletter.backToHome}</Link>
        </Button>
      }
    >
      <p>{message || (status === "success" ? dict.newsletter.confirmSuccess : dict.newsletter.confirmError)}</p>
    </StatusPanel>
  );
}

import { useState } from "react";
import { Download } from "lucide-react";
import { accountApi } from "@/api/endpoints/account";
import { ApiError } from "@/api/errors";
import { Button } from "@/components/ui/button";
import { toast } from "@/stores/toast";
import { useT } from "@/i18n";

/*
 * Account → Sign-in & security → Download my data: asks the API for everything the account holds and saves it as
 * bookly-my-data-YYYY-MM-DD.json. A 404 means the API doesn't offer the export yet, which is said plainly.
 */
export function DownloadMyData() {
  const [busy, setBusy] = useState(false);
  const { dict } = useT();
  const t = dict.downloadData;

  const download = async () => {
    setBusy(true);
    try {
      const data = await accountApi.exportData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `bookly-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t.started);
    } catch (err) {
      const error = ApiError.from(err);
      toast.error({ title: t.failed, description: error.kind === "not_found" ? t.unavailable : error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="download-data" className="grid max-w-xl gap-3 rounded-xl border border-border bg-card p-5 sm:p-6">
      <h2 id="download-data" className="font-display text-[1.563rem] leading-tight">
        {t.title}
      </h2>
      <p className="text-[15px] text-muted-foreground">{t.lead}</p>
      <Button variant="outline" className="justify-self-start" onClick={download} loading={busy}>
        <Download aria-hidden="true" /> {t.button}
      </Button>
    </section>
  );
}

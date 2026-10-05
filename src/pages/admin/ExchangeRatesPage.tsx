import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Clock } from "lucide-react";
import { opsApi, opsQueries } from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import { TextField } from "@/components/form/Field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { AdminPage } from "@/features/admin/AdminPage";
import { ListState, TableCard, td, th, thead } from "@/features/admin/listKit";
import { useListParams } from "@/features/admin/useListParams";
import { orderDateTime } from "@/features/orders/format";
import { toast } from "@/stores/toast";

const riel = new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 });
const showRate = (rate: string | number) => `${riel.format(Number(rate))}\u00A0៛`;

/** Rate: positive, at most 1,000,000 and 6 decimals (the API's rule). */
const rateError = (raw: string) => {
  const value = raw.trim().replace(/,/g, "");
  if (!value) return "Enter how many riel one US dollar buys.";
  if (!/^\d+(\.\d{1,6})?$/.test(value) || Number(value) <= 0) return "Use a positive number with at most 6 decimals, like 4100 or 4100.5.";
  if (Number(value) > 1_000_000) return "That rate is too high. Check the number.";
  return null;
};

function AddRateForm({ current }: { current: string | null }) {
  const queryClient = useQueryClient();
  const [rate, setRate] = useState("");
  const [when, setWhen] = useState("");
  const [errors, setErrors] = useState<{ rate?: string; effective_at?: string }>({});
  const add = useMutation({
    mutationFn: () => opsApi.addRate(rate.trim().replace(/,/g, ""), when ? new Date(when).toISOString() : undefined),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["staff", "rates"] });
      // Riel prices in the shop come from the current rate.
      void queryClient.invalidateQueries({ queryKey: ["catalog"] });
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success(saved.is_current ? { title: "New rate in use", description: `1 USD = ${showRate(saved.rate)}` } : { title: "Rate scheduled", description: `From ${orderDateTime(saved.effective_at)}` });
      setRate("");
      setWhen("");
    },
    onError: (err) => {
      const apiError = ApiError.from(err);
      setErrors({ rate: apiError.field("rate") ?? (apiError.field("effective_at") ? undefined : apiError.message), effective_at: apiError.field("effective_at") ?? undefined });
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const e = { rate: rateError(rate) ?? undefined };
    setErrors(e);
    if (!e.rate) add.mutate();
  };
  const change = current && !rateError(rate) ? ((Number(rate.replace(/,/g, "")) - Number(current)) / Number(current)) * 100 : null;
  return (
    <form onSubmit={submit} noValidate aria-labelledby="add-rate" className="grid content-start gap-4 rounded-xl border border-border bg-card p-5">
      <h2 id="add-rate" className="font-sans text-[1.0625rem] font-semibold tracking-normal">
        Set a new rate
      </h2>
      <TextField
        label="Riel per US dollar"
        inputMode="decimal"
        value={rate}
        onChange={(e) => {
          setRate(e.target.value);
          setErrors((prev) => ({ ...prev, rate: undefined }));
        }}
        error={errors.rate}
        hint={change !== null && Math.abs(change) >= 0.01 ? `${change > 0 ? "+" : ""}${change.toFixed(2)}% from the current rate` : "Up to 6 decimals."}
        autoComplete="off"
      />
      <TextField
        label="Starts"
        optional
        type="datetime-local"
        value={when}
        onChange={(e) => {
          setWhen(e.target.value);
          setErrors((prev) => ({ ...prev, effective_at: undefined }));
        }}
        error={errors.effective_at}
        hint="Empty for right away. Set a later time to schedule it."
      />
      <Button type="submit" loading={add.isPending} className="justify-self-start">
        Save rate
      </Button>
    </form>
  );
}

/*
 * /admin/exchange-rates (admins only): the USD → KHR rate used for riel prices.
 * Rates are never edited or deleted; a new one replaces the old from its start
 * time, so the history doubles as a record.
 */
export default function ExchangeRatesPage() {
  const { page, hrefFor } = useListParams();
  const rates = useQuery(opsQueries.rates(page));
  const meta = rates.data?.meta;
  const list = rates.data?.data ?? [];
  const current = meta?.current_rate ?? null;
  const [now] = useState(() => Date.now());

  return (
    <AdminPage title="Exchange rate" lead="Riel prices in the shop are worked out from US dollar prices with this rate.">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid content-start gap-6">
          <section aria-labelledby="current-rate" className="hero-lapis grid gap-1 rounded-xl p-6">
            <h2 id="current-rate" className="font-sans text-sm font-semibold uppercase tracking-[0.12em] opacity-80">
              Current rate
            </h2>
            <p className="flex flex-wrap items-baseline gap-x-3 font-display text-[2.25rem] leading-tight tabular-nums">
              {current ? (
                <>
                  1 USD <ArrowLeftRight className="size-6 self-center opacity-70" aria-label="equals" /> {showRate(current)}
                </>
              ) : rates.data ? (
                "Not set yet"
              ) : (
                "…"
              )}
            </p>
          </section>
          <section aria-labelledby="rate-history" className="grid gap-3">
            <h2 id="rate-history" className="font-sans text-[1.0625rem] font-semibold tracking-normal">
              History
            </h2>
            <ListState query={rates} empty={{ when: list.length === 0, icon: ArrowLeftRight, title: "No rates yet", description: "Set the first one with the form." }}>
              <TableCard stale={rates.isPlaceholderData} minWidth={320}>
                <thead className={thead}>
                  <tr>
                    <th scope="col" className={`${th} text-right`}>Riel per dollar</th>
                    <th scope="col" className={th}>From</th>
                    <th scope="col" className={th}>
                      <span className="sr-only">State</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.map((r) => (
                    <tr key={r.id}>
                      <td className={`${td} text-right font-semibold tabular-nums`}>{showRate(r.rate)}</td>
                      <td className={`${td} whitespace-nowrap text-sm`}>{orderDateTime(r.effective_at)}</td>
                      <td className={td}>
                        {r.is_current ? (
                          <Badge tone="success" shape="tint">
                            In use
                          </Badge>
                        ) : new Date(r.effective_at).getTime() > now ? (
                          <Badge tone="warning" shape="outline">
                            <Clock aria-hidden="true" /> Scheduled
                          </Badge>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableCard>
            </ListState>
            <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} hrefFor={hrefFor} />
          </section>
        </div>
        <AddRateForm current={current} />
      </div>
    </AdminPage>
  );
}

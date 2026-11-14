import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Laptop, LogOut, Smartphone } from "lucide-react";
import { accountApi, accountKeys, accountQueries, type CustomerSession } from "@/api/endpoints/account";
import { ApiError } from "@/api/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/i18n";
import { toast } from "@/stores/toast";

/*
 * Account → Sign-in & security → "Where you're signed in": every device with a sign-in (GET /me/sessions), this one
 * first-marked, with "Sign out" for any other device and "Sign out of all other devices". Signing out this device is
 * the normal Sign out. Hidden when the API doesn't offer the list yet (404).
 */
const PHONE = /iphone|android|ipad/i;

export function SignedInDevices() {
  const { dict, locale } = useT();
  const t = dict.sessions;
  const queryClient = useQueryClient();
  const sessions = useQuery(accountQueries.sessions());
  const [busyId, setBusyId] = useState<number | null>(null);
  const when = (iso: string | null) =>
    iso ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)) : "—";

  const done = (message: string) => {
    toast.success(message);
    void queryClient.invalidateQueries({ queryKey: accountKeys.sessions() });
  };
  const fail = (err: unknown) => toast.error({ title: t.failed, description: ApiError.from(err).message });

  const signOutOne = useMutation({
    mutationFn: (id: number) => accountApi.signOutSession(id),
    onMutate: (id) => setBusyId(id),
    onSuccess: () => done(t.signedOutOne),
    onError: fail,
    onSettled: () => setBusyId(null),
  });
  const signOutOthers = useMutation({
    mutationFn: accountApi.signOutOtherSessions,
    onSuccess: (r) => done(t.signedOutOthers(r.signed_out)),
    onError: fail,
  });

  if (sessions.isError && ApiError.from(sessions.error).kind === "not_found") return null;

  const list: CustomerSession[] = [...(sessions.data ?? [])].sort((a, b) => Number(b.is_current) - Number(a.is_current));
  const others = list.filter((s) => !s.is_current).length;

  return (
    <section aria-labelledby="signed-in-devices" className="grid max-w-xl gap-4 shop-card rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="grid gap-1">
        <h2 id="signed-in-devices" className="account-panel-title"><Laptop aria-hidden="true" />
          {t.title}
        </h2>
        <p className="text-[15px] text-muted-foreground">{t.lead}</p>
      </div>

      {sessions.isPending ? (
        <div className="grid gap-2" aria-hidden="true">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : sessions.isError ? (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {t.loadFailed}
        </p>
      ) : (
        <ul className="grid divide-y divide-border rounded-lg border border-border">
          {list.map((s) => {
            const name = s.device ?? t.unknownDevice;
            const Icon = s.device && PHONE.test(s.device) ? Smartphone : Laptop;
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-3 p-3">
                <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    <span className="break-words">{name}</span>
                    {s.is_current ? <Badge tone="info" size="sm">{t.thisDevice}</Badge> : null}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {[s.last_used_at ? t.lastUsed(when(s.last_used_at)) : t.signedIn(when(s.signed_in_at)), s.ip_address].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {s.is_current ? null : (
                  <Button
                    variant="outline"
                    size="sm"
                    loading={busyId === s.id}
                    disabled={signOutOthers.isPending}
                    onClick={() => signOutOne.mutate(s.id)}
                    aria-label={t.signOutDevice(name)}
                  >
                    {t.signOut}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {sessions.isSuccess ? (
        others > 0 ? (
          <Button variant="outline" className="justify-self-start" loading={signOutOthers.isPending} disabled={busyId !== null} onClick={() => signOutOthers.mutate()}>
            <LogOut aria-hidden="true" /> {t.signOutOthers}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">{t.onlyThis}</p>
        )
      ) : null}
    </section>
  );
}

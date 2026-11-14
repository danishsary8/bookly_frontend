import { ArrowRight, BookOpen, ClipboardCheck, Headphones, PackageCheck, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { useT } from "@/i18n";

/** Describes existing eligibility checks; dates and approval remain the API's decision. */
export function ReturnGuide() {
  const { dict } = useT();
  const t = dict.returns;
  const steps = [
    { Icon: BookOpen, title: t.guideOrder, lead: t.guideOrderLead },
    { Icon: ClipboardCheck, title: t.guideRequest, lead: t.guideRequestLead },
    { Icon: PackageCheck, title: t.guideApproval, lead: t.guideApprovalLead },
  ];
  return (
    <section aria-labelledby="return-guide-title" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-xl">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary"><ShieldCheck className="size-4" aria-hidden="true" />{t.guideEyebrow}</p>
          <h2 id="return-guide-title" className="font-display text-2xl leading-tight">{t.guideTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.rulesNote}</p>
        </div>
        <Link to="/account/orders?status=delivered" className={buttonVariants({ className: "min-h-11 rounded-xl" })}>{t.deliveredOrders}<ArrowRight aria-hidden="true" /></Link>
      </div>
      <ol className="mt-6 grid gap-4 border-t border-border pt-5 xl:grid-cols-3">
        {steps.map(({ Icon, title, lead }, i) => (
          <li key={title} className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-lapis-tint text-primary"><Icon className="size-4" aria-hidden="true" /></span>
            <div><h3 className="text-sm font-semibold"><span className="mr-1.5 text-muted-foreground">{i + 1}.</span>{title}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{lead}</p></div>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4 text-sm font-semibold text-primary">
        <Link className="inline-flex min-h-11 items-center underline-offset-4 hover:underline" to="/returns-policy">{t.policyLink}</Link>
        <Link className="inline-flex min-h-11 items-center gap-2 underline-offset-4 hover:underline" to="/contact"><Headphones className="size-4" aria-hidden="true" />{t.helpLink}</Link>
      </div>
    </section>
  );
}

export function ReturnPolicyNote() {
  const { dict } = useT();
  return <aside className="rounded-xl border border-border bg-lapis-tint/30 p-4 text-sm leading-relaxed"><p className="font-semibold">{dict.returns.beforeSubmit}</p><p className="mt-1 text-muted-foreground">{dict.returns.rulesNote}</p><p className="mt-2 text-muted-foreground">{dict.returns.waitForApproval}</p><Link to="/returns-policy" className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">{dict.returns.policyLink}</Link></aside>;
}

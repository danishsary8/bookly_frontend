import type { ReactNode } from "react";
import { BellRing, BookOpen, MapPin, Star, Tablet, Users, type LucideIcon } from "lucide-react";
import type { DashboardInsights } from "@/api/endpoints/dashboardInsights";
import type { DashboardSummary } from "@/api/endpoints/staff";
import MagicBento, { type MagicBentoItem } from "@/components/reactbits/MagicBento";
import "@/components/reactbits/MagicBento.css";
import { useTheme } from "@/contexts/ThemeContext";
import { useT } from "@/i18n";
import { AnimatedNumber } from "./AnimatedNumber";

/*
 * "At a glance" (owner 2026-11-15): the React Bits MagicBento grid (border glow, spotlight, click ripple) filled with
 * the shop's own figures. Each card opens the page behind its number. The grid drops to 2 columns and then 1 by
 * itself on narrow screens. Every figure is real text (screen readers, tests); the small bars are decoration.
 */

type Tone = "coral" | "saffron" | "sky" | "sea";
const count = (n: number) => Math.round(n).toLocaleString("en-US");

function Tile({ id, tone, icon: Icon, title, children }: { id: string; tone: Tone; icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} data-tone={tone} className="flex h-full w-full flex-col gap-2 text-foreground">
      <h3 id={id} className="flex items-center gap-2.5 text-sm font-semibold text-muted-foreground">
        <span aria-hidden="true" className="dash-kpi-icon !size-8"><Icon className="size-4" /></span>
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Small decorative columns for a daily series, in the tile's colour, tallest = full height. */
function Bars({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const shown = values.slice(-14);
  return (
    <span aria-hidden="true" className="mt-auto flex h-12 items-end gap-[3px]">
      {shown.map((v, i) => (
        <span
          key={i}
          className="admin-grow-y flex-1 rounded-t-[3px]"
          style={{ height: `${Math.max(6, (v / max) * 100)}%`, background: "var(--tone-fill)", opacity: 0.35 + 0.65 * ((i + 1) / shown.length), animationDelay: `${i * 30}ms` }}
        />
      ))}
    </span>
  );
}

/** Two shares side by side as one bar, with both figures in words underneath. */
function Split({ a, b }: { a: number; b: number }) {
  const total = a + b || 1;
  return (
    <span aria-hidden="true" className="flex h-2.5 w-full gap-1 overflow-hidden rounded-full">
      <span className="admin-bar h-full rounded-full" style={{ width: `${(a / total) * 100}%`, background: "var(--tone-fill)" }} />
      <span className="h-full flex-1 rounded-full" style={{ background: "color-mix(in oklab, var(--tone-fill) 28%, transparent)" }} />
    </span>
  );
}

export function GlanceBento({ s, ins }: { s: DashboardSummary; ins?: DashboardInsights }) {
  const { dict } = useT();
  const { isDark } = useTheme();
  const trend = ins?.trend ?? [];
  const items: MagicBentoItem[] = [];

  if (s.books_sold !== undefined && s.ebooks_sold !== undefined) {
    items.push({
      id: "books",
      href: "/admin/reports?tab=products",
      content: (
        <Tile id="books-sold" tone="coral" icon={BookOpen} title={dict.dashboardCopies.books}>
          <AnimatedNumber value={s.books_sold} format={count} className="text-[2rem] font-semibold leading-none tracking-[-0.02em] tabular-nums" />
          <p className="text-sm text-muted-foreground">{dict.dashboardCopies.detail}</p>
          <Bars values={trend.map((d) => d.books_sold ?? 0)} />
        </Tile>
      ),
    });
    items.push({
      id: "ebooks",
      href: "/admin/reports?tab=products",
      content: (
        <Tile id="ebooks-sold" tone="sky" icon={Tablet} title={dict.dashboardCopies.ebooks}>
          <AnimatedNumber value={s.ebooks_sold} format={count} className="text-[2rem] font-semibold leading-none tracking-[-0.02em] tabular-nums" />
          <p className="text-sm text-muted-foreground">{dict.dashboardCopies.detail}</p>
          <Bars values={trend.map((d) => d.ebooks_sold ?? 0)} />
        </Tile>
      ),
    });
  }

  if (ins?.order_ratings) {
    const avg = ins.order_ratings.average;
    items.push({
      id: "rating",
      href: "/admin/ratings",
      content: (
        <Tile id="order-rating" tone="saffron" icon={Star} title={dict.ratings.title}>
          <p className="text-[2rem] font-semibold leading-none tabular-nums">
            {avg ?? "—"}
            <span className="text-base font-normal text-muted-foreground"> / 5</span>
          </p>
          <p className="text-sm text-muted-foreground tabular-nums">{dict.adminHome.ratings.replace("{n}", String(ins.order_ratings.count))}</p>
          <span aria-hidden="true" className="mt-auto flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className="size-5" style={{ color: "var(--tone-fill)", fill: avg != null && n <= Math.round(avg) ? "var(--tone-fill)" : "transparent" }} />
            ))}
          </span>
        </Tile>
      ),
    });
  }

  if (ins?.attention) {
    const a = ins.attention;
    const open = a.pending_orders + a.open_returns + a.waiting_orders + a.open_chats;
    items.push({
      id: "attention",
      href: "/admin/orders?status=pending",
      content: (
        <Tile id="needs-attention" tone="sea" icon={BellRing} title={dict.dashboardActivity.attention}>
          <AnimatedNumber value={open} format={count} className="text-[2rem] font-semibold leading-none tracking-[-0.02em] tabular-nums" />
          <p className="text-sm text-muted-foreground tabular-nums">{a.pending_orders} {dict.dashboardActivity.pending.toLowerCase()} · {a.open_returns} {dict.dashboardActivity.returns.toLowerCase()} · {a.open_chats} {dict.dashboardActivity.chats.toLowerCase()}</p>
          {a.low_stock ? <p className="mt-auto text-sm font-semibold" style={{ color: "var(--tone-ink)" }}>{a.low_stock} {dict.dashboardActivity.stock.toLowerCase()}</p> : null}
        </Tile>
      ),
    });
  }

  if (ins?.repeat_customer_rate) {
    const r = ins.repeat_customer_rate;
    items.push({
      id: "buyers",
      href: "/admin/customers",
      colSpan: 2,
      content: (
        <Tile id="buyers" tone="sea" icon={Users} title={dict.dashboardBuyers.title}>
          <p className="text-[2rem] font-semibold leading-none tabular-nums">
            <AnimatedNumber value={r.customers} format={count} />
            <span className="ml-2 text-base font-normal text-muted-foreground">buyers</span>
          </p>
          <div className="mt-auto grid gap-2">
            <Split a={r.returning} b={r.customers - r.returning} />
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted-foreground">{dict.dashboardPrint.firstTime}</dt><dd className="text-lg font-semibold tabular-nums">{r.customers - r.returning}</dd></div>
              <div><dt className="text-muted-foreground">{dict.dashboardPrint.returning}</dt><dd className="text-lg font-semibold tabular-nums">{r.returning}</dd></div>
            </dl>
          </div>
        </Tile>
      ),
    });
  }

  if (ins?.delivery_areas) {
    const d = ins.delivery_areas;
    items.push({
      id: "areas",
      href: "/admin/orders",
      colSpan: 2,
      content: (
        <Tile id="delivery-areas" tone="coral" icon={MapPin} title={dict.dashboardAreas.title}>
          <p className="text-sm text-muted-foreground">{dict.dashboardAreas.note}</p>
          <div className="mt-auto grid gap-2">
            <Split a={d.phnom_penh} b={d.provinces + d.unknown} />
            <dl className="grid grid-cols-3 gap-3 text-sm">
              <div><dt className="text-muted-foreground">{dict.dashboardAreas.phnomPenh}</dt><dd className="text-lg font-semibold tabular-nums">{d.phnom_penh}</dd></div>
              <div><dt className="text-muted-foreground">{dict.dashboardAreas.provinces}</dt><dd className="text-lg font-semibold tabular-nums">{d.provinces}</dd></div>
              <div><dt className="text-muted-foreground">{dict.dashboardAreas.unknown}</dt><dd className="text-lg font-semibold tabular-nums">{d.unknown}</dd></div>
            </dl>
          </div>
        </Tile>
      ),
    });
  }

  if (!items.length) return null;
  return (
    <MagicBento
      items={items}
      columns={4}
      rowHeight={200}
      gap={12}
      radius={20}
      theme={isDark ? "dark" : "light"}
      glowColor={isDark ? "#F07A60" : "#D35D45"}
      textAutoHide={false}
      enableBorderGlow
      enableSpotlight
      spotlightRadius={300}
      clickEffect
      className="dash-bento"
    />
  );
}

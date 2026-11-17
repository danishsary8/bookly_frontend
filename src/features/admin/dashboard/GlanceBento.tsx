import type { ReactNode } from "react";
import { BookOpen, Star, Tablet, type LucideIcon } from "lucide-react";
import type { DashboardInsights } from "@/api/endpoints/dashboardInsights";
import type { DashboardSummary } from "@/api/endpoints/staff";
import MagicBento, { type MagicBentoItem } from "@/components/reactbits/MagicBento";
import "@/components/reactbits/MagicBento.css";
import { useTheme } from "@/contexts/ThemeContext";
import { useT } from "@/i18n";
import { AnimatedNumber } from "./AnimatedNumber";
import { DailyBars } from "./MiniCharts";

/*
 * "At a glance" (owner 2026-11-15): the React Bits MagicBento grid (border glow, spotlight, click ripple) filled with
 * the shop's own figures. Each card opens the page behind its number. The grid drops to 2 columns and then 1 by
 * itself on narrow screens. Delivery areas, Needs attention and Customers who ordered were removed (owner 2026-11-17):
 * they repeated Orders by province, the Shop activity panel and Repeat customers further down. Every figure is real text (screen readers, tests); the small bars are decoration.
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
          <DailyBars name={dict.dashboardCopies.books} points={trend.map((d) => ({ label: d.date, value: d.books_sold }))} />
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
          <DailyBars name={dict.dashboardCopies.ebooks} points={trend.map((d) => ({ label: d.date, value: d.ebooks_sold }))} />
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




  if (!items.length) return null;
  return (
    <MagicBento
      items={items}
      columns={Math.min(3, items.length)}
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

import type { LucideIcon } from "lucide-react";

export function FeatureUnavailable({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) {
  return <section className="admin-feature-off"><Icon aria-hidden="true" /><h2 className="text-lg font-semibold">{title}</h2><p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p></section>;
}

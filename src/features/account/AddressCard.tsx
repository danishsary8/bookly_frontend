import { MapPin, Pencil, Star, Trash2 } from "lucide-react";
import type { Address } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatAddressLines } from "./address";

/** One saved address with edit / delete / make-default actions. */
type Props = {
  address: Address;
  onEdit?: () => void;
  onDelete?: () => void;
  onMakeDefault?: () => void;
  busy?: boolean;
  className?: string;
};

export function AddressCard({ address, onEdit, onDelete, onMakeDefault, busy, className }: Props) {
  const title = address.label || address.recipient_name || "Address";
  return (
    <article
      aria-label={`${title}${address.is_default ? ", default address" : ""}`}
      className={cn("grid h-full content-between gap-4 rounded-xl border bg-card p-5", address.is_default ? "border-primary" : "border-border", className)}
    >
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <MapPin className="size-[18px] text-primary" aria-hidden="true" />
            {title}
          </h2>
          {address.is_default ? (
            <Badge tone="info" shape="solid">
              <Star aria-hidden="true" /> Default
            </Badge>
          ) : null}
        </div>
        <address className="grid gap-0.5 not-italic leading-6">
          <span className="font-medium">{address.recipient_name}</span>
          {formatAddressLines(address).map((line) => (
            <span key={line} className="text-muted-foreground">
              {line}
            </span>
          ))}
          <span className="tabular-nums text-muted-foreground">{address.phone}</span>
        </address>
      </div>
      {onEdit || onDelete || onMakeDefault ? (
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          {onEdit ? (
            <Button variant="outline" size="sm" onClick={onEdit} disabled={busy} aria-label={`Edit ${title}`}>
              <Pencil aria-hidden="true" /> Edit
            </Button>
          ) : null}
          {onMakeDefault && !address.is_default ? (
            <Button variant="ghost" size="sm" onClick={onMakeDefault} disabled={busy} aria-label={`Make ${title} the default address`}>
              Make default
            </Button>
          ) : null}
          {onDelete ? (
            <Button variant="ghost" size="sm" onClick={onDelete} disabled={busy} aria-label={`Delete ${title}`} className="ml-auto text-destructive hover:bg-destructive-tint">
              <Trash2 aria-hidden="true" /> Delete
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

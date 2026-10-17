import { useState } from "react";
import { BookMarked, BookOpen, CheckCircle2, Heart, Loader2, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { accountApi } from "@/api/endpoints/account";
import type { WishlistBookCard, WishlistReadingStatus } from "@/api/types";
import { useCoverMorphNavigate, useMorphLayoutId } from "@/components/catalog/coverMorph";
import SpotlightCard from "@/components/SpotlightCard";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { formatMoney, useCurrency } from "@/stores/currency";
import { toast } from "@/stores/toast";

type WishlistCardProps = {
  book: WishlistBookCard;
  onRemove: (book: WishlistBookCard) => void;
  onAddToCart?: (book: WishlistBookCard) => void;
  onStatusChange?: (bookId: number, status: WishlistReadingStatus) => void;
  adding?: boolean;
};

export function WishlistCard({
  book,
  onRemove,
  onAddToCart,
  onStatusChange,
  adding = false,
}: WishlistCardProps) {
  const { dict } = useT();
  const a = dict.account;
  const currency = useCurrency();
  const morphTo = useCoverMorphNavigate();
  const key = `wishlist-card-${book.id}`;
  const layoutId = useMorphLayoutId(book.id!, key);
  const href = `/books/${book.id}`;

  const currentStatus: WishlistReadingStatus = book.wishlist_status ?? "want_to_read";
  const [updating, setUpdating] = useState(false);

  const statusLabels: Record<WishlistReadingStatus, string> = {
    want_to_read: a.readingStatusWantToRead,
    reading: a.readingStatusReading,
    finished: a.readingStatusFinished,
  };

  const statusIcons: Record<WishlistReadingStatus, typeof BookMarked> = {
    want_to_read: BookMarked,
    reading: BookOpen,
    finished: CheckCircle2,
  };

  const statusTones: Record<WishlistReadingStatus, string> = {
    want_to_read: "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80",
    reading: "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15",
    finished: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15",
  };

  const handleStatusSelect = async (status: WishlistReadingStatus) => {
    if (status === currentStatus || updating) return;
    setUpdating(true);
    try {
      await accountApi.updateWishlistStatus(book.id!, status);
      toast.success(a.statusUpdated);
      onStatusChange?.(book.id!, status);
    } catch {
      toast.error(dict.cartPage.wishlistFailed);
    } finally {
      setUpdating(false);
    }
  };

  const StatusIcon = statusIcons[currentStatus];
  const authors = book.authors?.map((author) => author.name).join(", ");
  const outOfStock = !book.in_stock;

  return (
    <SpotlightCard className="flex h-full flex-col p-3 sm:p-4">
      <div className="relative aspect-2/3 w-full overflow-hidden rounded-md bg-muted">
        <Link
          to={href}
          onClick={(e) => morphTo(e, book, key)}
          tabIndex={-1}
          aria-hidden="true"
          className="group block size-full outline-none"
        >
          {book.cover_image_url ? (
            <img
              src={book.cover_image_url}
              alt=""
              style={{ viewTransitionName: layoutId }}
              className={cn(
                "size-full object-cover transition-transform duration-300 group-hover:scale-105",
                outOfStock && "grayscale opacity-60",
              )}
            />
          ) : (
            <div
              style={{ viewTransitionName: layoutId }}
              className="flex size-full items-center justify-center p-4 text-center text-xs text-muted-foreground"
            >
              {book.title}
            </div>
          )}
        </Link>

        {/* Remove from wishlist button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onRemove(book)}
          aria-label={dict.cards.saveToWishlist(book.title ?? "")}
          className="absolute right-2 top-2 rounded-full border-transparent bg-card/95 shadow-sm text-accent-text hover:bg-card"
        >
          <Heart className="fill-current size-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="mt-3 flex flex-1 flex-col">
        {/* Reading Status Pill Dropdown */}
        <div className="mb-2">
          <Select
            value={currentStatus}
            onValueChange={(val) => handleStatusSelect(val as WishlistReadingStatus)}
            disabled={updating}
          >
            <SelectTrigger
              aria-label={a.readingStatusChange}
              className={cn(
                "h-7 w-auto rounded-full border px-2.5 py-0 text-xs font-semibold shadow-none",
                statusTones[currentStatus],
              )}
            >
              <span className="flex items-center gap-1.5">
                {updating ? (
                  <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                ) : (
                  <StatusIcon className="size-3 shrink-0" aria-hidden="true" />
                )}
                <span>{statusLabels[currentStatus]}</span>
              </span>
            </SelectTrigger>
            <SelectContent align="start" className="min-w-[11rem]">
              {(["want_to_read", "reading", "finished"] as const).map((status) => {
                const ItemIcon = statusIcons[status];
                return (
                  <SelectItem
                    key={status}
                    value={status}
                    className="text-xs font-medium cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <ItemIcon className="size-3.5 text-muted-foreground" />
                      <span>{statusLabels[status]}</span>
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <h3 className="font-display text-[1.125rem] leading-snug">
          <Link
            to={href}
            onClick={(e) => morphTo(e, book, key)}
            className="line-clamp-2 min-h-[2.75em] text-foreground underline-offset-4 outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring"
          >
            {book.title}
          </Link>
        </h3>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
          {authors ? dict.homePage.by(authors) : "\u00A0"}
        </p>
        <StarRating value={book.rating_avg} count={book.review_count} compact className="mt-2" />

        <div className="mt-auto flex min-h-14 items-center justify-between gap-2 border-t border-border pt-3">
          <p className={cn("tabular-nums", outOfStock ? "text-muted-foreground" : "text-foreground")}>
            {(book.formats?.length ?? 0) > 1 ? (
              <span className="mr-1 text-sm text-muted-foreground">{dict.cards.from}</span>
            ) : null}
            <span className="text-lg font-semibold">
              {formatMoney(book.price_from_usd, book.price_from_khr, currency)}
            </span>
          </p>
          {onAddToCart && !outOfStock ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => onAddToCart(book)}
              disabled={adding}
              aria-busy={adding || undefined}
              aria-label={dict.cards.addToCart(book.title ?? "")}
              className="rounded-full"
            >
              {adding ? (
                <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <ShoppingBag aria-hidden="true" />
              )}
            </Button>
          ) : null}
        </div>
      </div>
    </SpotlightCard>
  );
}

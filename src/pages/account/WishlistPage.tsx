import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookMarked, BookOpen, CheckCircle2, Heart } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { accountApi, accountQueries } from "@/api/endpoints/account";
import type { WishlistBookCard, WishlistReadingStatus } from "@/api/types";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { BookCardSkeleton } from "@/components/BookCardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { SkeletonGroup } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountSection } from "@/features/account/AccountSection";
import { WishlistCard } from "@/features/account/WishlistCard";
import { useAddToCart } from "@/components/catalog/useCatalogActions";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import useSkeletonVisible from "@/hooks/useSkeletonVisible";
import { rangeText, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast";

const PER_PAGE = 24;

export default function WishlistPage() {
  const { dict } = useT();
  const a = dict.account;
  useDocumentTitle(a.wishlist);
  const queryClient = useQueryClient();
  const cart = useAddToCart();

  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const rawStatus = params.get("status") as WishlistReadingStatus | null;
  const currentStatus: WishlistReadingStatus | "all" =
    rawStatus === "want_to_read" || rawStatus === "reading" || rawStatus === "finished"
      ? rawStatus
      : "all";

  const wishlistQuery = useQuery({
    ...accountQueries.wishlist({
      page,
      per_page: PER_PAGE,
      status: currentStatus === "all" ? undefined : currentStatus,
    }),
    placeholderData: (previous) => previous,
  });

  const showSkeleton = useSkeletonVisible(wishlistQuery.isPending);
  const data = wishlistQuery.data;
  const books = data?.data ?? [];
  const meta = data?.meta;
  const counts = meta?.counts;

  const handleTabChange = (val: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (val === "all") {
          next.delete("status");
        } else {
          next.set("status", val);
        }
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  };

  const handleRemove = async (book: WishlistBookCard) => {
    try {
      await accountApi.removeFromWishlist(book.id!);
      queryClient.invalidateQueries({ queryKey: ["account", "wishlist"] });
      toast.success({
        title: dict.cartPage.unsaved,
        description: book.title,
        action: {
          label: dict.cartPage.undo,
          onClick: async () => {
            await accountApi.addToWishlist(book.id!, book.wishlist_status);
            queryClient.invalidateQueries({ queryKey: ["account", "wishlist"] });
          },
        },
      });
    } catch {
      toast.error(dict.cartPage.wishlistFailed);
    }
  };

  const handleStatusChange = () => {
    queryClient.invalidateQueries({ queryKey: ["account", "wishlist"] });
  };

  return (
    <AccountSection
      title={a.wishlist}
      lead={
        meta && meta.total
          ? rangeText(dict, meta.from, meta.to, meta.total, dict.nouns.book(meta.total))
          : a.wishlistLead
      }
    >
      {/* Reading status filter tabs; the list below is the active tab's panel, so each tab points at real content. */}
      <Tabs value={currentStatus} onValueChange={handleTabChange}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">
            <span>{a.readingStatusAll}</span>
            {counts?.all !== undefined ? (
              <span className="ml-1.5 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold tabular-nums text-foreground">
                {counts.all}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="want_to_read" className="gap-1.5">
            <BookMarked className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>{a.readingStatusWantToRead}</span>
            {counts?.want_to_read !== undefined ? (
              <span className="ml-1.5 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold tabular-nums text-foreground">
                {counts.want_to_read}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="reading" className="gap-1.5">
            <BookOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>{a.readingStatusReading}</span>
            {counts?.reading !== undefined ? (
              <span className="ml-1.5 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold tabular-nums text-foreground">
                {counts.reading}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="finished" className="gap-1.5">
            <CheckCircle2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>{a.readingStatusFinished}</span>
            {counts?.finished !== undefined ? (
              <span className="ml-1.5 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold tabular-nums text-foreground">
                {counts.finished}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={currentStatus}>
        {wishlistQuery.isError && !wishlistQuery.data ? (
          <ErrorState
            error={wishlistQuery.error}
            onRetry={() => wishlistQuery.refetch()}
            headingLevel="h2"
            showHomeLink={false}
          />
        ) : wishlistQuery.isPending && showSkeleton ? (
          <SkeletonGroup
            label={dict.cards.loadingBooks}
            className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-3"
          >
            {Array.from({ length: 6 }, (_, i) => (
              <BookCardSkeleton key={i} />
            ))}
          </SkeletonGroup>
        ) : books.length === 0 ? (
          <EmptyState
            icon={Heart}
            title={
              currentStatus === "all"
                ? a.wishlistEmpty
                : a.readingStatusEmpty(
                    currentStatus === "want_to_read"
                      ? a.readingStatusWantToRead
                      : currentStatus === "reading"
                        ? a.readingStatusReading
                        : a.readingStatusFinished,
                  )
            }
            description={currentStatus === "all" ? a.wishlistEmptyLead : a.wishlistLead}
            action={
              <Link to="/books" className={buttonVariants()}>
                {a.discoverBooks}
              </Link>
            }
            className="rounded-xl border border-dashed border-border"
          />
        ) : (
          <Stagger
            as="ul"
            key={`${currentStatus}-${books.map((b) => b.id).join(",")}`}
            className={cn(
              "grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-3 transition-opacity duration-150",
              wishlistQuery.isPlaceholderData && "opacity-60",
            )}
          >
            {books.map((book, index) => (
              <StaggerItem as="li" key={book.id} index={index}>
                <WishlistCard
                  book={book}
                  onRemove={handleRemove}
                  onAddToCart={cart.add}
                  onStatusChange={handleStatusChange}
                  adding={cart.pendingBookId === book.id}
                />
              </StaggerItem>
            ))}
          </Stagger>
        )}

        <Pagination
          page={meta?.current_page ?? 1}
          lastPage={meta?.last_page ?? 1}
          hrefFor={(p) => {
            const next = new URLSearchParams(params);
            if (p > 1) next.set("page", String(p));
            else next.delete("page");
            const s = next.toString();
            return s ? `?${s}` : "?";
          }}
          className="mt-6"
        />
        </TabsContent>
      </Tabs>
    </AccountSection>
  );
}

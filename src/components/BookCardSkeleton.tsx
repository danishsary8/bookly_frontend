/**
 * Loading skeletons for the catalogue (MASTER §6.11).
 *
 * Geometry is taken from the spec: a 2:3 cover block at radius 2, then three
 * lines at 30% / 90% / 60% width (12px, 18px, 14px tall), then a price bar at
 * 40% beside a 44x44 circle.
 */

export const BookCardSkeleton = () => (
  <div className="rounded-xl border border-border bg-card p-3">
    <div className="skeleton aspect-[2/3] w-full rounded-sm" />

    <div className="mt-3 space-y-2">
      <div className="skeleton h-3 w-[30%] rounded-sm" />
      <div className="skeleton h-[18px] w-[90%] rounded-sm" />
      <div className="skeleton h-3.5 w-[60%] rounded-sm" />
    </div>

    <div className="mt-4 flex items-center justify-between gap-3">
      <div className="skeleton h-4 w-[40%] rounded-sm" />
      <div className="skeleton h-11 w-11 shrink-0 rounded-full" />
    </div>
  </div>
);

interface BookGridSkeletonProps {
  count?: number;
  label?: string;
  /** Include the page-level header bars above the grid (§6.11 "page-level"). */
  withHeader?: boolean;
}

export const BookGridSkeleton = ({
  count = 8,
  label = "Loading books…",
  withHeader = false,
}: BookGridSkeletonProps) => (
  <div aria-busy="true" aria-live="polite">
    <span className="sr-only">{label}</span>

    {withHeader ? (
      <div className="mb-8 space-y-4">
        <div className="skeleton h-3.5 w-48 rounded-sm" />
        <div className="skeleton h-9 w-[40%] rounded-sm" />
        <div className="skeleton h-5 w-[70%] rounded-sm" />
      </div>
    ) : null}

    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <BookCardSkeleton key={index} />
      ))}
    </div>
  </div>
);

export default BookCardSkeleton;

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

/** The frameless catalogue card (cover, format line, title, author, price), same height as the real card. */
export const BookCardSkeletonFrameless = () => (
  <div>
    <div className="skeleton aspect-[2/3] w-full rounded-lg" />
    <div className="mt-3.5 space-y-2 px-0.5">
      <div className="skeleton h-3 w-[35%] rounded-sm" />
      <div className="skeleton h-[18px] w-[90%] rounded-sm" />
      <div className="skeleton h-3.5 w-[55%] rounded-sm" />
      <div className="flex justify-between pt-3">
        <div className="skeleton h-3.5 w-[30%] rounded-sm" />
        <div className="skeleton h-4 w-[22%] rounded-sm" />
      </div>
    </div>
  </div>
);

export default BookCardSkeleton;

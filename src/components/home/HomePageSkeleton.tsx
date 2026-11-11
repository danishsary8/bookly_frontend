import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { useT } from "@/i18n";

function HeadingPlaceholder({ centered = false }: { centered?: boolean }) {
  return (
    <div className={`mb-6 grid gap-3 ${centered ? "justify-items-center" : ""}`}>
      <Skeleton className="h-2.5 w-28 rounded-full" />
      <Skeleton className="h-8 w-56 max-w-full rounded-lg" />
    </div>
  );
}

function CoverPlaceholder({ className = "" }: { className?: string }) {
  return <Skeleton className={`aspect-[2/3] rounded-md ${className}`} />;
}

/** No image requests or fake content: the first visit mirrors the real home page's proportions. */
export function HomePageSkeleton() {
  const { dict } = useT();
  return (
    <SkeletonGroup label={dict.ui.loadingPage} data-testid="home-loading" className="home-loading home-paper overflow-x-clip pb-16">
      <div aria-hidden="true">
        <div className="container-shell pb-6 pt-3 sm:pb-8 sm:pt-4">
          <div className="home-loading-hero hero-lapis overflow-hidden rounded-[1.75rem] shadow-[0_30px_60px_-40px_rgb(20_32_122/0.6)]">
            <div className="grid items-center gap-12 px-6 py-12 sm:px-10 lg:h-[min(920px,calc(100svh-var(--header-h)-4rem))] lg:grid-cols-2 lg:gap-8 lg:px-14 lg:py-6">
              <div className="grid content-center gap-5">
                <Skeleton className="h-3 w-48 max-w-[70%] rounded-full" />
                <div className="grid gap-3">
                  <Skeleton className="h-12 w-[94%] rounded-lg sm:h-14" />
                  <Skeleton className="h-12 w-[65%] rounded-lg sm:h-14" />
                </div>
                <div className="grid gap-2.5">
                  <Skeleton className="h-3.5 w-full rounded-full" />
                  <Skeleton className="h-3.5 w-4/5 rounded-full" />
                </div>
                <Skeleton className="mt-1 h-14 w-full rounded-full" />
                <div className="flex gap-2">
                  {["w-28", "w-20", "w-16"].map((width) => <Skeleton key={width} className={`h-9 rounded-full ${width}`} />)}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-6">
                  <Skeleton className="h-[3.25rem] w-52 rounded-full" />
                  <div className="grid gap-2"><Skeleton className="h-3 w-28 rounded-full" /><Skeleton className="h-3 w-24 rounded-full" /></div>
                </div>
              </div>
              <div className="mx-auto w-full max-w-[520px] lg:translate-y-2">
                <div className="relative mx-auto mb-7 w-[min(300px,60%)] lg:w-[min(340px,60%,calc((min(920px,100svh-var(--header-h)-4rem)-14rem)*0.6))]">
                  <CoverPlaceholder className="absolute! inset-0 translate-x-[44%] scale-[0.8] opacity-45" />
                  <CoverPlaceholder className="absolute! inset-0 -translate-x-[44%] scale-[0.8] opacity-45" />
                  <CoverPlaceholder className="relative shadow-2xl" />
                  <Skeleton className="absolute! inset-x-0 -bottom-3 h-1 rounded-full opacity-40" />
                </div>
                <div className="grid justify-items-center gap-3">
                  <Skeleton className="h-2.5 w-44 rounded-full" />
                  <Skeleton className="h-6 w-3/5 rounded-md" />
                  <Skeleton className="h-5 w-2/5 rounded-full" />
                  <div className="mt-2 flex gap-3"><Skeleton className="size-9 rounded-full" /><Skeleton className="h-10 w-28 rounded-full" /><Skeleton className="size-9 rounded-full" /></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-[calc(100%-2rem)] max-w-[1440px] pb-8 pt-6">
          <HeadingPlaceholder centered />
          <div className="mb-8 flex justify-center gap-2"><Skeleton className="h-11 w-36 rounded-full" /><Skeleton className="h-11 w-28 rounded-full" /><Skeleton className="hidden h-11 w-32 rounded-full sm:block" /></div>
          <div className="flex h-[clamp(190px,calc((100svh-440px)/1.12),380px)] items-end justify-center gap-1.5 overflow-hidden px-3 sm:gap-2">
            {Array.from({ length: 17 }, (_, i) => i === 8
              ? <CoverPlaceholder key={i} className="h-full w-auto shrink-0" />
              : <Skeleton key={i} className={`h-[97%] min-w-5 flex-1 rounded-t-[3px] ${i % 3 === 0 ? "opacity-60" : "opacity-90"}`} />)}
          </div>
          <Skeleton className="mt-2 h-2 w-full rounded-full" />
          <div className="mt-4 flex items-center gap-4 rounded-b-3xl rounded-t-md border border-border bg-card/60 p-4 sm:p-5">
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 items-center gap-4 rounded-xl border border-border p-3">
              <CoverPlaceholder className="hidden w-10 shrink-0 sm:block" />
              <div className="grid flex-1 gap-3"><Skeleton className="h-5 w-4/5 rounded-md" /><Skeleton className="h-3 w-1/2 rounded-full" /></div>
            </div>
            <Skeleton className="hidden h-7 w-20 rounded-md sm:block" />
            <Skeleton className="size-11 shrink-0 rounded-full" />
          </div>
        </div>

        <div className="container-shell grid gap-24 pb-10 pt-16">
          <div>
            <HeadingPlaceholder />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex h-44 items-end gap-4 overflow-hidden rounded-2xl border border-border bg-card/60 p-5">
                  <div className="flex h-full min-w-0 flex-1 flex-col gap-3"><Skeleton className="h-6 w-full rounded-md" /><Skeleton className="h-3 w-4/5 rounded-full" /><Skeleton className="mt-auto h-3 w-20 rounded-full" /></div>
                  <CoverPlaceholder className="w-16 shrink-0 -rotate-6" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <HeadingPlaceholder />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className={`grid gap-3 ${i >= 3 ? "hidden lg:grid" : i === 2 ? "hidden sm:grid" : ""}`}>
                  <CoverPlaceholder /><Skeleton className="h-4 w-4/5 rounded-full" /><Skeleton className="h-3 w-3/5 rounded-full" /><Skeleton className="h-4 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <HeadingPlaceholder />
            <div className="grid gap-5 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
              <div className="grid min-h-[31rem] content-between gap-8 rounded-3xl border border-border bg-card/60 p-6">
                <div className="mx-auto mt-8 w-40"><CoverPlaceholder /></div>
                <div className="grid gap-3"><Skeleton className="h-7 w-2/3 rounded-md" /><Skeleton className="h-3 w-1/3 rounded-full" /><Skeleton className="h-8 w-24 rounded-md" /></div>
              </div>
              <div className="grid content-start gap-1">
                {Array.from({ length: 10 }, (_, i) => <div key={i} className="flex h-[52px] items-center gap-4 px-3"><Skeleton className="h-6 w-7 shrink-0 rounded-md" /><CoverPlaceholder className="h-10 w-auto shrink-0" /><div className="grid flex-1 gap-2"><Skeleton className="h-3.5 w-4/5 rounded-full" /><Skeleton className="h-2.5 w-1/2 rounded-full" /></div><Skeleton className="h-3 w-12 rounded-full" /></div>)}
              </div>
            </div>
          </div>
          <div><HeadingPlaceholder /><div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-44 rounded-2xl" /><Skeleton className="hidden h-44 rounded-2xl sm:block" /></div></div>
          <Skeleton className="h-56 rounded-3xl" />
        </div>
      </div>
    </SkeletonGroup>
  );
}

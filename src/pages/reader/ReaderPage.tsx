import { useEffect, useRef, useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  Laptop,
  ListOrdered,
  Maximize2,
  Minimize2,
  Moon,
  RefreshCw,
  ShoppingBag,
  Sun,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ebookApi, ebookKeys, ebookQueries, type EbookReaderMeta, type EbookPreviewMeta } from "@/api/endpoints/ebooks";
import { ApiError } from "@/api/errors";
import { Button, buttonVariants } from "@/components/ui/button";
import { Drawer, DrawerBody, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

type SurroundTheme = "dark" | "light" | "sepia";

export default function ReaderPage() {
  const { dict } = useT();
  const e = dict.ebook;
  const r = dict.readerUi;
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const params = useParams<{ bookId: string }>();
  const bookId = Number(params.bookId);

  const isPreview = location.pathname.endsWith("/preview");

  const [theme, setTheme] = useState<SurroundTheme>(() => {
    try {
      return (localStorage.getItem("bookly:reader-theme") as SurroundTheme) || "dark";
    } catch {
      return "dark";
    }
  });

  const [zoomLevel, setZoomLevel] = useState<number>(100); // 100 = 100%, up to 200%
  const [fitWidth, setFitWidth] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [draggingSliderValue, setDraggingSliderValue] = useState<number | null>(null);
  const sliderValue = draggingSliderValue ?? currentPage;
  const [pageLoading, setPageLoading] = useState<boolean>(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const preloadedUrlsRef = useRef<Map<number, string>>(new Map());
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // The bars step aside after a few quiet seconds and come back on any pointer movement, tap or key (pages/account.md
  // §4). They stay while the Go to page panel is open.
  const [chromeHidden, setChromeHidden] = useState(false);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [jumpValue, setJumpValue] = useState("");
  const hideTimer = useRef<number | undefined>(undefined);
  const wake = useCallback(() => {
    setChromeHidden(false);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setChromeHidden(true), 3000);
  }, []);
  useEffect(() => {
    const events = ["mousemove", "pointerdown", "keydown", "focusin"] as const;
    for (const name of events) window.addEventListener(name, wake, { passive: true });
    hideTimer.current = window.setTimeout(() => setChromeHidden(true), 3000);
    return () => {
      for (const name of events) window.removeEventListener(name, wake);
      window.clearTimeout(hideTimer.current);
    };
  }, [wake]);

  // 1. Fetch metadata
  const metaQuery = useQuery({
    ...ebookQueries.meta(bookId),
    enabled: !isPreview && !isNaN(bookId),
  });

  const previewQuery = useQuery({
    ...ebookQueries.previewMeta(bookId),
    enabled: isPreview && !isNaN(bookId),
  });

  const metaData = isPreview ? previewQuery.data : metaQuery.data;
  const isPending = isPreview ? previewQuery.isPending : metaQuery.isPending;
  const isError = isPreview ? previewQuery.isError : metaQuery.isError;
  const errorObj = isPreview ? previewQuery.error : metaQuery.error;

  const title = metaData?.title ?? e.reader;
  useDocumentTitle(`${title} · ${isPreview ? e.previewTitle : e.reader}`);

  // Page limits
  const totalPages = isPreview
    ? (metaData as EbookPreviewMeta)?.preview_pages ?? 1
    : (metaData as EbookReaderMeta)?.page_count ?? 1;

  // Initialize starting page from saved progress
  const initializedPageRef = useRef(false);
  useEffect(() => {
    if (metaData && !initializedPageRef.current) {
      initializedPageRef.current = true;
      if (!isPreview) {
        const last = (metaData as EbookReaderMeta).last_page;
        if (last && last >= 1 && last <= totalPages) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- resume reading from saved last page
          setCurrentPage(last);
        }
      }
    }
  }, [metaData, isPreview, totalPages]);

  // Theme change persistence
  const changeTheme = (next: SurroundTheme) => {
    setTheme(next);
    try {
      localStorage.setItem("bookly:reader-theme", next);
    } catch {
      // Ignore storage errors
    }
  };

  // 2. Page image loader & canvas renderer
  const renderImageToCanvas = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Use intrinsic image dimensions for sharpness
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }, []);

  const loadAndDrawPage = useCallback(
    async (pageToLoad: number) => {
      setPageLoading(true);
      setPageError(null);

      // Check preloaded cache first
      const cached = preloadedUrlsRef.current.get(pageToLoad);
      if (cached) {
        const img = new Image();
        img.onload = () => {
          renderImageToCanvas(img);
          setPageLoading(false);
        };
        img.onerror = () => {
          setPageError(e.errorLoadingPage);
          setPageLoading(false);
        };
        img.src = cached;
        return;
      }

      try {
        const blobUrl = isPreview
          ? await ebookApi.fetchPreviewPageBlobUrl(bookId, pageToLoad)
          : await ebookApi.fetchPageBlobUrl(bookId, pageToLoad);

        // Revoke previous blob if any
        if (activeBlobUrlRef.current && activeBlobUrlRef.current !== blobUrl) {
          URL.revokeObjectURL(activeBlobUrlRef.current);
        }
        activeBlobUrlRef.current = blobUrl;
        preloadedUrlsRef.current.set(pageToLoad, blobUrl);

        const img = new Image();
        img.onload = () => {
          renderImageToCanvas(img);
          setPageLoading(false);
        };
        img.onerror = () => {
          setPageError(e.errorLoadingPage);
          setPageLoading(false);
        };
        img.src = blobUrl;
      } catch (err) {
        const apiError = ApiError.from(err);
        setPageError(apiError.message || e.errorLoadingPage);
        setPageLoading(false);
      }
    },
    [bookId, isPreview, e.errorLoadingPage, renderImageToCanvas]
  );

  // Preload next page
  useEffect(() => {
    if (!metaData || isPending || isError) return;
    if (currentPage < totalPages) {
      const nextP = currentPage + 1;
      if (!preloadedUrlsRef.current.has(nextP)) {
        const fetcher = isPreview
          ? ebookApi.fetchPreviewPageBlobUrl(bookId, nextP)
          : ebookApi.fetchPageBlobUrl(bookId, nextP);
        fetcher
          .then((url) => {
            preloadedUrlsRef.current.set(nextP, url);
          })
          .catch(() => {
            // Silently ignore preload failures
          });
      }
    }
  }, [currentPage, totalPages, bookId, isPreview, metaData, isPending, isError]);

  // Load current page whenever page changes or book is ready
  useEffect(() => {
    if (metaData && !isPending && !isError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch and render page image on page change
      void loadAndDrawPage(currentPage);
    }
  }, [currentPage, metaData, isPending, isError, loadAndDrawPage]);

  // Cleanup on unmount
  useEffect(() => {
    const urls = preloadedUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      }
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
      }
    };
  }, []);

  // 3. Save progress (debounced)
  const saveProgressMutation = useMutation({
    mutationFn: (page: number) => ebookApi.saveProgress(bookId, page),
  });

  const triggerProgressSave = useCallback(
    (page: number) => {
      if (isPreview) return;
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
      progressTimerRef.current = setTimeout(() => {
        saveProgressMutation.mutate(page);
      }, 700);
    },
    [isPreview, saveProgressMutation]
  );

  // Navigation handlers
  const goToPage = useCallback(
    (target: number) => {
      const clamped = Math.max(1, Math.min(totalPages, target));
      if (clamped !== currentPage) {
        setCurrentPage(clamped);
        triggerProgressSave(clamped);
        // Scroll reader container to top on page change
        containerRef.current?.scrollTo?.({ top: 0, behavior: "instant" as ScrollBehavior });
      }
    },
    [currentPage, totalPages, triggerProgressSave]
  );

  const prevPage = useCallback(() => goToPage(currentPage - 1), [goToPage, currentPage]);
  const nextPage = useCallback(() => goToPage(currentPage + 1), [goToPage, currentPage]);

  // 4. Keyboard controls & shortcuts blocking
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Prevent Ctrl/Cmd + S, P, C (Print/Save/Copy)
      if ((event.ctrlKey || event.metaKey) && ["s", "p", "c"].includes(event.key.toLowerCase())) {
        event.preventDefault();
        return false;
      }

      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        prevPage();
      } else if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        nextPage();
      } else if (event.key === "Home") {
        event.preventDefault();
        goToPage(1);
      } else if (event.key === "End") {
        event.preventDefault();
        goToPage(totalPages);
      } else if (event.key === "Escape") {
        navigate(`/books/${bookId}`);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [prevPage, nextPage, goToPage, totalPages, navigate, bookId]);

  // Prevent right-click / context menu
  const onContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
  };

  // Zoom handlers
  const handleZoomIn = () => {
    setFitWidth(false);
    setZoomLevel((prev) => Math.min(200, prev + 25));
  };

  const handleZoomOut = () => {
    setFitWidth(false);
    setZoomLevel((prev) => Math.max(50, prev - 25));
  };

  const toggleFitWidth = () => {
    setFitWidth((prev) => !prev);
    if (!fitWidth) setZoomLevel(100);
  };

  // Theme colours live in index.css (.reader-dark / -light / -sepia); the page only reads the variables.
  const themeClasses = cn(`reader-${theme}`, "bg-(--reader-bg) text-(--reader-ink) selection:bg-(--reader-hover)");
  const barClasses = "border-(--reader-line) bg-(--reader-bar) text-(--reader-ink)";
  // Ghost controls take the bar's own ink (the site's lapis text vanished on the dark bar).
  const ghostTone = "text-(--reader-ink) hover:bg-(--reader-hover) hover:text-(--reader-ink) focus-visible:ring-(--reader-ring)";

  // -------------------------------------------------------------
  // Error and Friendly States
  // -------------------------------------------------------------
  if (isPending) {
    return (
      <div className={cn("fixed inset-0 flex flex-col items-center justify-center p-6", themeClasses)}>
        <Skeleton className="h-10 w-64 rounded-lg bg-current opacity-10" />
        <Skeleton className="mt-8 aspect-[1/1.4] w-full max-w-[600px] rounded-xl bg-current opacity-10" />
        <p className="mt-6 animate-pulse text-sm font-medium opacity-70">{e.loadingPage}</p>
      </div>
    );
  }

  const apiErr = errorObj ? ApiError.from(errorObj) : null;
  const isNotOwned = (!isPreview && metaData && !(metaData as EbookReaderMeta).owned) || apiErr?.status === 403;
  const isDeviceLimit = apiErr?.status === 409 && (apiErr.message?.toLowerCase().includes("device") || apiErr.fieldErrors?.device);
  const isProcessing = (!isPreview && metaData && (metaData as EbookReaderMeta).status === "processing") || (apiErr?.status === 409 && !isDeviceLimit);
  const isFailed = !isPreview && metaData && (metaData as EbookReaderMeta).status === "failed";

  if (isNotOwned) {
    return (
      <div className={cn("fixed inset-0 flex flex-col items-center justify-center p-6 text-center", themeClasses)}>
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-foreground shadow-lift">
          <Eye className="mx-auto size-12 text-primary" aria-hidden="true" />
          <h1 className="mt-4 font-display text-2xl font-bold">{e.notOwnedTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{e.notOwnedLead}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to={`/read/${bookId}/preview`} className={buttonVariants({ variant: "outline" })}>
              {e.readPreview}
            </Link>
            <Link to={`/books/${bookId}`} className={buttonVariants()}>
              <ShoppingBag className="size-4" aria-hidden="true" /> {e.buyEbook}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isDeviceLimit) {
    return (
      <div className={cn("fixed inset-0 flex flex-col items-center justify-center p-6 text-center", themeClasses)}>
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-foreground shadow-lift">
          <Laptop className="mx-auto size-12 text-warning" aria-hidden="true" />
          <h1 className="mt-4 font-display text-2xl font-bold">{e.deviceLimitTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{e.deviceLimitLead(3)}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to={`/books/${bookId}`} className={buttonVariants({ variant: "outline" })}>
              {dict.common.back}
            </Link>
            <Link to="/account/ebooks" className={buttonVariants()}>
              {e.manageDevices}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className={cn("fixed inset-0 flex flex-col items-center justify-center p-6 text-center", themeClasses)}>
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-foreground shadow-lift">
          <RefreshCw className="mx-auto size-12 animate-spin text-primary" aria-hidden="true" />
          <h1 className="mt-4 font-display text-2xl font-bold">{e.processingTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{e.processingLead}</p>
          <div className="mt-6 flex justify-center">
            <Link to={`/books/${bookId}`} className={buttonVariants({ variant: "outline" })}>
              {dict.common.back}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isFailed || isError) {
    return (
      <div className={cn("fixed inset-0 flex flex-col items-center justify-center p-6 text-center", themeClasses)}>
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-foreground shadow-lift">
          <h1 className="font-display text-2xl font-bold text-destructive">{e.failedTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {apiErr?.message || e.failedLead}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" onClick={() => void queryClient.invalidateQueries({ queryKey: isPreview ? ebookKeys.previewMeta(bookId) : ebookKeys.meta(bookId) })}>
              {e.retry}
            </Button>
            <Link to={`/books/${bookId}`} className={buttonVariants({ variant: "outline" })}>
              {dict.common.back}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isLastPreviewPage = isPreview && currentPage >= totalPages;
  const hidden = chromeHidden && !jumpOpen && !isLastPreviewPage && !pageError;
  const percent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;
  const jumpTo = (page: number) => {
    goToPage(page);
    setJumpOpen(false);
    setJumpValue("");
  };
  const quickJumps = [
    { label: r.jumpStart, page: 1 },
    { label: "25%", page: Math.max(1, Math.round(totalPages * 0.25)) },
    { label: "50%", page: Math.max(1, Math.round(totalPages * 0.5)) },
    { label: "75%", page: Math.max(1, Math.round(totalPages * 0.75)) },
    { label: r.jumpEnd, page: totalPages },
  ];

  return (
    <div
      onContextMenu={onContextMenu}
      className={cn(
        "fixed inset-0 select-none overflow-hidden flex flex-col z-50 print:hidden",
        themeClasses
      )}
    >
      {/* Hide on print */}
      <style>{`@media print { body { display: none !important; } }`}</style>

      {/* Reading progress: a hairline along the top edge, there even while the bars are away. */}
      <div className="absolute inset-x-0 top-0 z-30 h-[3px] bg-(--reader-line)" aria-hidden="true">
        <span className="block h-full origin-left bg-(--reader-ring) transition-transform duration-300 motion-reduce:transition-none" style={{ transform: `scaleX(${percent / 100})` }} />
      </div>

      {/* Top Controls Bar */}
      <header
        data-hidden={hidden}
        className={cn(
          "reader-chrome reader-chrome-top absolute inset-x-0 top-0 z-20 flex h-16 items-center justify-between gap-2 border-b px-3 backdrop-blur-md sm:px-4",
          barClasses
        )}
      >
        <div className="flex items-center gap-3 truncate">
          <Link
            to={`/books/${bookId}`}
            aria-label={e.closeReader}
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-11 shrink-0 rounded-full", ghostTone)}
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex flex-col truncate">
            <span className="truncate text-sm font-semibold">{title}</span>
            {isPreview ? (
              <span className="text-[11px] font-semibold uppercase tracking-wide text-(--reader-ring)">
                {e.previewTitle} ({totalPages} {dict.ebook.pages})
              </span>
            ) : null}
          </div>
        </div>

        {/* View Options & Theme */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 border-r border-border/40 pr-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={e.zoomOut}
              onClick={handleZoomOut}
              disabled={fitWidth && zoomLevel <= 100}
              className={cn("size-11 rounded-md", ghostTone)}
            >
              <ZoomOut className="size-4" />
            </Button>
            <span className="w-12 text-center text-xs tabular-nums opacity-80">
              {fitWidth ? "Fit" : `${zoomLevel}%`}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={e.zoomIn}
              onClick={handleZoomIn}
              disabled={zoomLevel >= 200}
              className={cn("size-11 rounded-md", ghostTone)}
            >
              <ZoomIn className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              aria-pressed={fitWidth}
              size="icon"
              aria-label={e.fitWidth}
              onClick={toggleFitWidth}
              className={cn("size-11 rounded-md", ghostTone, fitWidth && "bg-(--reader-hover)")}
            >
              {fitWidth ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
          </div>

          {/* Theme toggles */}
          <Button type="button" variant="ghost" size="icon" aria-label={r.goToPage} aria-expanded={jumpOpen} onClick={() => setJumpOpen(true)} className={cn("size-11 rounded-md", ghostTone)}>
            <ListOrdered className="size-5" aria-hidden="true" />
          </Button>
          <div className="flex items-center rounded-lg border border-(--reader-line) p-0.5" role="group" aria-label={r.readingTheme}>
            <button
              type="button"
              aria-label={e.themeDark}
              onClick={() => changeTheme("dark")}
              aria-pressed={theme === "dark"}
              className={cn("grid size-10 place-items-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--reader-ring)", theme === "dark" ? "bg-(--reader-hover)" : "opacity-70 hover:opacity-100")}
            >
              <Moon className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={e.themeLight}
              onClick={() => changeTheme("light")}
              aria-pressed={theme === "light"}
              className={cn("grid size-10 place-items-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--reader-ring)", theme === "light" ? "bg-(--reader-hover)" : "opacity-70 hover:opacity-100")}
            >
              <Sun className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={e.themeSepia}
              onClick={() => changeTheme("sepia")}
              aria-pressed={theme === "sepia"}
              className={cn("grid size-10 place-items-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--reader-ring) font-display text-sm", theme === "sepia" ? "bg-(--reader-hover)" : "opacity-70 hover:opacity-100")}
            >
              S
            </button>
          </div>
        </div>
      </header>

      {/* Main Canvas Viewport */}
      <main
        ref={containerRef}
        className="relative flex flex-1 items-start justify-center overflow-auto px-4 pb-24 pt-20 sm:px-8"
      >
        {/* Navigation hover arrows for large screens */}
        <button
          type="button"
          aria-label={e.prevPage}
          onClick={prevPage}
          disabled={currentPage <= 1}
          data-hidden={hidden}
          className={cn(
            "reader-chrome fixed left-4 top-1/2 z-10 hidden size-12 -translate-y-1/2 place-items-center rounded-full border border-(--reader-line) bg-(--reader-bar) text-(--reader-ink) backdrop-blur-md hover:bg-(--reader-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--reader-ring) disabled:pointer-events-none disabled:opacity-0 lg:grid"
          )}
        >
          <ChevronLeft className="size-6" aria-hidden="true" />
        </button>

        <button
          type="button"
          aria-label={e.nextPage}
          onClick={nextPage}
          disabled={currentPage >= totalPages}
          data-hidden={hidden}
          className={cn(
            "reader-chrome fixed right-4 top-1/2 z-10 hidden size-12 -translate-y-1/2 place-items-center rounded-full border border-(--reader-line) bg-(--reader-bar) text-(--reader-ink) backdrop-blur-md hover:bg-(--reader-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--reader-ring) disabled:pointer-events-none disabled:opacity-0 lg:grid"
          )}
        >
          <ChevronRight className="size-6" aria-hidden="true" />
        </button>

        {/* Canvas wrapper */}
        <div
          style={{
            width: fitWidth ? "100%" : `${zoomLevel}%`,
            maxWidth: fitWidth ? "860px" : undefined,
          }}
          className="relative mx-auto flex flex-col items-center transition-[width] duration-150"
        >
          {pageLoading ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/50 backdrop-blur-xs rounded-lg">
              <RefreshCw className="size-8 animate-spin text-primary opacity-80" />
            </div>
          ) : null}

          {pageError ? (
            <div className="my-16 rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-foreground">
              <p className="font-semibold">{pageError}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void loadAndDrawPage(currentPage)} className="mt-4">
                {e.retry}
              </Button>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              className="pointer-events-none block h-auto w-full rounded-lg bg-white shadow-[0_20px_40px_-15px_var(--reader-shade)]"
            />
          )}

          {/* End of Preview Callout */}
          {isLastPreviewPage ? (
            <div className="mt-8 w-full rounded-2xl border border-(--reader-line) bg-(--reader-bar) p-6 text-center">
              <h2 className="font-display text-xl">{e.previewLimitReached}</h2>
              <p className="mt-2 text-sm opacity-80">{e.previewLimitReachedLead}</p>
              <Link to={`/books/${bookId}`} className={cn(buttonVariants({ variant: "cta" }), "mt-4")}>
                <ShoppingBag className="size-4" aria-hidden="true" /> {e.buyEbook}
              </Link>
            </div>
          ) : null}
        </div>
      </main>

      {/* Bottom Navigation & Slider Bar */}
      <footer
        data-hidden={hidden}
        className={cn(
          "reader-chrome reader-chrome-bottom absolute inset-x-0 bottom-0 z-20 flex h-16 items-center justify-between gap-3 border-t px-3 backdrop-blur-md sm:px-8",
          barClasses
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={prevPage}
          disabled={currentPage <= 1}
          aria-label={e.prevPage}
          className={cn("h-11 min-w-11 gap-1", ghostTone)}
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">{e.prevPage}</span>
        </Button>

        {/* Page slider and counter */}
        <div className="flex flex-1 max-w-md items-center gap-3">
          <input
            type="range"
            min={1}
            max={totalPages}
            value={sliderValue}
            onChange={(evt) => setDraggingSliderValue(Number(evt.target.value))}
            onMouseUp={() => {
              goToPage(sliderValue);
              setDraggingSliderValue(null);
            }}
            onTouchEnd={() => {
              goToPage(sliderValue);
              setDraggingSliderValue(null);
            }}
            onKeyUp={(evt) => {
              if (evt.key === "Enter") {
                goToPage(sliderValue);
                setDraggingSliderValue(null);
              }
            }}
            aria-label={e.pageOf(currentPage, totalPages)}
            className="h-2 flex-1 cursor-pointer rounded-lg accent-(--reader-ring)"
          />
          <span className="whitespace-nowrap text-xs font-medium tabular-nums opacity-90 sm:text-sm">
            {currentPage} / {totalPages}
            <span className="hidden sm:inline"> · {percent}%</span>
          </span>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={nextPage}
          disabled={currentPage >= totalPages}
          aria-label={e.nextPage}
          className={cn("h-11 min-w-11 gap-1", ghostTone)}
        >
          <span className="hidden sm:inline">{e.nextPage}</span>
          <ChevronRight className="size-4" />
        </Button>
      </footer>

      <Drawer open={jumpOpen} onOpenChange={setJumpOpen}>
        <DrawerContent side="right">
          <DrawerHeader>
            <DrawerTitle>{r.goToPage}</DrawerTitle>
            <DrawerDescription>{e.pageOf(currentPage, totalPages)}</DrawerDescription>
          </DrawerHeader>
          <DrawerBody className="grid content-start gap-6">
            <form
              className="flex items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const page = Number(jumpValue);
                if (Number.isInteger(page)) jumpTo(page);
              }}
            >
              <label className="grid flex-1 gap-1.5 text-sm font-semibold">
                {r.pageNumber}
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={totalPages}
                  value={jumpValue}
                  onChange={(event) => setJumpValue(event.target.value)}
                  placeholder={`1–${totalPages}`}
                  className="h-12 rounded-md border border-input bg-card px-3 text-base font-normal tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <Button type="submit" size="lg">
                {r.go}
              </Button>
            </form>
            <ul className="grid gap-1">
              {quickJumps.map((jump) => (
                <li key={jump.label}>
                  <button
                    type="button"
                    onClick={() => jumpTo(jump.page)}
                    aria-current={jump.page === currentPage ? "page" : undefined}
                    className="flex min-h-11 w-full items-center justify-between rounded-md px-3 text-left outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-lapis-tint aria-[current=page]:font-semibold aria-[current=page]:text-primary"
                  >
                    <span>{jump.label}</span>
                    <span className="text-sm tabular-nums text-muted-foreground">{e.pageOf(jump.page, totalPages)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">{r.noChapters}</p>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

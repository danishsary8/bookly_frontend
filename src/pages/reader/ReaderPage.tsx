import { useEffect, useRef, useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  Laptop,
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
import { Skeleton } from "@/components/ui/skeleton";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

type SurroundTheme = "dark" | "light" | "sepia";

export default function ReaderPage() {
  const { dict } = useT();
  const e = dict.ebook;
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

  // Theme style classes
  const themeClasses = {
    dark: "bg-zinc-950 text-zinc-100 selection:bg-zinc-800",
    light: "bg-zinc-100 text-zinc-900 selection:bg-zinc-200",
    sepia: "bg-[#f4ecd8] text-[#5b4636] selection:bg-[#e6d8b8]",
  }[theme];

  const barClasses = {
    dark: "bg-zinc-900/95 border-zinc-800 text-zinc-200",
    light: "bg-white/95 border-zinc-200 text-zinc-800 shadow-sm",
    sepia: "bg-[#ebdcb9]/95 border-[#dbc69d] text-[#4d3b2b]",
  }[theme];

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

      {/* Top Controls Bar */}
      <header
        className={cn(
          "flex h-14 shrink-0 items-center justify-between border-b px-4 backdrop-blur-md transition-colors",
          barClasses
        )}
      >
        <div className="flex items-center gap-3 truncate">
          <Link
            to={`/books/${bookId}`}
            aria-label={e.closeReader}
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-9 rounded-full")}
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex flex-col truncate">
            <span className="truncate text-sm font-semibold">{title}</span>
            {isPreview ? (
              <span className="text-[11px] font-medium tracking-wide uppercase text-amber-500">
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
              className="size-8 rounded-md"
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
              className="size-8 rounded-md"
            >
              <ZoomIn className="size-4" />
            </Button>
            <Button
              type="button"
              variant={fitWidth ? "secondary" : "ghost"}
              size="icon"
              aria-label={e.fitWidth}
              onClick={toggleFitWidth}
              className="size-8 rounded-md"
            >
              {fitWidth ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
          </div>

          {/* Theme toggles */}
          <div className="flex items-center rounded-lg border border-border/40 p-0.5">
            <button
              type="button"
              aria-label={e.themeDark}
              onClick={() => changeTheme("dark")}
              className={cn("size-7 rounded-md grid place-items-center transition-colors", theme === "dark" ? "bg-zinc-800 text-white" : "opacity-60 hover:opacity-100")}
            >
              <Moon className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label={e.themeLight}
              onClick={() => changeTheme("light")}
              className={cn("size-7 rounded-md grid place-items-center transition-colors", theme === "light" ? "bg-zinc-200 text-zinc-950" : "opacity-60 hover:opacity-100")}
            >
              <Sun className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label={e.themeSepia}
              onClick={() => changeTheme("sepia")}
              className={cn("size-7 rounded-md grid place-items-center font-serif text-xs font-bold transition-colors", theme === "sepia" ? "bg-[#dbc79f] text-[#4d3b2b]" : "opacity-60 hover:opacity-100")}
            >
              S
            </button>
          </div>
        </div>
      </header>

      {/* Main Canvas Viewport */}
      <main
        ref={containerRef}
        className="relative flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center"
      >
        {/* Navigation hover arrows for large screens */}
        <button
          type="button"
          aria-label={e.prevPage}
          onClick={prevPage}
          disabled={currentPage <= 1}
          className={cn(
            "fixed left-4 top-1/2 -translate-y-1/2 z-10 hidden lg:grid size-12 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md transition-opacity hover:bg-black/70 disabled:pointer-events-none disabled:opacity-0"
          )}
        >
          <ChevronLeft className="size-6" />
        </button>

        <button
          type="button"
          aria-label={e.nextPage}
          onClick={nextPage}
          disabled={currentPage >= totalPages}
          className={cn(
            "fixed right-4 top-1/2 -translate-y-1/2 z-10 hidden lg:grid size-12 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md transition-opacity hover:bg-black/70 disabled:pointer-events-none disabled:opacity-0"
          )}
        >
          <ChevronRight className="size-6" />
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
              className="block w-full h-auto rounded-lg shadow-2xl transition-shadow bg-white pointer-events-none"
              style={{
                boxShadow: theme === "dark" ? "0 20px 40px -15px rgba(0,0,0,0.8)" : "0 10px 30px -10px rgba(0,0,0,0.15)",
              }}
            />
          )}

          {/* End of Preview Callout */}
          {isLastPreviewPage ? (
            <div className="mt-8 w-full rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center text-foreground">
              <h2 className="font-display text-xl font-bold">{e.previewLimitReached}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{e.previewLimitReachedLead}</p>
              <Link to={`/books/${bookId}`} className={cn(buttonVariants(), "mt-4")}>
                <ShoppingBag className="size-4" aria-hidden="true" /> {e.buyEbook}
              </Link>
            </div>
          ) : null}
        </div>
      </main>

      {/* Bottom Navigation & Slider Bar */}
      <footer
        className={cn(
          "flex h-16 shrink-0 items-center justify-between border-t px-4 sm:px-8 backdrop-blur-md transition-colors gap-3",
          barClasses
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={prevPage}
          disabled={currentPage <= 1}
          className="gap-1 min-w-[70px]"
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
            className="flex-1 accent-primary h-2 cursor-pointer rounded-lg bg-border"
          />
          <span className="text-xs sm:text-sm font-medium tabular-nums whitespace-nowrap opacity-90">
            {currentPage} / {totalPages}
          </span>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={nextPage}
          disabled={currentPage >= totalPages}
          className="gap-1 min-w-[70px]"
        >
          <span className="hidden sm:inline">{e.nextPage}</span>
          <ChevronRight className="size-4" />
        </Button>
      </footer>
    </div>
  );
}

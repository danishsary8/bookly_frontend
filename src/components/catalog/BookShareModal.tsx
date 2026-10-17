import { useEffect, useState } from "react";
import { Check, Copy, Download, QrCode, Share2 } from "lucide-react";
import { FaFacebook, FaTelegram } from "react-icons/fa6";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/i18n";
import { toast } from "@/stores/toast";
import { cn } from "@/lib/utils";

export interface BookShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: {
    id?: number | string | null;
    title?: string | null;
    slug?: string | null;
    cover_image_url?: string | null;
    authors?: { name?: string }[] | string[] | null;
    author_name?: string | null;
  };
  url?: string;
}

export function BookShareModal({ open, onOpenChange, book, url: explicitUrl }: BookShareModalProps) {
  const { dict } = useT();
  const b = dict.book;
  const [copied, setCopied] = useState(false);
  const [qrSvg, setQrSvg] = useState<string>("");
  const [hasNativeShare, setHasNativeShare] = useState(false);
  const [activeTab, setActiveTab] = useState<"share" | "qr">("share");

  // Compute the current book URL
  const shareUrl = explicitUrl || (typeof window !== "undefined" ? window.location.href : "");
  const bookTitle = book.title || "";

  // Compute author name
  const authorDisplay =
    (Array.isArray(book.authors) && book.authors.length > 0
      ? book.authors
          .map((a) => (typeof a === "string" ? a : a.name || ""))
          .filter(Boolean)
          .join(", ")
      : book.author_name) || "";

  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setHasNativeShare(true);
    }
  }, []);

  // Generate QR Code dynamically when opened
  useEffect(() => {
    if (!open || !shareUrl) return;

    let cancelled = false;
    const qr = (QRCode as unknown as { default?: typeof QRCode })?.default || QRCode;

    qr.toString(
      shareUrl,
      {
        type: "svg",
        margin: 1,
        errorCorrectionLevel: "M",
        color: {
          dark: "#0E1335",
          light: "#FFFFFF",
        },
      },
      (err, str) => {
        if (!cancelled && !err && typeof str === "string") {
          setQrSvg(str);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [open, shareUrl]);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement("input");
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopied(true);
      toast.success(b.linkCopied);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error(dict.account.copyFailed);
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: bookTitle,
        text: authorDisplay ? `${bookTitle} by ${authorDisplay}` : bookTitle,
        url: shareUrl,
      });
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        console.error("Native share error", err);
      }
    }
  };

  const handleDownloadQr = () => {
    if (!qrSvg) return;
    const blob = new Blob([qrSvg], { type: "image/svg+xml;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `bookly-qr-${book.slug || book.id || "book"}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(
    authorDisplay ? `${bookTitle} by ${authorDisplay}` : bookTitle,
  )}`;

  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="p-6">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Share2 className="size-5 text-primary" aria-hidden="true" />
            {b.shareDialogTitle}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {b.shareDialogDesc}
          </DialogDescription>
        </DialogHeader>

        {/* Book mini-preview banner */}
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
          {book.cover_image_url ? (
            <img
              src={book.cover_image_url}
              alt={bookTitle}
              className="h-14 w-10 rounded object-cover shadow-sm shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="grid h-14 w-10 place-items-center rounded bg-muted text-[10px] font-bold text-muted-foreground shrink-0">
              {bookTitle ? bookTitle.slice(0, 2).toUpperCase() : "BK"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{bookTitle}</p>
            {authorDisplay ? (
              <p className="truncate text-xs text-muted-foreground">{authorDisplay}</p>
            ) : null}
          </div>
        </div>

        {/* Tabbed view: Social & Link vs QR Code */}
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "share" | "qr")} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="share" className="gap-2">
              <Share2 className="size-4" aria-hidden="true" />
              {b.tabShare}
            </TabsTrigger>
            <TabsTrigger value="qr" className="gap-2">
              <QrCode className="size-4" aria-hidden="true" />
              {b.tabQr}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="share" className="space-y-4 pt-3">
            {/* Quick social share buttons */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <a
                href={telegramShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-[#229ED9] hover:bg-[#229ED9]/5 hover:text-[#229ED9]"
              >
                <FaTelegram className="size-4 text-[#229ED9]" aria-hidden="true" />
                <span>{b.shareTelegram}</span>
              </a>

              <a
                href={facebookShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-[#1877F2] hover:bg-[#1877F2]/5 hover:text-[#1877F2]"
              >
                <FaFacebook className="size-4 text-[#1877F2]" aria-hidden="true" />
                <span>{b.shareFacebook}</span>
              </a>

              {hasNativeShare ? (
                <Button
                  variant="outline"
                  size="default"
                  onClick={handleNativeShare}
                  className="flex items-center justify-center gap-2 border-border"
                >
                  <Share2 className="size-4 text-primary" aria-hidden="true" />
                  <span>{b.shareDevice}</span>
                </Button>
              ) : null}
            </div>

            {/* Direct copy link input bar */}
            <div className="space-y-1.5">
              <label htmlFor="share-book-url" className="text-xs font-semibold text-muted-foreground">
                {b.copyLink}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="share-book-url"
                  type="text"
                  readOnly
                  value={shareUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
                <Button
                  type="button"
                  variant={copied ? "default" : "outline"}
                  size="sm"
                  onClick={handleCopy}
                  className={cn(
                    "gap-1.5 shrink-0 transition-colors",
                    copied && "bg-emerald-600 text-white hover:bg-emerald-700",
                  )}
                >
                  {copied ? (
                    <>
                      <Check className="size-4" aria-hidden="true" />
                      <span>{dict.account.codeCopied}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" aria-hidden="true" />
                      <span>{b.copyLink}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="qr" className="space-y-4 pt-3 text-center">
            <p className="text-xs text-muted-foreground">{b.scanQrLead}</p>

            <div className="mx-auto flex w-fit items-center justify-center rounded-2xl border-2 border-border bg-white p-4 shadow-sm">
              {qrSvg ? (
                <div
                  role="img"
                  aria-label="QR Code"
                  className="size-48 [&>svg]:size-full"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              ) : (
                <div className="grid size-48 place-items-center text-xs text-muted-foreground">
                  <QrCode className="size-8 animate-pulse text-muted-foreground" aria-hidden="true" />
                </div>
              )}
            </div>

            {qrSvg ? (
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadQr}
                  className="gap-2"
                >
                  <Download className="size-4" aria-hidden="true" />
                  {b.downloadQr}
                </Button>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { staffApi, staffKeys, type StaffBook } from "@/api/endpoints/staff";
import { ApiError } from "@/api/errors";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import { toast } from "@/stores/toast";
import { mainCover, pendingCover } from "./pendingCover";

/*
 * "Cover" on the book page (owner 2026-11-02). Changing it updates every format that shows the main cover or has none;
 * a format with its own different cover keeps it. With no format yet, the cover waits for the first one.
 */
export function BookCoverPanel({ book }: { book: StaffBook }) {
  const queryClient = useQueryClient();
  const current = mainCover(book);
  const [value, setValue] = useState(current);
  const save = useMutation({
    mutationFn: async (url: string) => {
      const targets = book.variants.filter((v) => !v.cover_image_url || v.cover_image_url === current);
      for (const v of targets) await staffApi.updateVariant(v.id, { cover_image_url: url || null });
      return targets.length;
    },
    onSuccess: (count, url) => {
      void queryClient.invalidateQueries({ queryKey: staffKeys.book(book.id) });
      void queryClient.invalidateQueries({ queryKey: ["staff", "books"] });
      void queryClient.invalidateQueries({ queryKey: ["catalog"] });
      toast.success(url ? (count ? `Cover saved on ${count} ${count === 1 ? "format" : "formats"}` : "Cover saved") : "Cover removed");
    },
    onError: (error) => {
      setValue(current);
      toast.error({ title: "Couldn't save the cover", description: ApiError.from(error).message });
    },
  });

  const change = (url: string) => {
    setValue(url);
    if (book.variants.length === 0) {
      pendingCover.set(book.id, url);
      toast.success(url ? "Cover kept for the first format you add" : "Cover removed");
      return;
    }
    save.mutate(url);
  };

  return (
    <section aria-labelledby="book-cover" className="grid grid-cols-1 content-start gap-4 desk-card rounded-xl border border-border bg-card p-5">
      <h2 id="book-cover" className="font-sans text-[1.0625rem] font-semibold tracking-normal">
        Cover
      </h2>
      {/* The upload field shows the picture itself, so it gets the full width. */}
      <div className="grid grid-cols-1">
        <ImageUploadField
          label={value ? "Change cover" : "Upload a cover"}
          value={value}
          onChange={change}
          optional
          hint={
            book.variants.length
              ? "Used by every format without its own cover. JPEG, PNG or WebP up to 5 MB."
              : "Kept for the first format you add. JPEG, PNG or WebP up to 5 MB."
          }
        />
      </div>
      {save.isPending ? <p className="text-sm text-muted-foreground" role="status">Saving the cover…</p> : null}
    </section>
  );
}

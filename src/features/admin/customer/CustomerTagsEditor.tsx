import { useState, type KeyboardEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Tag, X } from "lucide-react";
import { opsApi, opsKeys, opsQueries } from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import { Button } from "@/components/ui/button";
import { toast } from "@/stores/toast";

interface CustomerTagsEditorProps {
  customerId: number;
  initialTags?: string[];
}

export function CustomerTagsEditor({ customerId, initialTags = [] }: CustomerTagsEditorProps) {
  const queryClient = useQueryClient();
  const [tags, setTags] = useState<string[]>(initialTags);
  const [input, setInput] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // Suggestions for type-ahead
  const trimmed = input.trim();
  const suggestionsQuery = useQuery({
    ...opsQueries.customerTagSuggestions(trimmed || undefined),
    enabled: trimmed.length > 0,
  });

  const saveMutation = useMutation({
    mutationFn: () => opsApi.updateCustomerTags(customerId, tags),
    onSuccess: (data) => {
      setTags(data.tags);
      setIsDirty(false);
      void queryClient.invalidateQueries({ queryKey: opsKeys.customer(customerId) });
      void queryClient.invalidateQueries({ queryKey: ["staff", "customers"] });
      void queryClient.invalidateQueries({ queryKey: ["staff", "customer-tags"] });
      toast.success("Tags saved");
    },
    onError: (err) => {
      toast.error({
        title: "Couldn't save tags",
        description: ApiError.from(err).message,
      });
    },
  });

  const addTag = (raw: string) => {
    const collapsed = raw.trim().replace(/\s+/g, " ");
    if (!collapsed) return;
    if (collapsed.length > 40) {
      toast.error("Tags cannot be longer than 40 characters.");
      return;
    }
    const lower = collapsed.toLowerCase();
    if (tags.some((t) => t.toLowerCase() === lower)) {
      setInput("");
      return;
    }
    if (tags.length >= 10) {
      toast.error("A customer can have at most 10 tags.");
      return;
    }
    setTags([...tags, collapsed]);
    setInput("");
    setIsDirty(true);
  };

  const removeTag = (indexToRemove: number) => {
    setTags(tags.filter((_, idx) => idx !== indexToRemove));
    setIsDirty(true);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(input);
    }
  };

  const suggestions = (suggestionsQuery.data ?? []).filter(
    (s) => !tags.some((t) => t.toLowerCase() === s.name.toLowerCase()),
  );

  return (
    <section aria-labelledby="customer-tags-heading" className="grid gap-3 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="customer-tags-heading" className="font-sans text-[1.0625rem] font-semibold tracking-normal flex items-center gap-2">
          <Tag className="size-4 text-muted-foreground" aria-hidden="true" />
          Tags
        </h2>
        {isDirty ? (
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
          >
            Save tags
          </Button>
        ) : null}
      </div>

      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5" role="list" aria-label="Customer tags">
          {tags.map((tag, idx) => (
            <span
              key={tag}
              role="listitem"
              className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2.5 py-1 text-sm font-medium"
            >
              #{tag}
              <button
                type="button"
                onClick={() => removeTag(idx)}
                className="ml-0.5 rounded p-0.5 text-muted-foreground hover:bg-surface-3 hover:text-foreground"
                aria-label={`Remove tag ${tag}`}
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No tags yet. Add tags like VIP, Wholesale, or Book Club.</p>
      )}

      {tags.length < 10 ? (
        <div className="relative grid gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={40}
              placeholder="Add tag (press Enter)"
              aria-label="Add tag"
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addTag(input)}
              disabled={!trimmed}
              aria-label="Add tag"
            >
              <Plus className="size-4" aria-hidden="true" />
              Add
            </Button>
          </div>

          {trimmed && suggestions.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              <span className="text-muted-foreground">Suggestions:</span>
              {suggestions.slice(0, 5).map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => addTag(s.name)}
                  className="rounded bg-surface-2 px-2 py-0.5 font-medium hover:bg-surface-3 hover:text-primary"
                >
                  +{s.name} <span className="text-muted-foreground">({s.count})</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Maximum of 10 tags reached.</p>
      )}
    </section>
  );
}

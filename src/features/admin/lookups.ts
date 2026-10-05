import type { ComponentType } from "react";
import { Building2, FolderTree, Library, PenTool } from "lucide-react";
import type { LookupKind } from "@/api/endpoints/staff";

/* The fields of each lookup, mirroring the Staff\Catalog controllers' validation. */

export type LookupRow = { id: number; name: string; books_count?: number; [field: string]: unknown };
type Field = { name: string; label: string; max: number; required?: boolean; long?: boolean; url?: boolean; slug?: boolean; hint?: string };
type Config = {
  title: string;
  singular: string;
  lead: string;
  Icon: ComponentType<{ className?: string }>;
  searchable: boolean;
  fields: Field[];
  detail?: { field: string; label: string };
};

export const LOOKUPS: Record<LookupKind, Config> = {
  authors: {
    title: "Authors",
    singular: "Author",
    lead: "People credited on books.",
    Icon: PenTool,
    searchable: true,
    fields: [
      { name: "name", label: "Name", max: 150, required: true },
      { name: "bio", label: "Biography", max: 5000, long: true },
      { name: "photo_url", label: "Photo URL", max: 500, url: true },
    ],
    detail: { field: "bio", label: "Biography" },
  },
  categories: {
    title: "Categories",
    singular: "Category",
    lead: "Shelves customers browse by.",
    Icon: FolderTree,
    searchable: false,
    fields: [
      { name: "name", label: "Name", max: 100, required: true },
      { name: "slug", label: "Web address name", max: 120, slug: true, hint: "Used in the link, e.g. science-fiction. Leave empty to make one from the name." },
    ],
    detail: { field: "slug", label: "Web address name" },
  },
  publishers: {
    title: "Publishers",
    singular: "Publisher",
    lead: "Publishing houses. Each name is used once.",
    Icon: Building2,
    searchable: true,
    fields: [{ name: "name", label: "Name", max: 150, required: true }],
  },
  series: {
    title: "Series",
    singular: "Series",
    lead: "Books that belong together, read in order.",
    Icon: Library,
    searchable: false,
    fields: [
      { name: "name", label: "Name", max: 150, required: true },
      { name: "description", label: "Description", max: 5000, long: true },
    ],
    detail: { field: "description", label: "Description" },
  },
};

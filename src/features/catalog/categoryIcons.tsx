/* eslint-disable react-refresh/only-export-components */
import type { ComponentType } from "react";
import {
  Baby,
  Book,
  Bookmark,
  BookOpen,
  Briefcase,
  Camera,
  Code,
  Compass,
  Feather,
  Globe,
  GraduationCap,
  Heart,
  Landmark,
  Languages,
  Library,
  Music,
  Palette,
  School,
  Sparkles,
  Sprout,
  Trophy,
  Zap,
} from "lucide-react";

export const CATEGORY_ICON_MAP: Record<string, ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>> = {
  "book-open": BookOpen,
  languages: Languages,
  school: School,
  "graduation-cap": GraduationCap,
  sprout: Sprout,
  briefcase: Briefcase,
  landmark: Landmark,
  zap: Zap,
  baby: Baby,
  sparkles: Sparkles,
  library: Library,
  palette: Palette,
  book: Book,
  bookmark: Bookmark,
  compass: Compass,
  globe: Globe,
  heart: Heart,
  music: Music,
  camera: Camera,
  code: Code,
  trophy: Trophy,
  feather: Feather,
};

export const CATEGORY_ICON_OPTIONS: { name: string; label: string; Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }> }[] = [
  { name: "book-open", label: "Open book", Icon: BookOpen },
  { name: "languages", label: "Languages", Icon: Languages },
  { name: "school", label: "School", Icon: School },
  { name: "graduation-cap", label: "Graduation cap", Icon: GraduationCap },
  { name: "sprout", label: "Sprout", Icon: Sprout },
  { name: "briefcase", label: "Briefcase", Icon: Briefcase },
  { name: "landmark", label: "Landmark", Icon: Landmark },
  { name: "zap", label: "Zap", Icon: Zap },
  { name: "baby", label: "Baby", Icon: Baby },
  { name: "sparkles", label: "Sparkles", Icon: Sparkles },
  { name: "library", label: "Library", Icon: Library },
  { name: "palette", label: "Palette", Icon: Palette },
  { name: "book", label: "Book", Icon: Book },
  { name: "bookmark", label: "Bookmark", Icon: Bookmark },
  { name: "compass", label: "Compass", Icon: Compass },
  { name: "globe", label: "Globe", Icon: Globe },
  { name: "heart", label: "Heart", Icon: Heart },
  { name: "music", label: "Music", Icon: Music },
  { name: "camera", label: "Camera", Icon: Camera },
  { name: "code", label: "Code", Icon: Code },
  { name: "trophy", label: "Trophy", Icon: Trophy },
  { name: "feather", label: "Feather", Icon: Feather },
];

export function CategoryIcon({
  name,
  className,
}: {
  name?: string | null;
  className?: string;
}) {
  if (!name) return null;
  const IconComponent = CATEGORY_ICON_MAP[name];
  if (!IconComponent) return null;
  return <IconComponent className={className} aria-hidden="true" />;
}

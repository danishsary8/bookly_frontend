import { CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/** Marks a placeholder value from src/content/shop.ts until the owner confirms it (`confirmed: true` hides it). */
export function ToConfirm({ confirmed }: { confirmed: boolean }) {
  if (confirmed) return null;
  return (
    <Badge tone="warning" shape="outline" className="ml-2 align-middle font-sans">
      <CircleDashed aria-hidden="true" /> To be confirmed
    </Badge>
  );
}

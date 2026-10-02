import { SearchX } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

/** Page-level "not found" for a catalogue item (author, series, category, publisher). */
export function NotFoundState({ what, backTo, backLabel }: { what: string; backTo: string; backLabel: string }) {
  useDocumentTitle(`${what[0].toUpperCase()}${what.slice(1)} not found`);
  return (
    <div className="container-shell py-16">
      <EmptyState
        icon={SearchX}
        headingLevel="h1"
        title={`We couldn't find that ${what}`}
        description="The link may be out of date, or it was removed from the catalogue."
        action={
          <Link to={backTo} className={buttonVariants()}>
            {backLabel}
          </Link>
        }
      />
    </div>
  );
}

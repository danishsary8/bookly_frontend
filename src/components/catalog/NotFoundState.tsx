import { SearchX } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";

/** Page-level "not found" for a catalogue item (author, series, category, publisher). */
export function NotFoundState({ what, backTo, backLabel }: { what: string; backTo: string; backLabel: string }) {
  const { dict } = useT();
  useDocumentTitle(dict.ui.notFoundDocTitle(what));
  return (
    <div className="container-shell py-16">
      <EmptyState
        icon={SearchX}
        headingLevel="h1"
        title={dict.ui.notFoundTitle(what)}
        description={dict.ui.notFoundLead}
        action={
          <Link to={backTo} className={buttonVariants()}>
            {backLabel}
          </Link>
        }
      />
    </div>
  );
}

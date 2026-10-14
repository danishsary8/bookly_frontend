import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import { BookShelf } from "@/components/catalog/BookShelf";
import { CtaGlare } from "@/components/CtaGlare";
import { buttonVariants } from "@/components/ui/button";
import { policy } from "@/content/shop";
import { ContentPage } from "@/features/content/ContentPage";
import { useT } from "@/i18n";
import { Rich } from "@/i18n/Rich";

/*
 * /about: what Bookly is and how buying from it works, in the shop's own terms
 * (only what the shop really does), then the newest books and one way in.
 */
export default function AboutPage() {
  const newest = useQuery(catalogQueries.books({ sort: "newest", per_page: 10 }));
  const { dict } = useT();
  const c = dict.content;
  return (
    <ContentPage
      title={c.aboutTitle}
      documentTitle={c.aboutDoc}
      crumb={c.about}
      eyebrow={c.about}
      lead={c.aboutLead}
      facts={[
        { value: c.factFormats, label: c.factFormatsLabel },
        {
          value: (
            <>
              $ <span aria-hidden="true">·</span> <span lang="km">៛</span>
            </>
          ),
          label: c.factPricesLabel,
        },
        { value: c.factVerified, label: c.factVerifiedLabel },
      ]}
      sections={[
        {
          id: "shelves",
          title: c.shelvesTitle,
          body: (
            <>
              <p>{c.shelves1}</p>
              <p>
                <Rich text={c.shelves2} />
              </p>
            </>
          ),
        },
        {
          id: "buying",
          title: c.buyingTitle,
          body: (
            <>
              <p>{c.buying1(String(policy.shippingFeesUsd.phnomPenh), String(policy.shippingFeesUsd.provinces))}</p>
              <p>
                <Rich text={c.buying2(policy.returnWindowDays)} />
              </p>
            </>
          ),
        },
        {
          id: "reviews",
          title: c.reviewsTitle,
          body: <p>{c.reviews1}</p>,
        },
      ]}
      after={
        <div className="mt-20 grid gap-10">
          <BookShelf
            id="about-newest"
            eyebrow={c.justIn}
            title={c.newOnShelves}
            books={newest.data?.data}
            loading={newest.isPending}
            error={newest.isError ? newest.error : undefined}
            onRetry={() => newest.refetch()}
            seeAllHref="/books?sort=newest"
          />
          <div className="flex justify-center">
            <CtaGlare>
              <Link to="/books" className={buttonVariants({ variant: "cta", size: "lg" })}>
                {c.browseShelves} <ArrowRight aria-hidden="true" />
              </Link>
            </CtaGlare>
          </div>
        </div>
      }
    />
  );
}

import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import { BookShelf } from "@/components/catalog/BookShelf";
import { CtaGlare } from "@/components/CtaGlare";
import { buttonVariants } from "@/components/ui/button";
import { policy } from "@/content/shop";
import { ContentPage } from "@/features/content/ContentPage";

/*
 * /about: what Bookly is and how buying from it works, in the shop's own terms
 * (only what the shop really does), then the newest books and one way in.
 */
export default function AboutPage() {
  const newest = useQuery(catalogQueries.books({ sort: "newest", per_page: 10 }));
  return (
    <ContentPage
      title="A bookshop for Cambodia"
      documentTitle="About Bookly"
      crumb="About"
      eyebrow="About"
      lead="Bookly sells printed and digital books online, priced in dollars or riel and paid for in cash at your door."
      facts={[
        { value: "4 formats", label: "hardcover, paperback, ebook and audiobook" },
        {
          value: (
            <>
              $ <span aria-hidden="true">·</span> <span lang="km">៛</span>
            </>
          ),
          label: "every price in US dollars or Cambodian riel",
        },
        { value: "Verified", label: "every review is from someone who bought the book" },
      ]}
      sections={[
        {
          id: "shelves",
          title: "What's on the shelves",
          body: (
            <>
              <p>
                From classics to this month's new arrivals, many in more than one format: a hardcover to keep, a paperback to carry, or an
                ebook or audiobook with no delivery at all.
              </p>
              <p>
                Browse by <Link to="/authors">author</Link>, by <Link to="/series">series</Link> or by category, or search for a title. Every book page
                shows its formats, stock and price side by side.
              </p>
            </>
          ),
        },
        {
          id: "buying",
          title: "How buying works",
          body: (
            <>
              <p>
                Switch between dollars and riel at the top of any page. When you order, nothing is charged: you pay the courier in cash when the books
                arrive, with one ${policy.shippingFeeUsd} delivery fee per order.
              </p>
              <p>
                Printed books can be returned within {policy.returnWindowDays} days of delivery, from your account. The details are in{" "}
                <Link to="/shipping">shipping & delivery</Link> and the <Link to="/returns-policy">returns policy</Link>.
              </p>
            </>
          ),
        },
        {
          id: "reviews",
          title: "Reviews from real readers",
          body: (
            <p>
              Only customers who bought a book can review it, and only once it has been delivered. That's why every review on Bookly says "Verified
              purchase": the ratings come from people who actually read the book.
            </p>
          ),
        },
      ]}
      after={
        <div className="mt-20 grid gap-10">
          <BookShelf
            id="about-newest"
            eyebrow="Just in"
            title="New on the shelves"
            books={newest.data?.data}
            loading={newest.isPending}
            error={newest.isError ? newest.error : undefined}
            onRetry={() => newest.refetch()}
            seeAllHref="/books?sort=newest"
          />
          <div className="flex justify-center">
            <CtaGlare>
              <Link to="/books" className={buttonVariants({ variant: "cta", size: "lg" })}>
                Browse the shelves <ArrowRight aria-hidden="true" />
              </Link>
            </CtaGlare>
          </div>
        </div>
      }
    />
  );
}

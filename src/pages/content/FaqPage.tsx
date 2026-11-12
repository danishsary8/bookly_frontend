import { useState } from "react";
import { Search, SearchX } from "lucide-react";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { policy } from "@/content/shop";
import { ContentPage } from "@/features/content/ContentPage";
import { FaqList, type Faq } from "@/features/content/FaqList";
import { useT } from "@/i18n";

const groups: Array<{ id: string; title: string; items: Faq[] }> = [
  {
    id: "orders",
    title: "Orders and paying",
    items: [
      {
        id: "how-to-pay",
        q: "How do I pay?",
        a: (
          <p>
            In cash, when your books arrive: Bookly is cash on delivery, so nothing is charged when you order. Pay the courier in US dollars or riel.
            Card and Bakong KHQR payments are coming soon.
          </p>
        ),
      },
      {
        id: "need-account",
        q: "Do I need an account to order?",
        a: (
          <p>
            Yes. <Link to="/register">Create an account</Link> and confirm your email with the code we send you; then you can fill a cart, save books
            to your wishlist and check out. Browsing and reading reviews works without one.
          </p>
        ),
      },
      {
        id: "coupons",
        q: "How do coupons work?",
        a: (
          <>
            <p>Enter the code on your cart page and choose Apply. You'll see the discount before you check out.</p>
            <ul>
              <li>One coupon per order.</li>
              <li>Each coupon can be used once per account. If you cancel the order, you can use it again.</li>
              <li>Some coupons need a minimum order. If you remove books and drop below it, the coupon is taken off and we tell you why.</li>
            </ul>
          </>
        ),
      },
      {
        id: "cancel-order",
        q: "Can I cancel an order?",
        a: (
          <p>
            Yes, while it's still pending: open it in <Link to="/account/orders">your orders</Link> and choose Cancel order. Once the shop has started
            processing it, it can't be cancelled online; you can return printed books after delivery instead.
          </p>
        ),
      },
      {
        id: "riel-prices",
        q: "Why does the riel price change?",
        a: <p>Prices are set in US dollars. The riel amount is worked out at the shop's current exchange rate, so it can move a little from day to day.</p>,
      },
    ],
  },
  {
    id: "delivery",
    title: "Delivery",
    items: [
      {
        id: "delivery-cost",
        q: "How much is delivery?",
        a: (
          <p>
            ${policy.shippingFeesUsd.phnomPenh} per order in Phnom Penh and ${policy.shippingFeesUsd.provinces} to the provinces, however many books are
            in it. Orders with only ebooks or audiobooks have no delivery fee.
          </p>
        ),
      },
      {
        id: "delivery-time",
        q: "How long does delivery take?",
        a: (
          <p>
            It depends on where you are. See <Link to="/shipping#where">where we deliver and how long it takes</Link>.
          </p>
        ),
      },
      {
        id: "track-order",
        q: "Where is my order?",
        a: (
          <p>
            Open it in <Link to="/account/orders">your orders</Link>. Its timeline shows each step (pending, processing, shipped, delivered) with any
            note from the shop.
          </p>
        ),
      },
    ],
  },
  {
    id: "returns",
    title: "Returns",
    items: [
      {
        id: "return-book",
        q: "Can I return a book?",
        a: (
          <p>
            Printed books, yes: within {policy.returnWindowDays} days of delivery, from the order in your account. Read the{" "}
            <Link to="/returns-policy">returns policy</Link> for the details.
          </p>
        ),
      },
      {
        id: "return-ebook",
        q: "Can I return an ebook or audiobook?",
        a: <p>No. Digital books can't be returned.</p>,
      },
      {
        id: "refund-amount",
        q: "How much will I get back?",
        a: (
          <p>
            What you paid for the returned books, less their share of any coupon discount. The delivery fee isn't refunded. Your return shows the
            amount. <Link to="/returns-policy#refunds">See an example</Link>.
          </p>
        ),
      },
    ],
  },
  {
    id: "account",
    title: "Your account",
    items: [
      {
        id: "no-code",
        q: "I didn't get my verification code",
        a: (
          <p>
            Check your spam folder first. Codes expire after 15 minutes. On the verify page you can send a new one after a short wait; only the newest code works. If you signed up
            with a typo in your email, choose "Sign out and start again".
          </p>
        ),
      },
      {
        id: "forgot-password",
        q: "I forgot my password",
        a: (
          <p>
            Use <Link to="/forgot-password">Forgot password</Link> on the sign-in page. We'll email you a code to set a new one.
          </p>
        ),
      },
      {
        id: "change-email",
        q: "Can I change my email or delete my account?",
        a: (
          <p>
            Not online yet. <Link to="/contact">Contact us</Link> from the email on your account and we'll do it for you. You can change your name,
            phone, password and addresses yourself in <Link to="/account">your account</Link>.
          </p>
        ),
      },
    ],
  },
  {
    id: "reviews",
    title: "Reviews",
    items: [
      {
        id: "who-reviews",
        q: "Who can write a review?",
        a: (
          <p>
            Only customers who bought the book: once an order with it has been delivered, a "Write a review" button appears on the book's page. That's
            why every review says "Verified purchase". One review per book.
          </p>
        ),
      },
      {
        id: "edit-review",
        q: "Can I change or delete my review?",
        a: (
          <p>
            Yes, any time, from the book's page or from <Link to="/account/reviews">your reviews</Link>.
          </p>
        ),
      },
      {
        id: "hidden-review",
        q: "Why is my review hidden?",
        a: (
          <p>
            The shop can hide reviews that break the rules in our <Link to="/terms#reviews">terms</Link>. A hidden review is marked in your account and
            only you can see it. Editing it doesn't make it visible again; contact us if you think it was hidden by mistake.
          </p>
        ),
      },
    ],
  },
];

/** The questions whose wording (or group) contains every word typed, in their groups; empty groups drop out. */
function filterGroups(query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return groups;
  return groups
    .map((group) => ({ ...group, items: group.items.filter((item) => words.every((w) => `${group.title} ${item.q}`.toLowerCase().includes(w))) }))
    .filter((group) => group.items.length > 0);
}

/*
 * /faq: common questions in groups (radix accordion, several open at once); each answer is linkable
 * (/faq#cancel-order opens it). A search field filters the questions as you type; nothing found points to Contact.
 */
export default function FaqPage() {
  const { dict } = useT();
  const t = dict.infoPages;
  const [query, setQuery] = useState("");
  const shown = filterGroups(query);
  const count = shown.reduce((n, g) => n + g.items.length, 0);

  return (
    <ContentPage
      englishOnly
      title="Questions & answers"
      documentTitle="FAQ"
      crumb="FAQ"
      eyebrow="Help"
      lead="Paying, delivery, returns, your account and reviews: the short answers, with links to the full details."
      action={
        <Link to="/contact" className={buttonVariants({ variant: "outline" })}>
          Can't find it? Contact us
        </Link>
      }
      highlight={
        <div className="grid max-w-[68ch] gap-2" role="search">
          <label htmlFor="faq-search" className="text-sm font-semibold">
            {t.faqSearch}
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="faq-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.faqSearchHint}
              aria-describedby="faq-count"
              className="h-12 w-full rounded-md border border-input bg-card pl-11 pr-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
          </div>
          <p id="faq-count" role="status" className="text-sm text-muted-foreground">
            {query.trim() ? t.faqCount(count) : " "}
          </p>
          {count === 0 ? (
            <div className="mt-2 grid justify-items-start gap-2 rounded-xl border border-dashed border-input px-5 py-6">
              <SearchX className="size-6 text-primary" aria-hidden="true" />
              <p className="font-semibold">{t.faqNone(query.trim())}</p>
              <p className="text-muted-foreground">{t.faqNoneLead}</p>
              <Link to="/contact" className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
                {dict.content.contactUs}
              </Link>
            </div>
          ) : null}
        </div>
      }
      sections={shown.map((group) => ({ id: group.id, title: group.title, body: <FaqList items={group.items} /> }))}
      related={[
        { to: "/shipping", label: t.pages.shipping },
        { to: "/returns-policy", label: t.pages.returns },
      ]}
    />
  );
}

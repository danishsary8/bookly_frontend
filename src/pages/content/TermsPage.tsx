import { Link } from "react-router-dom";
import { policy, shop } from "@/content/shop";
import { ContentPage } from "@/features/content/ContentPage";
import { LegalNotice } from "@/features/content/LegalNotice";

/*
 * /terms: the rules of buying from Bookly Shop in plain language, matching what the API
 * enforces (approved by the owner 2026-10-06).
 * Section ids are linked from elsewhere (/terms#reviews from the FAQ).
 */
export default function TermsPage() {
  return (
    <ContentPage
      title="Terms of sale"
      documentTitle="Terms"
      eyebrow="Legal"
      lead={`The rules for buying from ${shop.name}: your account, prices, paying, delivery, returns and reviews.`}
      numbered
      notice={<LegalNotice />}
      sections={[
        {
          id: "account",
          title: "Your account",
          body: (
            <p>
              You need an account with a confirmed email address to order. Keep your password to yourself; you're responsible for orders placed from your
              account. We may close accounts used for fraud or abuse.
            </p>
          ),
        },
        {
          id: "prices",
          title: "Prices",
          body: (
            <>
              <p>
                Prices are set in US dollars. Prices in riel are converted at the shop's current exchange rate and are shown for convenience; the dollar
                price is the one that counts.
              </p>
              <p>
                Prices and stock can change while books sit in your cart. Your cart and checkout always show the current price, and the total you see when
                you place the order is the one you pay.
              </p>
            </>
          ),
        },
        {
          id: "orders",
          title: "Orders",
          body: (
            <>
              <p>
                Your order is placed when you see the confirmation page with an order number. We may cancel an order if a book turns out to be unavailable
                or a price was clearly wrong; we'll tell you if we do.
              </p>
              <p>A coupon can be used once per account, one per order, and only if the order meets its conditions (such as a minimum total).</p>
            </>
          ),
        },
        {
          id: "payment",
          title: "Paying",
          body: <p>Orders are paid in cash to the courier on delivery, in US dollars or riel. Card and Bakong KHQR payments aren't available yet.</p>,
        },
        {
          id: "delivery",
          title: "Delivery",
          body: (
            <p>
              Each order with printed books has one delivery fee, ${policy.shippingFeesUsd.phnomPenh} in Phnom Penh and ${policy.shippingFeesUsd.provinces}{" "}
              to the provinces, set by the delivery address; orders with only ebooks or audiobooks have none. See{" "}
              <Link to="/shipping">shipping & delivery</Link> for areas and times.
            </p>
          ),
        },
        {
          id: "cancelling",
          title: "Cancelling",
          body: <p>You can cancel an order yourself while it is pending. After that it can't be cancelled online, but printed books can be returned.</p>,
        },
        {
          id: "returns",
          title: "Returns and refunds",
          body: (
            <p>
              Printed books can be returned within {policy.returnWindowDays} days of delivery; ebooks and audiobooks can't. Refunds cover what you paid
              for the returned books, less their share of any coupon, and not the delivery fee. The full rules are in the{" "}
              <Link to="/returns-policy">returns policy</Link>.
            </p>
          ),
        },
        {
          id: "reviews",
          title: "Reviews",
          body: (
            <>
              <p>You can review a book once an order with it has been delivered, one review per book. Keep reviews about the book. We may hide reviews that:</p>
              <ul>
                <li>are abusive, hateful or harassing;</li>
                <li>share someone's personal details;</li>
                <li>are advertising, spam or links;</li>
                <li>are about something other than the book (for delivery problems, contact us instead).</li>
              </ul>
              <p>A hidden review stays in your account, marked as hidden, and you can still edit or delete it.</p>
            </>
          ),
        },
        {
          id: "changes",
          title: "Changes to these terms",
          body: (
            <p>
              If these terms change, we'll update the date at the top. The terms that apply to an order are the ones in place when you placed it.
              Questions? <Link to="/contact">Contact us</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}

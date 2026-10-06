import { Link } from "react-router-dom";
import { delivery, policy } from "@/content/shop";
import { ContentPage } from "@/features/content/ContentPage";

/* /shipping: what delivery costs, where and how fast, paying the courier, following an order. */
export default function ShippingPage() {
  return (
    <ContentPage
      title="Shipping & delivery"
      eyebrow="Help"
      lead="Printed books come to your door and you pay the courier when they arrive. Ebooks and audiobooks need no delivery at all."
      facts={[
        { value: `$${policy.shippingFeesUsd.phnomPenh}`, label: `delivery per order in Phnom Penh ($${policy.shippingFeesUsd.provinces} to the provinces)` },
        { value: "Free", label: "for orders with only ebooks or audiobooks" },
        { value: "Cash", label: "paid to the courier, in US dollars or riel" },
      ]}
      sections={[
        {
          id: "cost",
          title: "What delivery costs",
          body: (
            <>
              <p>
                Every order with a printed book (hardcover or paperback) has one delivery fee: <strong>${policy.shippingFeesUsd.phnomPenh}</strong> in
                Phnom Penh and <strong>${policy.shippingFeesUsd.provinces}</strong> to the provinces. It doesn't change with the number of books, so two
                novels and a cookbook cost the same to deliver as one paperback.
              </p>
              <p>
                Orders with only ebooks or audiobooks have no delivery fee. The fee follows the delivery address you choose, and you'll see it, and the
                total, at checkout before you place the order.
              </p>
            </>
          ),
        },
        {
          id: "where",
          title: "Where we deliver and how long it takes",
          body: (
            <>
              <p>
                Delivery times count from when your order is confirmed, on working days (Monday to Saturday).
              </p>
              <ul>
                {delivery.areas.map((a) => (
                  <li key={a.area}>
                    <strong>{a.area}:</strong> {a.time}, ${a.feeUsd}
                  </li>
                ))}
              </ul>
              <p>Check that the phone number on your delivery address is one you answer, in case the courier needs to reach you.</p>
            </>
          ),
        },
        {
          id: "paying",
          title: "Paying the courier",
          body: (
            <>
              <p>
                Bookly is cash on delivery: nothing is charged when you place an order. Pay the courier the order total when the books arrive, in US
                dollars or the riel amount shown on your order. Card and Bakong KHQR payments are coming soon.
              </p>
              <p>Prices in riel are worked out from the dollar price at the shop's current exchange rate, so the riel total can move slightly between days.</p>
            </>
          ),
        },
        {
          id: "tracking",
          title: "Following your order",
          body: (
            <>
              <p>
                Every order has a timeline in <Link to="/account/orders">your orders</Link>. It moves through these steps, with a note from the shop when
                there's something to add:
              </p>
              <ul>
                <li>
                  <strong>Pending:</strong> we've received it and will confirm it soon.
                </li>
                <li>
                  <strong>Processing:</strong> your books are being packed.
                </li>
                <li>
                  <strong>Shipped:</strong> it's with the courier.
                </li>
                <li>
                  <strong>Delivered:</strong> it's arrived. From here you can review your books or, within {policy.returnWindowDays} days, return printed ones.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "changes",
          title: "Changing or cancelling an order",
          body: (
            <>
              <p>
                While an order is still pending you can cancel it yourself: open it in <Link to="/account/orders">your orders</Link> and choose Cancel order.
                The books go back on the shelf and nothing is owed.
              </p>
              <p>
                Once it's being processed it can't be cancelled online. If something's wrong, <Link to="/contact">contact us</Link> with your order number
                (it starts with ORD-), or return the books after delivery under our <Link to="/returns-policy">returns policy</Link>.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}

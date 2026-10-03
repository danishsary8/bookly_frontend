import { Link } from "react-router-dom";
import { policy } from "@/content/shop";
import { ContentPage } from "@/features/content/ContentPage";

/* /returns-policy: the rules the API enforces for returns, and how to ask for one. */
export default function ReturnsPolicyPage() {
  const days = policy.returnWindowDays;
  return (
    <ContentPage
      title="Returns policy"
      eyebrow="Help"
      lead={`Changed your mind or a book arrived damaged? Printed books can be sent back within ${days} days of delivery. You start the return from your account.`}
      facts={[
        { value: `${days} days`, label: "from the day your order is delivered" },
        { value: "Printed", label: "hardcovers and paperbacks; not ebooks or audiobooks" },
        { value: "Online", label: "request it from the order in your account" },
      ]}
      sections={[
        {
          id: "window",
          title: "When you can return",
          body: (
            <>
              <p>
                You can ask for a return for <strong>{days} days after your order is delivered</strong>. The last day is shown on the order in your
                account, next to Request a return. After that the window closes and the button goes away.
              </p>
              <p>Orders that haven't been delivered yet can't be returned: if an order is still pending, you can cancel it instead.</p>
            </>
          ),
        },
        {
          id: "what",
          title: "What can be returned",
          body: (
            <ul>
              <li>Hardcovers and paperbacks from a delivered order, up to the number you bought.</li>
              <li>Ebooks and audiobooks can't be returned.</li>
              <li>
                One return request per order at a time. If you've already asked, wait for the answer or withdraw it, then ask again for the other books.
              </li>
              <li>Keep the books in the packaging they came in until the return is answered.</li>
            </ul>
          ),
        },
        {
          id: "how",
          title: "How to ask for a return",
          body: (
            <>
              <ol className="mt-4 grid list-decimal gap-2 pl-5 marker:font-semibold marker:text-primary">
                <li className="pl-1">
                  Open the order in <Link to="/account/orders?status=delivered">your delivered orders</Link>.
                </li>
                <li className="pl-1">Choose Request a return.</li>
                <li className="pl-1">Tick the books to send back and how many, and add a note for any that are damaged.</li>
                <li className="pl-1">Tell us why you're returning them, and send the request.</li>
              </ol>
              <p>You'll see the request straight away in <Link to="/account/returns">your returns</Link>, with an estimate of your refund.</p>
            </>
          ),
        },
        {
          id: "next",
          title: "What happens next",
          body: (
            <ul>
              <li>
                <strong>Requested:</strong> the shop is looking at it. You can still withdraw it.
              </li>
              <li>
                <strong>Approved:</strong> the return is accepted; the refund follows once the shop has received and checked the books.
              </li>
              <li>
                <strong>Not accepted:</strong> the shop explains why in a note on the return.
              </li>
              <li>
                <strong>Refunded:</strong> your refund has been paid, and the amount on the return is final.
              </li>
            </ul>
          ),
        },
        {
          id: "refunds",
          title: "How much you get back",
          body: (
            <>
              <p>
                You get back what you paid for the returned books. If your order used a coupon, each book's share of the discount is taken off, so you
                never get back more than you paid. The delivery fee isn't refunded.
              </p>
              <p>For example: two books at $20.00 and $10.00 with a 10% coupon ($3.00 off). Return the $20.00 book and its share of the discount is $2.00, so you get back $18.00.</p>
            </>
          ),
        },
        {
          id: "help",
          title: "Wrong or damaged books",
          body: (
            <p>
              If a book arrived damaged or isn't what you ordered, request a return and say so in the note for that book. If something else went wrong,{" "}
              <Link to="/contact">contact us</Link> with your order number (it starts with ORD-).
            </p>
          ),
        },
      ]}
    />
  );
}

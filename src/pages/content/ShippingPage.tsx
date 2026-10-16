import { Link } from "react-router-dom";
import { delivery, policy } from "@/content/shop";
import { ContentPage } from "@/features/content/ContentPage";
import { useT } from "@/i18n";

/* /shipping: what delivery costs, where and how fast, paying the courier, following an order. */
export default function ShippingPage() {
  const { lang } = useT();
  const isKm = lang === "km";

  const title = isKm ? "ការដឹកជញ្ជូន និងការប្រគល់ទំនិញ" : "Shipping & delivery";
  const eyebrow = isKm ? "ជំនួយ" : "Help";
  const lead = isKm
    ? "សៀវភៅបោះពុម្ពនឹងត្រូវបានដឹកជញ្ជូនដល់មាត់ទ្វាររបស់អ្នក ហើយអ្នកអាចទូទាត់ប្រាក់ជូនអ្នកដឹកជញ្ជូនពេលទំនិញមកដល់។ សៀវភៅអេឡិចត្រូនិច (Ebooks) និងសៀវភៅសំឡេង (Audiobooks) មិនគិតថ្លៃសេវាដឹកជញ្ជូនទេ។"
    : "Printed books come to your door and you pay the courier when they arrive. Ebooks and audiobooks need no delivery at all.";

  const facts = isKm
    ? [
        { value: `$${policy.shippingFeesUsd.phnomPenh}`, label: `សេវាដឹកក្នុងរាជធានីភ្នំពេញ ($${policy.shippingFeesUsd.provinces} ទៅកាន់បណ្តាខេត្ត)` },
        { value: `លើស $${policy.freeShippingThresholdUsd}`, label: "ដឹកជញ្ជូនឥតគិតថ្លៃសម្រាប់ការបញ្ជាទិញចាប់ពី $50 ឡើងទៅ" },
        { value: "សាច់ប្រាក់", label: "ទូទាត់ពេលទទួលទំនិញ (COD) ជាប្រាក់ដុល្លារ ឬរៀល" },
      ]
    : [
        { value: `$${policy.shippingFeesUsd.phnomPenh}`, label: `delivery per order in Phnom Penh ($${policy.shippingFeesUsd.provinces} to the provinces)` },
        { value: `Free over $${policy.freeShippingThresholdUsd}`, label: `free delivery on printed book orders of $${policy.freeShippingThresholdUsd} or more` },
        { value: "Cash", label: "paid to the courier, in US dollars or riel" },
      ];

  const sections = isKm
    ? [
        {
          id: "cost",
          title: "តម្លៃសេវាដឹកជញ្ជូន",
          body: (
            <>
              <p>
                រាល់ការបញ្ជាទិញសៀវភៅបោះពុម្ព (ក្របក្រាស់ ឬក្របស្តើង) មានតម្លៃដឹកជញ្ជូនថេរមួយគត់គឺ <strong>${policy.shippingFeesUsd.phnomPenh}</strong> សម្រាប់រាជធានីភ្នំពេញ និង <strong>${policy.shippingFeesUsd.provinces}</strong> សម្រាប់បណ្តាខេត្តនានា (ខេត្តកណ្តាលត្រឹមតែ ${policy.shippingFeesUsd.kandal} និងខេត្តដាច់ស្រយាល ${policy.shippingFeesUsd.remote})។ តម្លៃសេវាដឹកមិនប្រែប្រួលតាមចំនួនសៀវភៅនោះទេ ដូច្នេះការទិញសៀវភៅបីក្បាលគិតថ្លៃដឹកដូចទិញមួយក្បាលដែរ។
              </p>
              <p>
                ពិសេសជាងនេះទៅទៀត ការបញ្ជាទិញសៀវភៅបោះពុម្ពសរុបចាប់ពី <strong>${policy.freeShippingThresholdUsd} ឡើងទៅ នឹងទទួលបានការដឹកជញ្ជូនឥតគិតថ្លៃទូទាំង ២៥ រាជធានី-ខេត្ត</strong>។
              </p>
              <p>
                ការបញ្ជាទិញដែលមានតែ Ebook ឬ Audiobook មិនមានគិតថ្លៃសេវាដឹកជញ្ជូនឡើយ។
              </p>
            </>
          ),
        },
        {
          id: "where",
          title: "តំបន់ដឹកជញ្ជូន និងរយៈពេល",
          body: (
            <>
              <p>
                យើងដឹកជញ្ជូនទូទាំង ២៥ រាជធានី-ខេត្តក្នុងប្រទេសកម្ពុជា។ រយៈពេលដឹកជញ្ជូនត្រូវបានរាប់ចាប់ពីពេលការបញ្ជាទិញត្រូវបានបញ្ជាក់ ក្នុងថ្ងៃធ្វើការ (ថ្ងៃច័ន្ទ ដល់ ថ្ងៃសៅរ៍)៖
              </p>
              <ul>
                {delivery.areas.map((a) => (
                  <li key={a.area}>
                    <strong>{a.areaKm}:</strong> {a.timeKm}, ${a.feeUsd}
                  </li>
                ))}
              </ul>
              <p>សូមប្រាកដថាលេខទូរស័ព្ទលើអាសយដ្ឋានដឹកជញ្ជូនរបស់អ្នកអាចទាក់ទងបាន ដើម្បីឱ្យអ្នកដឹកជញ្ជូនអាចទូរស័ព្ទជូនដំណឹងពេលទៅដល់។</p>
            </>
          ),
        },
        {
          id: "paying",
          title: "ការទូទាត់ប្រាក់ជូនអ្នកដឹកជញ្ជូន",
          body: (
            <>
              <p>
                Bookly អនុវត្តតាមគោលការណ៍ទូទាត់ពេលទទួលទំនិញ (Cash on Delivery): មិនមានការកាត់ប្រាក់ជាមុននៅពេលអ្នកធ្វើការបញ្ជាទិញឡើយ។ អ្នកគ្រាន់តែបង់ប្រាក់សរុបជូនអ្នកដឹកជញ្ជូនពេលកញ្ចប់សៀវភៅមកដល់ ជាប្រាក់ដុល្លារអាមេរិក ឬប្រាក់រៀលតាមចំនួនដែលបានបង្ហាញលើវិក្កយបត្រ។
              </p>
              <p>តម្លៃជាប្រាក់រៀលត្រូវបានគណនាតាមអត្រាប្តូរប្រាក់ជាក់ស្តែងរបស់ហាងនៅថ្ងៃបញ្ជាទិញ។</p>
            </>
          ),
        },
        {
          id: "tracking",
          title: "ការតាមដានការបញ្ជាទិញ",
          body: (
            <>
              <p>
                រាល់ការបញ្ជាទិញមានកាលវិភាគតាមដានក្នុង <Link to="/account/orders">ការបញ្ជាទិញរបស់អ្នក</Link>។ ស្ថានភាពផ្លាស់ប្តូរតាមដំណាក់កាលដូចខាងក្រោម៖
              </p>
              <ul>
                <li>
                  <strong>រង់ចាំ (Pending):</strong> យើងបានទទួលការបញ្ជាទិញ ហើយនឹងពិនិត្យបញ្ជាក់ក្នុងពេលឆាប់ៗ។
                </li>
                <li>
                  <strong>កំពុងរៀបចំ (Processing):</strong> សៀវភៅរបស់អ្នកកំពុងត្រូវបានវេចខ្ចប់យ៉ាងប្រុងប្រយ័ត្ន។
                </li>
                <li>
                  <strong>បានបញ្ជូនចេញ (Shipped):</strong> កញ្ចប់សៀវភៅបានប្រគល់ជូនអ្នកដឹកជញ្ជូនហើយ។
                </li>
                <li>
                  <strong>បានប្រគល់ជូន (Delivered):</strong> កញ្ចប់សៀវភៅបានមកដល់ដៃអ្នក។ គិតចាប់ពីពេលនេះ អ្នកអាចវាយតម្លៃសៀវភៅ ឬស្នើសុំប្តូរ/សងត្រឡប់ក្នុងរយៈពេល {policy.returnWindowDays} ថ្ងៃ។
                </li>
              </ul>
              <p>
                អ្នកក៏អាចភ្ជាប់ Telegram Bot នៅក្នុងទំព័រគណនី ដើម្បីទទួលបានការជូនដំណឹងផ្ទាល់លើ Telegram ពេលការបញ្ជាទិញត្រូវបានបញ្ជូនចេញ។
              </p>
            </>
          ),
        },
        {
          id: "changes",
          title: "ការផ្លាស់ប្តូរ ឬលុបចោលការបញ្ជាទិញ",
          body: (
            <p>
              នៅពេលការបញ្ជាទិញស្ថិតក្នុងស្ថានភាព “រង់ចាំ” (Pending) អ្នកអាចលុបចោលការបញ្ជាទិញដោយខ្លួនឯងបាន ដោយចូលទៅកាន់ <Link to="/account/orders">ការបញ្ជាទិញរបស់អ្នក</Link> ហើយជ្រើសរើស “បោះបង់ការបញ្ជាទិញ”។
            </p>
          ),
        },
      ]
    : [
        {
          id: "cost",
          title: "What delivery costs",
          body: (
            <>
              <p>
                Every order with a printed book (hardcover or paperback) has one delivery fee: <strong>${policy.shippingFeesUsd.phnomPenh}</strong> in
                Phnom Penh and <strong>${policy.shippingFeesUsd.provinces}</strong> to the provinces ($2.00 for Kandal, $3.50 for remote provinces). It doesn't change with the number of books, so two
                novels and a cookbook cost the same to deliver as one paperback.
              </p>
              <p>
                <strong>Free delivery:</strong> Orders containing physical books totaling <strong>${policy.freeShippingThresholdUsd} or more receive free shipping</strong> across all 25 provinces in Cambodia.
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
                We deliver to all 25 provinces across Cambodia. Delivery times count from when your order is confirmed, on working days (Monday to Saturday):
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
              <p>
                You can also connect our Telegram Bot in your account settings to receive instant delivery alerts as your package is dispatched.
              </p>
            </>
          ),
        },
        {
          id: "changes",
          title: "Changing or cancelling an order",
          body: (
            <p>
              While an order is still pending you can cancel it yourself: open it in <Link to="/account/orders">your orders</Link> and choose Cancel order.
            </p>
          ),
        },
      ];

  return (
    <ContentPage
      title={title}
      eyebrow={eyebrow}
      lead={lead}
      facts={facts}
      sections={sections}
    />
  );
}

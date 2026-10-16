import { Link } from "react-router-dom";
import { policy, shop } from "@/content/shop";
import { ContentPage } from "@/features/content/ContentPage";
import { LegalNotice } from "@/features/content/LegalNotice";
import { useT } from "@/i18n";

/*
 * /terms: the rules of buying from Bookly Shop in plain language, matching what the API
 * enforces (approved by the owner 2026-10-06).
 * Section ids are linked from elsewhere (/terms#reviews from the FAQ).
 */
export default function TermsPage() {
  const { lang } = useT();
  const isKm = lang === "km";

  const title = isKm ? "លក្ខខណ្ឌនៃការលក់" : "Terms of sale";
  const documentTitle = isKm ? "លក្ខខណ្ឌ" : "Terms";
  const eyebrow = isKm ? "ច្បាប់" : "Legal";
  const lead = isKm
    ? `គោលការណ៍ និងលក្ខខណ្ឌសម្រាប់ការទិញពី ${shop.name}៖ គណនីរបស់អ្នក តម្លៃទំនិញ ការទូទាត់ប្រាក់ ការដឹកជញ្ជូន ការសងត្រឡប់ និងការវាយតម្លៃ។`
    : `The rules for buying from ${shop.name}: your account, prices, paying, delivery, returns and reviews.`;

  const sections = isKm
    ? [
        {
          id: "account",
          title: "គណនីរបស់អ្នក",
          body: (
            <p>
              អ្នកត្រូវមានគណនីដែលបានផ្ទៀងផ្ទាត់អ៊ីមែល ឬលេខទូរស័ព្ទដើម្បីធ្វើការបញ្ជាទិញ។ សូមរក្សាការសម្ងាត់នៃពាក្យសម្ងាត់របស់អ្នក អ្នកត្រូវទទួលខុសត្រូវលើរាល់ការបញ្ជាទិញដែលធ្វើឡើងតាមរយៈគណនីរបស់អ្នក។ យើងរក្សាសិទ្ធិក្នុងការបិទគណនីដែលពាក់ព័ន្ធនឹងការក្លែងបន្លំ ឬការបំពាន។
            </p>
          ),
        },
        {
          id: "prices",
          title: "តម្លៃទំនិញ",
          body: (
            <>
              <p>
                តម្លៃទាំងអស់ត្រូវបានកំណត់ជាប្រាក់ដុល្លារអាមេរិក (USD)។ តម្លៃគិតជាប្រាក់រៀលត្រូវបានបំប្លែងតាមអត្រាប្តូរប្រាក់ជាក់ស្តែងរបស់ហាងសម្រាប់ជាការសម្រួល ហើយតម្លៃដុល្លារជាតម្លៃគោលផ្លូវការ។
              </p>
              <p>
                តម្លៃ និងចំនួនស្តុកអាចប្រែប្រួលខណៈពេលដែលសៀវភៅស្ថិតនៅក្នុងកន្ត្រកទំនិញរបស់អ្នក។ កន្ត្រកទំនិញ និងទំព័រទូទាត់ប្រាក់តែងតែបង្ហាញតម្លៃបច្ចុប្បន្ន ហើយចំនួនទឹកប្រាក់សរុបដែលអ្នកឃើញពេលបញ្ជាក់ការបញ្ជាទិញ គឺជាចំនួនដែលអ្នកត្រូវទូទាត់។
              </p>
            </>
          ),
        },
        {
          id: "orders",
          title: "ការបញ្ជាទិញ",
          body: (
            <>
              <p>
                ការបញ្ជាទិញរបស់អ្នកត្រូវបានចាត់ទុកថាជោគជ័យ នៅពេលដែលអ្នកឃើញទំព័របញ្ជាក់ដែលមានលេខកូដបញ្ជាទិញ (Order Number)។ យើងអាចលុបចោលការបញ្ជាទិញប្រសិនបើសៀវភៅអស់ពីស្តុក ឬតម្លៃមានកំហុសឆ្គងច្បាស់ក្រឡែត ដោយយើងនឹងជូនដំណឹងដល់អ្នកភ្លាមៗ។
              </p>
              <p>ប័ណ្ណបញ្ចុះតម្លៃ (Coupon) អាចប្រើបានតែម្តងក្នុងមួយគណនី និងមួយប័ណ្ណក្នុងមួយការបញ្ជាទិញ ដោយត្រូវបំពេញតាមលក្ខខណ្ឌកំណត់ (ដូចជាតម្លៃសរុបអប្បបរមា)។</p>
            </>
          ),
        },
        {
          id: "payment",
          title: "ការទូទាត់ប្រាក់",
          body: <p>ការបញ្ជាទិញទាំងអស់ត្រូវបានទូទាត់ជាសាច់ប្រាក់ជូនអ្នកដឹកជញ្ជូនពេលទំនិញមកដល់ (Cash on Delivery) ជាប្រាក់ដុល្លារអាមេរិក ឬប្រាក់រៀល។ ការទូទាត់តាមកាត និង Bakong KHQR នឹងត្រូវបានដាក់ឱ្យដំណើរការនាពេលខាងមុខ។</p>,
        },
        {
          id: "delivery",
          title: "ការដឹកជញ្ជូន",
          body: (
            <p>
              រាល់ការបញ្ជាទិញសៀវភៅបោះពុម្ពមានតម្លៃសេវាដឹកជញ្ជូនមួយគត់គឺ ${policy.shippingFeesUsd.phnomPenh} ក្នុងរាជធានីភ្នំពេញ និង ${policy.shippingFeesUsd.provinces} ទៅកាន់បណ្តាខេត្តនានា ហើយការបញ្ជាទិញចាប់ពី ${policy.freeShippingThresholdUsd} ឡើងទៅទទួលបានការដឹកជញ្ជូនឥតគិតថ្លៃ។ ការបញ្ជាទិញដែលមានតែ Ebook ឬ Audiobook មិនមានគិតថ្លៃសេវាដឹកទេ។ សូមមើលព័ត៌មានបន្ថែមក្នុងទំព័រ <Link to="/shipping">ការដឹកជញ្ជូន</Link>។
            </p>
          ),
        },
        {
          id: "cancelling",
          title: "ការលុបចោលការបញ្ជាទិញ",
          body: <p>អ្នកអាចលុបចោលការបញ្ជាទិញដោយខ្លួនឯងបានខណៈពេលដែលការបញ្ជាទិញស្ថិតក្នុងស្ថានភាព “រង់ចាំ” (Pending)។ បន្ទាប់ពីការបញ្ជាទិញត្រូវបានបញ្ជាក់ និងរៀបចំ អ្នកមិនអាចលុបចោលតាមអនឡាញបានឡើយ ប៉ុន្តែអ្នកអាចស្នើសុំប្តូរទំនិញវិញបានបន្ទាប់ពីបានទទួល។</p>,
        },
        {
          id: "returns",
          title: "ការប្តូរ និងសងប្រាក់ត្រឡប់",
          body: (
            <p>
              សៀវភៅបោះពុម្ពអាចស្នើសុំប្តូរ ឬសងត្រឡប់បានក្នុងរយៈពេល {policy.returnWindowDays} ថ្ងៃបន្ទាប់ពីបានប្រគល់ជូន។ សៀវភៅ Ebook និង Audiobook មិនអាចសងត្រឡប់បានទេ។ ការសងប្រាក់វិញគ្របដណ្តប់លើតម្លៃសៀវភៅដកការបញ្ចុះតម្លៃ ដោយមិនរាប់បញ្ចូលសេវាដឹកជញ្ជូនឡើយ។ សូមអានលម្អិតក្នុង <Link to="/returns-policy">គោលការណ៍ប្តូរទំនិញ</Link>។
            </p>
          ),
        },
        {
          id: "reviews",
          title: "ការបញ្ចេញមតិ និងវាយតម្លៃ",
          body: (
            <>
              <p>អ្នកអាចវាយតម្លៃសៀវភៅបាន បន្ទាប់ពីការបញ្ជាទិញដែលមានសៀវភៅនោះត្រូវបានប្រគល់ជូនរួចរាល់ ដោយអនុញ្ញាតមួយការវាយតម្លៃក្នុងមួយសៀវភៅ។ សូមរក្សាខ្លឹមសារវាយតម្លៃឱ្យផ្តោតលើសៀវភៅ។ We may hide reviews that:</p>
              <ul>
                <li>មានលក្ខណៈប្រមាថ ស្អប់ខ្ពើម ឬបៀតបៀន</li>
                <li>ជាសារពាណិជ្ជកម្មឥតប្រយោជន៍ (Spam) ឬការផ្សាយពាណិជ្ជកម្ម</li>
                <li>គ្មានខ្លឹមសារទាក់ទងនឹងសៀវភៅ</li>
              </ul>
            </>
          ),
        },
      ]
    : [
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
              to the provinces, set by the delivery address; orders with only ebooks or audiobooks have none. Orders of ${policy.freeShippingThresholdUsd} or more receive free shipping across Cambodia. See{" "}
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
                <li>contain spam, commercial solicitations, or irrelevant content;</li>
                <li>spoil key plot points without warning.</li>
              </ul>
            </>
          ),
        },
      ];

  return (
    <ContentPage
      title={title}
      documentTitle={documentTitle}
      eyebrow={eyebrow}
      lead={lead}
      numbered
      notice={<LegalNotice />}
      sections={sections}
    />
  );
}

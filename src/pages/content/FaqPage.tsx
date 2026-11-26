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

const groupsKm: Array<{ id: string; title: string; items: Faq[] }> = [
  {
    id: "orders",
    title: "ការបញ្ជាទិញ និងការទូទាត់ប្រាក់",
    items: [
      {
        id: "how-to-pay",
        q: "តើខ្ញុំត្រូវទូទាត់ប្រាក់ដោយរបៀបណា?",
        a: (
          <p>
            ទូទាត់ជាសាច់ប្រាក់ពេលសៀវភៅមកដល់៖ Bookly មានសេវាទូទាត់ពេលទទួលទំនិញ (COD) ដូច្នេះមិនមានការកាត់ប្រាក់ពេលអ្នកបញ្ជាទិញឡើយ។ អ្នកអាចបង់ជូនអ្នកដឹកជញ្ជូនជាប្រាក់ដុល្លារអាមេរិក ឬប្រាក់រៀល។ អ្នកក៏អាចទូទាត់តាម Bakong KHQR បានផងដែរនៅពេលទូទាត់ប្រាក់។
          </p>
        ),
      },
      {
        id: "need-account",
        q: "តើខ្ញុំចាំបាច់ត្រូវមានគណនីដើម្បីបញ្ជាទិញដែរឬទេ?",
        a: (
          <p>
            បាទ/ចាស។ សូម<Link to="/register">បង្កើតគណនី</Link> រួចផ្ទៀងផ្ទាត់អ៊ីមែល ឬលេខទូរស័ព្ទរបស់អ្នក បន្ទាប់មកអ្នកអាចដាក់សៀវភៅចូលកន្ត្រក រក្សាទុកក្នុងបញ្ជីប្រាថ្នា និងធ្វើការបញ្ជាទិញបាន។ ការមើលសៀវភៅ និងអានការវាយតម្លៃមិនចាំបាច់មានគណនីទេ។
          </p>
        ),
      },
      {
        id: "coupons",
        q: "តើប័ណ្ណបញ្ចុះតម្លៃប្រើដោយរបៀបណា?",
        a: (
          <>
            <p>បញ្ចូលលេខកូដប័ណ្ណនៅលើទំព័រកន្ត្រក រួចចុច «ប្រើ»។ អ្នកនឹងឃើញចំនួនបញ្ចុះតម្លៃមុនពេលទូទាត់ប្រាក់។</p>
            <ul>
              <li>ប្រើបានមួយប័ណ្ណក្នុងមួយការបញ្ជាទិញ។</li>
              <li>ប័ណ្ណនីមួយៗប្រើបានម្តងក្នុងមួយគណនី។ ប្រសិនបើអ្នកបោះបង់ការបញ្ជាទិញ អ្នកអាចយកប័ណ្ណនោះមកប្រើម្តងទៀតបាន។</li>
              <li>ប័ណ្ណខ្លះតម្រូវឱ្យមានតម្លៃបញ្ជាទិញអប្បបរមា។ ប្រសិនបើអ្នកដកសៀវភៅចេញធ្វើឱ្យតម្លៃទាបជាងលក្ខខណ្ឌ ប័ណ្ណនឹងត្រូវដកចេញដោយស្វ័យប្រវត្តិ ហើយយើងនឹងប្រាប់ពីមូលហេតុ។</li>
            </ul>
          </>
        ),
      },
      {
        id: "cancel-order",
        q: "តើខ្ញុំអាចបោះបង់ការបញ្ជាទិញបានទេ?",
        a: (
          <p>
            បាន ខណៈពេលការបញ្ជាទិញស្ថិតក្នុងស្ថានភាព «កំពុងរង់ចាំ»៖ បើកវានៅក្នុង<Link to="/account/orders">ការបញ្ជាទិញរបស់អ្នក</Link> រួចជ្រើសរើស «បោះបង់ការបញ្ជាទិញ»។ នៅពេលហាងចាប់ផ្តើមរៀបចំហើយ អ្នកមិនអាចបោះបង់តាមអនឡាញបានទេ ប៉ុន្តែអ្នកអាចស្នើប្តូរត្រឡប់សៀវភៅបោះពុម្ពបានបន្ទាប់ពីទទួលទំនិញ។
          </p>
        ),
      },
      {
        id: "riel-prices",
        q: "ហេតុអ្វីបានជាតម្លៃជាប្រាក់រៀលមានការប្រែប្រួល?",
        a: <p>តម្លៃសៀវភៅត្រូវបានកំណត់ជាប្រាក់ដុល្លារអាមេរិក។ ចំនួនជាប្រាក់រៀលត្រូវបានគណនាតាមអត្រាប្តូរប្រាក់បច្ចុប្បន្នរបស់ហាង ដូច្នេះវាអាចប្រែប្រួលបន្តិចបន្តួចពីមួយថ្ងៃទៅមួយថ្ងៃ។</p>,
      },
    ],
  },
  {
    id: "delivery",
    title: "ការដឹកជញ្ជូន",
    items: [
      {
        id: "delivery-cost",
        q: "តើថ្លៃដឹកជញ្ជូនប៉ុន្មាន?",
        a: (
          <p>
            ${policy.shippingFeesUsd.phnomPenh} ក្នុងមួយការបញ្ជាទិញសម្រាប់រាជធានីភ្នំពេញ និង ${policy.shippingFeesUsd.provinces} ទៅកាន់បណ្តាខេត្ត មិនថាអ្នកទិញសៀវភៅប៉ុន្មានក្បាលឡើយ។ ការបញ្ជាទិញដែលមានតែសៀវភៅអេឡិចត្រូនិក ឬសៀវភៅជាសំឡេង មិនគិតថ្លៃដឹកជញ្ជូនទេ។
          </p>
        ),
      },
      {
        id: "delivery-time",
        q: "តើការដឹកជញ្ជូនចំណាយពេលប៉ុន្មានថ្ងៃ?",
        a: (
          <p>
            អាស្រ័យលើទីតាំងរបស់អ្នក។ សូមមើល<Link to="/shipping#where">តំបន់ដឹកជញ្ជូន និងរយៈពេល</Link>។
          </p>
        ),
      },
      {
        id: "track-order",
        q: "តើការបញ្ជាទិញរបស់ខ្ញុំដល់ណាហើយ?",
        a: (
          <p>
            បើកមើលក្នុង<Link to="/account/orders">ការបញ្ជាទិញរបស់អ្នក</Link>។ ប្រវត្តិតាមដាននឹងបង្ហាញដំណាក់កាលនីមួយៗ (កំពុងរង់ចាំ កំពុងរៀបចំ បានផ្ញើចេញ បានដឹកដល់) ព្រមទាំងកំណត់ចំណាំពីហាង។
          </p>
        ),
      },
    ],
  },
  {
    id: "returns",
    title: "ការប្តូរត្រឡប់",
    items: [
      {
        id: "return-book",
        q: "តើខ្ញុំអាចប្តូរត្រឡប់សៀវភៅបានទេ?",
        a: (
          <p>
            សម្រាប់សៀវភៅបោះពុម្ពគឺបាន ក្នុងរយៈពេល {policy.returnWindowDays} ថ្ងៃបន្ទាប់ពីបានដឹកដល់ ដោយស្នើសុំពីទំព័រការបញ្ជាទិញក្នុងគណនីរបស់អ្នក។ សូមអាន<Link to="/returns-policy">គោលការណ៍ប្តូរត្រឡប់</Link>សម្រាប់ព័ត៌មានលម្អិត។
          </p>
        ),
      },
      {
        id: "return-ebook",
        q: "តើខ្ញុំអាចប្តូរត្រឡប់សៀវភៅអេឡិចត្រូនិក ឬសៀវភៅជាសំឡេងបានទេ?",
        a: <p>មិនបានទេ។ សៀវភៅឌីជីថលមិនអាចស្នើប្តូរត្រឡប់បានឡើយ។</p>,
      },
      {
        id: "refund-amount",
        q: "តើខ្ញុំនឹងទទួលបានប្រាក់សងវិញប៉ុន្មាន?",
        a: (
          <p>
            អ្នកនឹងទទួលបានចំនួនទឹកប្រាក់ដែលអ្នកបានបង់សម្រាប់សៀវភៅដែលសងត្រឡប់ ដកចំណែកបញ្ចុះតម្លៃនៃប័ណ្ណបញ្ចុះតម្លៃ (ប្រសិនបើមាន)។ ថ្លៃដឹកជញ្ជូនមិនត្រូវបានសងវិញទេ។ សំណើប្តូរត្រឡប់របស់អ្នកនឹងបង្ហាញចំនួនទឹកប្រាក់នេះ។ <Link to="/returns-policy#refunds">មើលឧទាហរណ៍</Link>។
          </p>
        ),
      },
    ],
  },
  {
    id: "account",
    title: "គណនីរបស់អ្នក",
    items: [
      {
        id: "no-code",
        q: "ខ្ញុំមិនបានទទួលលេខកូដផ្ទៀងផ្ទាត់ទេ",
        a: (
          <p>
            សូមពិនិត្យថតសារឥតបានការ (Spam) ជាមុនសិន។ លេខកូដផុតកំណត់បន្ទាប់ពី 15 នាទី។ នៅលើទំព័រផ្ទៀងផ្ទាត់ អ្នកអាចស្នើផ្ញើលេខកូដថ្មីម្តងទៀតបានបន្ទាប់ពីរង់ចាំមួយភ្លែត ហើយមានតែលេខកូដចុងក្រោយបំផុតប៉ុណ្ណោះដែលប្រើបាន។ ប្រសិនបើអ្នកវាយអ៊ីមែលខុសពេលចុះឈ្មោះ សូមជ្រើស «ចាកចេញ ហើយចាប់ផ្តើមម្តងទៀត»។
          </p>
        ),
      },
      {
        id: "forgot-password",
        q: "ខ្ញុំភ្លេចពាក្យសម្ងាត់របស់ខ្ញុំ",
        a: (
          <p>
            ចុចលើ<Link to="/forgot-password">ភ្លេចពាក្យសម្ងាត់</Link>នៅលើទំព័រចូលគណនី។ យើងនឹងផ្ញើលេខកូដតាមអ៊ីមែល ដើម្បីឱ្យអ្នកកំណត់ពាក្យសម្ងាត់ថ្មី។
          </p>
        ),
      },
      {
        id: "change-email",
        q: "តើខ្ញុំអាចប្តូរអ៊ីមែល ឬលុបគណនីរបស់ខ្ញុំបានទេ?",
        a: (
          <p>
            អ្នកអាចប្តូរឈ្មោះ លេខទូរស័ព្ទ ពាក្យសម្ងាត់ អាសយដ្ឋាន បន្ថែម ឬប្តូរអ៊ីមែល និងលុបគណនីដោយខ្លួនឯងនៅក្នុង<Link to="/account">គណនីរបស់អ្នក</Link>។ ប្រសិនបើអ្នកត្រូវការជំនួយបន្ថែម សូម<Link to="/contact">ទាក់ទងមកយើង</Link>តាមរយៈអ៊ីមែលដែលភ្ជាប់នឹងគណនីរបស់អ្នក។
          </p>
        ),
      },
    ],
  },
  {
    id: "reviews",
    title: "ការវាយតម្លៃ",
    items: [
      {
        id: "who-reviews",
        q: "តើអ្នកណាអាចសរសេរការវាយតម្លៃបាន?",
        a: (
          <p>
            មានតែអតិថិជនដែលបានទិញសៀវភៅប៉ុណ្ណោះ៖ នៅពេលការបញ្ជាទិញដែលមានសៀវភៅនោះត្រូវបានដឹកដល់ ប៊ូតុង «សរសេរការវាយតម្លៃ» នឹងបង្ហាញលើទំព័រសៀវភៅ។ នោះហើយជាមូលហេតុដែលការវាយតម្លៃនីមួយៗមានស្លាក «ការទិញដែលបានផ្ទៀងផ្ទាត់»។ អាចវាយតម្លៃបានម្តងក្នុងមួយសៀវភៅ។
          </p>
        ),
      },
      {
        id: "edit-review",
        q: "តើខ្ញុំអាចកែប្រែ ឬលុបការវាយតម្លៃរបស់ខ្ញុំបានទេ?",
        a: (
          <p>
            បាន គ្រប់ពេលវេលា ពីទំព័រសៀវភៅ ឬពី<Link to="/account/reviews">ការវាយតម្លៃរបស់អ្នក</Link>។
          </p>
        ),
      },
      {
        id: "hidden-review",
        q: "ហេតុអ្វីបានជាការវាយតម្លៃរបស់ខ្ញុំត្រូវបានលាក់?",
        a: (
          <p>
            ហាងអាចលាក់ការវាយតម្លៃណាដែលល្មើសនឹងលក្ខខណ្ឌក្នុង<Link to="/terms#reviews">លក្ខខណ្ឌនៃការលក់</Link>របស់យើង។ ការវាយតម្លៃដែលត្រូវបានលាក់នឹងមានសម្គាល់ក្នុងគណនីរបស់អ្នក ហើយមានតែអ្នកទេដែលអាចមើលឃើញ។ ការកែសម្រួលវាមិនធ្វើឱ្យវាបង្ហាញឡើងវិញទេ សូមទាក់ទងមកយើងប្រសិនបើអ្នកគិតថាវាត្រូវបានលាក់ដោយភាន់ច្រឡំ។
          </p>
        ),
      },
    ],
  },
];

/** The questions whose wording (or group) contains every word typed, in their groups; empty groups drop out. */
function filterGroups(list: Array<{ id: string; title: string; items: Faq[] }>, query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return list;
  return list
    .map((group) => ({ ...group, items: group.items.filter((item) => words.every((w) => `${group.title} ${item.q}`.toLowerCase().includes(w))) }))
    .filter((group) => group.items.length > 0);
}

/*
 * /faq: common questions in groups (radix accordion, several open at once); each answer is linkable
 * (/faq#cancel-order opens it). A search field filters the questions as you type; nothing found points to Contact.
 */
export default function FaqPage() {
  const { dict, lang } = useT();
  const isKm = lang === "km";
  const t = dict.infoPages;
  const [query, setQuery] = useState("");
  const shown = filterGroups(isKm ? groupsKm : groups, query);
  const count = shown.reduce((n, g) => n + g.items.length, 0);

  return (
    <ContentPage
      title={isKm ? "សំណួរ និងចម្លើយ" : "Questions & answers"}
      documentTitle={isKm ? "សំណួរញឹកញាប់" : "FAQ"}
      crumb={isKm ? "សំណួរញឹកញាប់" : "FAQ"}
      eyebrow={isKm ? "ជំនួយ" : "Help"}
      lead={
        isKm
          ? "ការទូទាត់ប្រាក់ ការដឹកជញ្ជូន ការប្តូរត្រឡប់ គណនីរបស់អ្នក និងការវាយតម្លៃ៖ ចម្លើយខ្លីៗងាយយល់ ព្រមទាំងតំណភ្ជាប់ទៅព័ត៌មានលម្អិត។"
          : "Paying, delivery, returns, your account and reviews: the short answers, with links to the full details."
      }
      action={
        <Link to="/contact" className={buttonVariants({ variant: "outline" })}>
          {isKm ? "រកមិនឃើញចម្លើយ? ទាក់ទងមកយើង" : "Can't find it? Contact us"}
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

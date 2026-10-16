import { Link } from "react-router-dom";
import { policy } from "@/content/shop";
import { ContentPage } from "@/features/content/ContentPage";
import { useT } from "@/i18n";

/* /returns-policy: the rules the API enforces for returns, and how to ask for one. */
export default function ReturnsPolicyPage() {
  const days = policy.returnWindowDays;
  const { lang } = useT();
  const isKm = lang === "km";

  const title = isKm ? "គោលការណ៍ប្តូរ និងសងត្រឡប់" : "Returns policy";
  const eyebrow = isKm ? "ជំនួយ" : "Help";
  const lead = isKm
    ? `សៀវភៅបោះពុម្ពអាចស្នើសុំប្តូរ ឬសងត្រឡប់បានក្នុងរយៈពេល ${days} ថ្ងៃបន្ទាប់ពីបានប្រគល់ជូន។ អ្នកអាចចាប់ផ្តើមការស្នើសុំដោយផ្ទាល់តាមរយៈគណនីរបស់អ្នក។`
    : `Changed your mind or a book arrived damaged? Printed books can be sent back within ${days} days of delivery. You start the return from your account.`;

  const facts = isKm
    ? [
        { value: `${days} ថ្ងៃ`, label: "គិតចាប់ពីថ្ងៃដែលការបញ្ជាទិញត្រូវបានប្រគល់ជូន" },
        { value: "សៀវភៅបោះពុម្ព", label: "ក្របក្រាស់ និងក្របស្តើង (មិនរាប់បញ្ចូល Ebook ឬ Audiobook)" },
        { value: "តាមអនឡាញ", label: "ស្នើសុំយ៉ាងងាយស្រួលពីទំព័រការបញ្ជាទិញក្នុងគណនីរបស់អ្នក" },
      ]
    : [
        { value: `${days} days`, label: "from the day your order is delivered" },
        { value: "Printed", label: "hardcovers and paperbacks; not ebooks or audiobooks" },
        { value: "Online", label: "request it from the order in your account" },
      ];

  const sections = isKm
    ? [
        {
          id: "window",
          title: "កាលកំណត់នៃការសងត្រឡប់",
          body: (
            <>
              <p>
                អ្នកអាចស្នើសុំប្តូរ ឬសងត្រឡប់សៀវភៅបានក្នុងរយៈពេល <strong>{days} ថ្ងៃ បន្ទាប់ពីការបញ្ជាទិញត្រូវបានប្រគល់ជូន</strong>។ កាលបរិច្ឆេទចុងក្រោយត្រូវបានបង្ហាញលើព័ត៌មានលម្អិតនៃការបញ្ជាទិញក្នុងគណនីរបស់អ្នក នៅក្បែរប៊ូតុង “ស្នើសុំប្តូរទំនិញ”។ បន្ទាប់ពីកាលកំណត់នេះ ប៊ូតុងនឹងត្រូវបិទដោយស្វ័យប្រវត្តិ។
              </p>
              <p>ការបញ្ជាទិញដែលមិនទាន់បានប្រគល់ជូន មិនអាចស្នើសុំប្តូរបានទេ៖ ប្រសិនបើការបញ្ជាទិញនៅស្ថិតក្នុងស្ថានភាព “រង់ចាំ” អ្នកអាចជ្រើសរើសលុបចោលការបញ្ជាទិញបាន។</p>
            </>
          ),
        },
        {
          id: "what",
          title: "លក្ខខណ្ឌសៀវភៅដែលអាចសងត្រឡប់",
          body: (
            <ul>
              <li>សៀវភៅក្របក្រាស់ និងក្របស្តើងដែលបានទិញ និងប្រគល់ជូនរួចរាល់។</li>
              <li>សៀវភៅអេឡិចត្រូនិច (Ebooks) និងសៀវភៅសំឡេង (Audiobooks) មិនអាចសងត្រឡប់បានទេ។</li>
              <li>
                ការបញ្ជាទិញមួយអាចធ្វើការស្នើសុំប្តូរទំនិញម្តងមួយបាន។ ប្រសិនបើបានស្នើសុំរួចហើយ សូមរង់ចាំការឆ្លើយតប ឬដកសំណើវិញ មុននឹងស្នើសុំសម្រាប់សៀវភៅផ្សេងទៀត។
              </li>
              <li>សូមរក្សាសៀវភៅក្នុងសភាពដើម និងក្នុងកញ្ចប់វេចខ្ចប់ដើមរហូតដល់សំណើត្រូវបានឆ្លើយតប។</li>
            </ul>
          ),
        },
        {
          id: "how",
          title: "របៀបស្នើសុំប្តូរទំនិញ",
          body: (
            <>
              <ol className="mt-4 grid list-decimal gap-2 pl-5 marker:font-semibold marker:text-primary">
                <li className="pl-1">
                  ចូលទៅកាន់ទំព័រ <Link to="/account/orders?status=delivered">ការបញ្ជាទិញដែលបានប្រគល់ជូន</Link> ក្នុងគណនីរបស់អ្នក។
                </li>
                <li className="pl-1">ចុចលើពាក្យ “ស្នើសុំប្តូរទំនិញ” (Request a return)។</li>
                <li className="pl-1">ជ្រើសរើសសៀវភៅ និងចំនួនដែលចង់សងត្រឡប់ ព្រមទាំងភ្ជាប់កំណត់សម្គាល់ប្រសិនបើមានការខូចខាត។</li>
                <li className="pl-1">បញ្ជាក់មូលហេតុនៃការសងត្រឡប់ ហើយចុចបញ្ជូនសំណើ។</li>
              </ol>
              <p>អ្នកអាចពិនិត្យតាមដានសំណើរបស់អ្នកភ្លាមៗនៅក្នុងទំព័រ <Link to="/account/returns">ការសងត្រឡប់របស់អ្នក</Link> ជាមួយនឹងការប៉ាន់ស្មានទឹកប្រាក់ដែលត្រូវទទួលបានមកវិញ។</p>
            </>
          ),
        },
        {
          id: "next",
          title: "ដំណាក់កាលបន្ទាប់ពីការស្នើសុំ",
          body: (
            <ul>
              <li>
                <strong>បានស្នើសុំ (Requested):</strong> ហាងកំពុងពិនិត្យសំណើរបស់អ្នក។ អ្នកនៅតែអាចដកសំណើវិញបាន។
              </li>
              <li>
                <strong>បានអនុម័ត (Approved):</strong> សំណើត្រូវបានទទួលយក។ ការសងប្រាក់វិញនឹងធ្វើឡើងបន្ទាប់ពីហាងបានទទួល និងពិនិត្យសៀវភៅរួចរាល់។
              </li>
              <li>
                <strong>មិនទទួលយក (Not accepted):</strong> ហាងនឹងបញ្ជាក់មូលហេតុច្បាស់លាស់នៅក្នុងកំណត់សម្គាល់នៃសំណើ។
              </li>
              <li>
                <strong>បានសងប្រាក់វិញ (Refunded):</strong> ទឹកប្រាក់ត្រូវបានទូទាត់សងត្រឡប់ជូនអ្នករួចរាល់។
              </li>
            </ul>
          ),
        },
        {
          id: "refunds",
          title: "ចំនួនទឹកប្រាក់ដែលទទួលបានមកវិញ",
          body: (
            <>
              <p>
                អ្នកនឹងទទួលបានប្រាក់វិញតាមចំនួនពិតប្រាកដដែលអ្នកបានចំណាយលើសៀវភៅដែលបានសងត្រឡប់។ ប្រសិនបើការបញ្ជាទិញរបស់អ្នកបានប្រើប្រាស់ប័ណ្ណបញ្ចុះតម្លៃ (Coupon) ចំនួនបញ្ចុះតម្លៃនឹងត្រូវដកចេញតាមសមាមាត្រនៃសៀវភៅនីមួយៗ ដូច្នេះអ្នកមិនអាចទទួលបានលើសពីចំនួនដែលបានបង់ឡើយ។ សេវាដឹកជញ្ជូនមិនត្រូវបានសងត្រឡប់ទេ។
              </p>
              <p>ឧទាហរណ៍៖ សៀវភៅពីរតម្លៃ $20.00 និង $10.00 ដោយប្រើប័ណ្ណបញ្ចុះតម្លៃ 10% (បញ្ចុះ $3.00)។ ប្រសិនបើសងត្រឡប់សៀវភៅ $20.00 ចំនួនបញ្ចុះតម្លៃដែលត្រូវដកចេញគឺ $2.00 ដូច្នេះអ្នកទទួលបានប្រាក់សងវិញចំនួន $18.00។</p>
            </>
          ),
        },
        {
          id: "help",
          title: "សៀវភៅខុស ឬមានការខូចខាត",
          body: (
            <p>
              ប្រសិនបើកញ្ចប់សៀវភៅដែលអ្នកបានទទួលមានកំហុស ឬខូចខាត សូមថតរូបភាព និងភ្ជាប់មកជាមួយពេលធ្វើការស្នើសុំតាមអនឡាញ ឬទាក់ទងមកយើងខ្ញុំតាមរយៈ <Link to="/contact">ទំព័រទំនាក់ទំនង</Link> ឬ Telegram។ ក្រុមការងារយើងនឹងជួយសម្របសម្រួលយ៉ាងឆាប់រហ័ស។
            </p>
          ),
        },
      ]
    : [
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
              If a book arrived damaged or wasn't what you ordered, let us know in the note when you request the return. We'll replace it or refund it in full.
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

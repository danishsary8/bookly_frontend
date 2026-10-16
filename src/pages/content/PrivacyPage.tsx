import { Link } from "react-router-dom";
import { contact, policy, shop } from "@/content/shop";
import { ContentPage } from "@/features/content/ContentPage";
import { LegalNotice } from "@/features/content/LegalNotice";
import { useT } from "@/i18n";

/*
 * /privacy: what the app actually stores and why, in plain language (checked against the
 * API and this frontend on 2026-10-02, approved by the owner 2026-10-06).
 */
export default function PrivacyPage() {
  const { lang } = useT();
  const isKm = lang === "km";

  const title = isKm ? "គោលការណ៍ភាពឯកជន" : "Privacy";
  const documentTitle = isKm ? "ភាពឯកជន" : "Privacy policy";
  const eyebrow = isKm ? "ច្បាប់" : "Legal";
  const lead = isKm
    ? `ព័ត៌មានដែល ${shop.name} រក្សាទុកអំពីអ្នក ហេតុផល អ្នកណាអាចមើលឃើញ និងអ្វីដែលអ្នកអាចគ្រប់គ្រងដោយខ្លួនឯងបាន។`
    : `What ${shop.name} keeps about you, why, who sees it, and what you can change yourself.`;

  const sections = isKm
    ? [
        {
          id: "what",
          title: "ព័ត៌មានដែលយើងរក្សាទុក",
          body: (
            <ul>
              <li>
                <strong>គណនីរបស់អ្នក:</strong> ឈ្មោះ អាសយដ្ឋានអ៊ីមែល លេខទូរស័ព្ទ (ប្រសិនបើអ្នកបានបន្ថែម) និងពាក្យសម្ងាត់របស់អ្នក (ត្រូវបានរក្សាទុកជាកូដសម្ងាត់ hashing មិនអាចអានបានឡើយ)។
              </li>
              <li>
                <strong>ប្រសិនបើអ្នកចូលតាមរយៈ Google, Facebook ឬ Telegram:</strong> ឈ្មោះ និងអ៊ីមែលដែលពួកគេចែករំលែក ឬលេខសម្គាល់គណនី Telegram (Chat ID សម្រាប់ការជូនដំណឹងការបញ្ជាទិញ)។ យើងមិនដែលដឹងពាក្យសម្ងាត់ បញ្ជីទំនាក់ទំនង ឬការបង្ហោះរបស់អ្នកនៅលើបណ្តាញសង្គមទាំងនោះឡើយ។
              </li>
              <li>
                <strong>អាសយដ្ឋានដឹកជញ្ជូន:</strong> ឈ្មោះអ្នកទទួល លេខទូរស័ព្ទ និងអាសយដ្ឋានសម្រាប់រាល់អាសយដ្ឋានដែលអ្នកបានរក្សាទុក។
              </li>
              <li>
                <strong>ការបញ្ជាទិញ និងការប្តូរទំនិញ:</strong> មុខទំនិញដែលបានទិញ តម្លៃ អាសយដ្ឋានដឹកជញ្ជូនដែលបានប្រើប្រាស់ និងប្រវត្តិស្ថានភាពនៃការបញ្ជាទិញ។
              </li>
              <li>
                <strong>កន្ត្រកទំនិញ បញ្ជីសៀវភៅចង់បាន និងការវាយតម្លៃរបស់អ្នក។</strong>
              </li>
            </ul>
          ),
        },
        {
          id: "why",
          title: "ហេតុផលដែលយើងរក្សាទុកព័ត៌មាន",
          body: (
            <ul>
              <li>ដើម្បីទទួល រៀបចំ ដឹកជញ្ជូន និងតាមដានការបញ្ជាទិញ ការប្តូរទំនិញ និងការសងប្រាក់វិញ។</li>
              <li>ដើម្បីផ្ញើលេខកូដផ្ទៀងផ្ទាត់ពេលចុះឈ្មោះ និងពេលកំណត់ពាក្យសម្ងាត់ឡើងវិញ។</li>
              <li>ដើម្បីផ្ញើការជូនដំណឹងអំពីស្ថានភាពការបញ្ជាទិញតាម Telegram ប្រសិនបើអ្នកបានបើកដំណើរការ។</li>
              <li>ដើម្បីបង្ហាញការវាយតម្លៃរបស់អ្នកលើសៀវភៅដែលអ្នកបានទិញ។</li>
              <li>ដើម្បីការពារសុវត្ថិភាពគណនី ដូចជាការកំណត់ចំនួនដងនៃការបញ្ចូលពាក្យសម្ងាត់ ឬកូដខុស។</li>
            </ul>
          ),
        },
        {
          id: "who",
          title: "អ្នកដែលអាចមើលឃើញព័ត៌មាន",
          body: (
            <>
              <ul>
                <li>
                  <strong>បុគ្គលិករបស់យើង:</strong> ដើម្បីរៀបចំការបញ្ជាទិញ ឆ្លើយតបសំណើប្តូរទំនិញ និងសម្របសម្រួលការវាយតម្លៃ។ រាល់សកម្មភាពរបស់បុគ្គលិកត្រូវបានកត់ត្រាក្នុង Audit log។
                </li>
                <li>
                  <strong>អ្នកដឹកជញ្ជូន:</strong> ឃើញតែឈ្មោះអ្នកទទួល លេខទូរស័ព្ទ និងអាសយដ្ឋានសម្រាប់ដឹកជញ្ជូនប៉ុណ្ណោះ។
                </li>
                <li>
                  <strong>អ្នកទស្សនាទូទៅ:</strong> ឃើញការវាយតម្លៃរបស់អ្នកជាមួយនឹងឈ្មោះកាត់ (ឧទាហរណ៍ “Dara K.”) ដោយមិនបង្ហាញអ៊ីមែល ឬឈ្មោះពេញរបស់អ្នកឡើយ។
                </li>
                <li>
                  <strong>ក្រុមហ៊ុនផ្តល់សេវាបច្ចេកវិទ្យា:</strong> ក្រុមហ៊ុន Hosting រក្សាទុកទិន្នន័យសម្រាប់យើងដោយសុវត្ថិភាព និងមិនអាចយកទៅប្រើប្រាស់ក្នុងគោលបំណងផ្សេងបានឡើយ។
                </li>
                <li>
                  <strong>Cloudflare:</strong> ត្រួតពិនិត្យសុវត្ថិភាពទប់ស្កាត់ Bot ដោយមិនអាចអានខ្លឹមសារដែលអ្នកបានវាយបញ្ចូលឡើយ។
                </li>
              </ul>
              <p>យើងមិនដែលលក់ទិន្នន័យរបស់អ្នក ឬចែករំលែកទៅកាន់ក្រុមហ៊ុនផ្សាយពាណិជ្ជកម្មឡើយ។</p>
            </>
          ),
        },
        {
          id: "browser",
          title: "ទិន្នន័យដែលរក្សាទុកក្នុងកម្មវិធីរុករក (Browser)",
          body: (
            <>
              <p>Bookly មិនប្រើប្រាស់កម្មវិធីតាមដានពាណិជ្ជកម្មឡើយ។ យើងរក្សាទុកតែទិន្នន័យចាំបាច់មួយចំនួនលើឧបករណ៍របស់អ្នក ដើម្បីឱ្យគេហទំព័រដំណើរការល្អ៖</p>
              <ul>
                <li>ស្ថានភាពចូលគណនីរបស់អ្នក (ការចាកចេញនឹងលុបទិន្នន័យនេះ)</li>
                <li>ជម្រើសរូបិយប័ណ្ណ (ដុល្លារ/រៀល) និងផ្ទៃពណ៌ (ភ្លឺ/ងងឹត)</li>
                <li>សៀវភៅដែលអ្នកបានមើលថ្មីៗ (បង្ហាញតែនៅលើឧបករណ៍របស់អ្នកប៉ុណ្ណោះ)</li>
              </ul>
            </>
          ),
        },
        {
          id: "control",
          title: "អ្វីដែលអ្នកអាចកែប្រែដោយខ្លួនឯង",
          body: (
            <p>
              នៅក្នុង <Link to="/account">គណនីរបស់អ្នក</Link> អ្នកអាចផ្លាស់ប្តូរឈ្មោះ លេខទូរស័ព្ទ ពាក្យសម្ងាត់ និងអាសយដ្ឋាន ព្រមទាំងគ្រប់គ្រងការជូនដំណឹងតាម Telegram ឬលុបការវាយតម្លៃរបស់អ្នកបានគ្រប់ពេល។
            </p>
          ),
        },
        {
          id: "delete",
          title: "ការលុបគណនី និងទិន្នន័យ (៣០ ថ្ងៃ)",
          body: (
            <>
              <p>អ្នកអាចលុបគណនីរបស់អ្នក និងទិន្នន័យដែលពាក់ព័ន្ធបានគ្រប់ពេល៖</p>
              <ol>
                <li>
                  ចូលគណនី ហើយបើក <Link to="/account/security">គណនី → សុវត្ថិភាព</Link> រួចជ្រើសរើស <strong>លុបគណនីរបស់ខ្ញុំ</strong>។ បញ្ជាក់ពាក្យសម្ងាត់របស់អ្នក ឬផ្ទៀងផ្ទាត់ជាមួយ Google/Facebook។ ការបញ្ជាទិញដែលកំពុងដឹកជញ្ជូនត្រូវតែបញ្ចប់ជាមុនសិន។
                </li>
                <li>
                  អ្នកនឹងត្រូវបានចាកចេញពីគ្រប់ឧបករណ៍ទាំងអស់ ហើយការវាយតម្លៃ បញ្ជីសៀវភៅចង់បាន និងកន្ត្រកទំនិញនឹងត្រូវដកចេញភ្លាមៗ។ ឈ្មោះ អ៊ីមែល លេខទូរស័ព្ទ និងអាសយដ្ឋានរបស់អ្នកនឹងត្រូវបានលុបចោលជាអចិន្ត្រៃយ៍បន្ទាប់ពីរយៈពេល {policy.accountEraseDays} ថ្ងៃ។
                </li>
                <li>កំណត់ត្រាការបញ្ជាទិញដែលច្បាប់តម្រូវឱ្យរក្សាទុក នឹងនៅតែរក្សាទុកដោយគ្មានព័ត៌មានផ្ទាល់ខ្លួនរបស់អ្នកភ្ជាប់ជាមួយឡើយ។</li>
              </ol>
            </>
          ),
        },
        {
          id: "contact",
          title: "សំណួរផ្សេងៗ",
          body: (
            <p>
              ប្រសិនបើអ្នកមានសំណួរអំពីទិន្នន័យផ្ទាល់ខ្លួន សូមទាក់ទងមកយើងខ្ញុំតាមរយៈ <Link to="/contact">ទំព័រទំនាក់ទំនង</Link> ឬ Telegram ({contact.telegram})។
            </p>
          ),
        },
      ]
    : [
        {
          id: "what",
          title: "What we keep",
          body: (
            <ul>
              <li>
                <strong>Your account:</strong> your name, email address, phone number if you add one, and your password (stored only as a one-way hash,
                never readable).
              </li>
              <li>
                <strong>If you sign in with Google or Facebook:</strong> the name and email address they share with us and an account number that links
                them to your Bookly account. Never your password there, your contacts or your posts.
              </li>
              <li>
                <strong>If you connect Telegram:</strong> your Telegram chat ID and delivery notification preferences, so we can dispatch real-time shipping updates.
              </li>
              <li>
                <strong>Delivery addresses:</strong> the recipient's name, phone number and address for each address you save.
              </li>
              <li>
                <strong>Orders and returns:</strong> what you ordered, the prices and totals, the delivery address used, each change of status, and any
                reason you give when you cancel or return something.
              </li>
              <li>
                <strong>Your cart, wishlist and reviews.</strong>
              </li>
            </ul>
          ),
        },
        {
          id: "why",
          title: "Why we keep it",
          body: (
            <ul>
              <li>To take, deliver and follow up your orders, returns and refunds.</li>
              <li>To email you sign-up and password-reset codes. We don't send marketing email unless you subscribe to our newsletter.</li>
              <li>To dispatch real-time Telegram delivery notifications if you have connected your bot.</li>
              <li>To show your reviews on books you've bought.</li>
              <li>To keep accounts safe, for example by limiting repeated wrong codes and passwords.</li>
            </ul>
          ),
        },
        {
          id: "who",
          title: "Who sees it",
          body: (
            <>
              <ul>
                <li>
                  <strong>Our staff,</strong> to prepare orders, answer returns and look after reviews. Changes staff make are logged in an audit trail.
                </li>
                <li>
                  <strong>The courier</strong> delivering your order sees the recipient's name, phone number and address.
                </li>
                <li>
                  <strong>Other visitors</strong> see your reviews with a short form of your name (for example "Dara K."), never your email or full name.
                </li>
                <li>
                  <strong>The companies that host Bookly</strong> store the data for us and can't use it for anything else.
                </li>
                <li>
                  <strong>Cloudflare</strong> checks the sign-in, sign-up and password forms for bots. For that check it sees your IP address and
                  browser details, not what you type.
                </li>
              </ul>
              <p>We don't sell your data or share it with advertisers.</p>
            </>
          ),
        },
        {
          id: "browser",
          title: "What's stored in your browser",
          body: (
            <>
              <p>Bookly doesn't use advertising or analytics trackers. It keeps a few things on your device so the site works:</p>
              <ul>
                <li>Your sign-in, so you stay signed in. Signing out removes it.</li>
                <li>Your choice of currency and light or dark theme.</li>
                <li>The books you've looked at recently, shown back to you on this device only.</li>
                <li>While a tab is open: a coupon you've applied, and your email during a password reset.</li>
              </ul>
            </>
          ),
        },
        {
          id: "errors",
          title: "Error reports",
          body: (
            <p>
              When something breaks on our servers, an error report is sent to our error-monitoring service so we can fix it. It includes your account
              number if you were signed in, but not your name, email, address, IP address or anything you typed.
            </p>
          ),
        },
        {
          id: "control",
          title: "What you can change",
          body: (
            <>
              <p>
                In <Link to="/account">your account</Link> you can change your name, phone, password, Telegram updates, and addresses, and edit or delete your reviews.
              </p>
              <p>
                You can close your account yourself in <Link to="/account/security">Account → Sign-in &amp; security</Link>. To change your email address or get
                a copy of your data, <Link to="/contact">contact us</Link> from the email on your account. We keep order records the law requires us to keep.
              </p>
            </>
          ),
        },
        {
          id: "delete",
          title: "Deleting your account and data",
          body: (
            <>
              <p>You can delete your account and the data that goes with it at any time, including if you signed in with Google or Facebook:</p>
              <ol>
                <li>
                  Sign in and open <Link to="/account/security">Account → Sign-in &amp; security</Link>, then <strong>Delete my account</strong>. Confirm with your
                  password, or with Google or Facebook if you signed up with them. Orders on their way and open returns need to finish first.
                </li>
                <li>
                  You're signed out everywhere and your reviews, wishlist and cart are removed at once. Your name, email, phone number and addresses are erased
                  {policy.accountEraseDays} days later.
                </li>
                <li>Order records the law requires us to keep stay, without your personal details attached.</li>
              </ol>
              <p>
                Can't sign in? Message us on Telegram ({contact.telegram}) or email <a href={`mailto:${contact.email}`}>{contact.email}</a> and we'll do it for you
                once we've confirmed it's you.
              </p>
            </>
          ),
        },
        {
          id: "contact",
          title: "Questions",
          body: (
            <p>
              Ask us anything about your data through the <Link to="/contact">contact page</Link>. If this policy changes, we'll update the date at the top.
            </p>
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

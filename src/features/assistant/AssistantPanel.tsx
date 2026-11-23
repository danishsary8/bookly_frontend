import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Bot, CreditCard, HelpCircle, Package, RotateCcw, Send, Sparkles, Tag, Truck, UserCheck } from "lucide-react";
import { assistantApi, type AssistantAnswer } from "@/api/endpoints/assistant";
import { BookCard } from "@/components/catalog/BookCard";
import { Button } from "@/components/ui/button";
import { supportField } from "@/features/support/ConversationView";
import { rewriteAdminPath, usePortal } from "@/features/admin/portal";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

type AssistantReply = (AssistantAnswer | { intent: string; text: string; link: string | null }) & {
  followUps?: string[];
};
type Turn = { id: number; asked: string; answer: AssistantReply };

type LocalRule = {
  intent: string;
  pattern: RegExp;
  en: string;
  km: string;
  link: string | null;
  followUpsEn: string[];
  followUpsKm: string[];
};

const LOCAL_TRAINING_RULES: LocalRule[] = [
  {
    intent: "khqr_payment",
    pattern: /\b(khqr|bakong|aba|acleda|wing|bank app|qr code|pay online)\b|បាគង|ស្កេន/i,
    en: "You can pay instantly with Bakong KHQR using ABA, ACLEDA, Wing, or any Cambodian bank app (in USD $ or Riel ៛). Just scan the QR code or save it to your phone gallery at checkout — the page confirms payment automatically within seconds!",
    km: "អ្នកអាចទូទាត់ភ្លាមៗតាម Bakong KHQR ដោយប្រើកម្មវិធីធនាគារ ABA, ACLEDA, Wing ឬធនាគារណាមួយនៅកម្ពុជា (ជាដុល្លារ $ ឬរៀល ៛)។ គ្រាន់តែស្កេន ឬរក្សាទុកកូដ QR ទៅក្នុងទូរស័ព្ទពេលទូទាត់ ទំព័រនឹងបញ្ជាក់ការបង់ប្រាក់ដោយស្វ័យប្រវត្តិ!",
    link: "/checkout",
    followUpsEn: ["Cash on delivery", "Offers & discounts", "Delivery fees"],
    followUpsKm: ["បង់ប្រាក់ពេលទទួលទំនិញ", "ប្រូម៉ូសិន និងការបញ្ចុះតម្លៃ", "ថ្លៃដឹកជញ្ជូន"],
  },
  {
    intent: "cod_payment",
    pattern: /\b(cod|cash on delivery|pay on arrival|pay courier|cash)\b|សាច់ប្រាក់|បង់ប្រាក់ពេលទទួល/i,
    en: "Cash on Delivery (COD) is available across Phnom Penh and all 25 provinces! You pay the courier in US dollars ($) or Cambodian Riel (៛) when your books arrive at your door.",
    km: "សេវាបង់ប្រាក់ពេលទទួលទំនិញ (COD) មាននៅភ្នំពេញ និងគ្រប់ 25 ខេត្តក្រុង! អ្នកអាចបង់ជាប្រាក់ដុល្លារ ($) ឬប្រាក់រៀល (៛) ជូនអ្នកដឹកជញ្ជូននៅពេលសៀវភៅដឹកដល់ដៃអ្នក។",
    link: "/shipping",
    followUpsEn: ["Pay with Bakong KHQR", "Delivery fees", "Return policy"],
    followUpsKm: ["បង់ប្រាក់តាម Bakong KHQR", "ថ្លៃដឹកជញ្ជូន", "គោលការណ៍ប្តូរត្រឡប់"],
  },
  {
    intent: "offers",
    pattern: /\b(offer|offers|discount|discounts|promotion|promotions|deal|deals|sale|bundle|free gift)\b|ប្រូម៉ូសិន|បញ្ចុះតម្លៃ|កាដូ/i,
    en: "Bookly runs automatic multi-buy percentage discounts, fixed dollar-off deals, single-book markdowns, and free gift-with-purchase offers! The best discount applies automatically in your cart.",
    km: "យើងមានប្រូម៉ូសិនបញ្ចុះតម្លៃជាភាគរយ ជាទឹកប្រាក់ដុល្លារ ការបញ្ចុះតម្លៃសៀវភៅទោល និងកាដូឥតគិតថ្លៃ! ការបញ្ចុះតម្លៃល្អបំផុតនឹងត្រូវបានគណនាដោយស្វ័យប្រវត្តិនៅក្នុងកន្ត្រករបស់អ្នក។",
    link: "/offers",
    followUpsEn: ["How do coupons work?", "Best sellers", "Free delivery threshold"],
    followUpsKm: ["តើគូប៉ុងប្រើដោយរបៀបណា?", "សៀវភៅលក់ដាច់បំផុត", "ដឹកជញ្ជូនឥតគិតថ្លៃ"],
  },
  {
    intent: "coupons",
    pattern: /\b(coupon|coupons|promo code|voucher|reward|thanks|welcome10)\b|គូប៉ុង|ប័ណ្ណបញ្ចុះតម្លៃ/i,
    en: "Enter your coupon code on the Cart page before checkout. Plus, qualifying orders of 2+ books automatically earn a THANKS reward coupon (10% off your next order) once paid or delivered!",
    km: "អ្នកអាចបញ្ចូលលេខកូដគូប៉ុងនៅក្នុងទំព័រកន្ត្រក មុនពេលបញ្ជាទិញ។ លើសពីនេះ ការបញ្ជាទិញចាប់ពី 2 ក្បាលឡើងទៅ នឹងទទួលបានគូប៉ុងរង្វាន់ THANKS (បញ្ចុះ 10% សម្រាប់ការបញ្ជាទិញបន្ទាប់) ពេលបានបង់ប្រាក់ ឬដឹកដល់!",
    link: "/account/coupons",
    followUpsEn: ["Offers & discounts", "Store credit", "Where is my order?"],
    followUpsKm: ["ប្រូម៉ូសិន និងការបញ្ចុះតម្លៃ", "ឥណទានហាង", "ការបញ្ជាទិញរបស់ខ្ញុំនៅឯណា?"],
  },
  {
    intent: "ebook_preview",
    pattern: /\b(free preview|sample|look inside|read sample|preview ebook|ebook device|3 devices|device limit)\b|អានសាកល្បង|គំរូ|ឧបករណ៍អាន/i,
    en: "Every ebook on Bookly includes a Free Preview you can read immediately in your browser without signing in! Once purchased, you can read the full ebook in Light, Sepia, or Dark mode on up to 3 registered devices.",
    km: "សៀវភៅអេឡិចត្រូនិកនីមួយៗមានផ្នែក «អានសាកល្បងឥតគិតថ្លៃ» ដែលអ្នកអាចអានភ្លាមៗក្នុងកម្មវិធីរុករកដោយមិនបាច់ចូលគណនី! ពេលទិញរួច អ្នកអាចអានពេញលេញលើឧបករណ៍រហូតដល់ 3 ជាមួយទម្រង់ពន្លឺ ងងឹត ឬពណ៌សេភា។",
    link: "/books?has_ebook=1",
    followUpsEn: ["Ebooks under $5", "How do I read an ebook?", "Best sellers"],
    followUpsKm: ["សៀវភៅអេឡិចត្រូនិកក្រោម $5", "តើខ្ញុំអានសៀវភៅអេឡិចត្រូនិកដោយរបៀបណា?", "សៀវភៅលក់ដាច់បំផុត"],
  },
  {
    intent: "ebook_deals",
    pattern: /\b(cheap ebook|ebooks under|ebook deal|digital books)\b|សៀវភៅអេឡិចត្រូនិកតម្លៃក្រោម/i,
    en: "Looking for affordable digital reading? Browse our Ebooks Under $5 shelf for instant browser reading with zero delivery fees.",
    km: "កំពុងស្វែងរកសៀវភៅអេឡិចត្រូនិកតម្លៃសមរម្យមែនទេ? មើលធ្នើសៀវភៅអេឡិចត្រូនិកតម្លៃក្រោម $5 ដើម្បីអានភ្លាមៗដោយឥតគិតថ្លៃដឹកជញ្ជូន។",
    link: "/books?has_ebook=1&format=ebook&max_price=4.99&sort=price_asc",
    followUpsEn: ["How do I read an ebook?", "Free preview sample", "Best sellers"],
    followUpsKm: ["តើខ្ញុំអានសៀវភៅអេឡិចត្រូនិកដោយរបៀបណា?", "អានសាកល្បងឥតគិតថ្លៃ", "សៀវភៅលក់ដាច់បំផុត"],
  },
  {
    intent: "preorder",
    pattern: /\b(preorder|pre-order|pre order|backorder|back-order|back order|out of stock|coming soon|restock|notify me)\b|កុម្ម៉ង់ទុកមុន|រង់ចាំស្តុក|អស់ពីស្តុក|នឹងមកដល់ឆាប់ៗ/i,
    en: "Pre-orders reserve upcoming releases and ship on their release date. Back-orders let you order temporarily out-of-stock books (shipping in ~2–3 weeks). If a book is sold out, tap 'Tell me when it's back' on its page for an instant restock email!",
    km: "ការកុម្ម៉ង់ទុកមុន (Pre-order) នឹងដឹកជញ្ជូននៅថ្ងៃចេញផ្សាយ រីឯការកុម្ម៉ង់រង់ចាំស្តុក (Back-order) ដឹកជញ្ជូនក្នុង ~2–3 សប្តាហ៍។ ប្រសិនបើសៀវភៅអស់ពីស្តុក សូមចុច «ប្រាប់ខ្ញុំពេលមានស្តុកវិញ» លើទំព័រសៀវភៅដើម្បីទទួលអ៊ីមែលជូនដំណឹង!",
    link: "/books?coming_soon=1&sort=release_soon",
    followUpsEn: ["Can I cancel an order?", "Delivery fees", "Best sellers"],
    followUpsKm: ["តើខ្ញុំអាចបោះបង់ការបញ្ជាទិញបានទេ?", "ថ្លៃដឹកជញ្ជូន", "សៀវភៅលក់ដាច់បំផុត"],
  },
  {
    intent: "cancel_order",
    pattern: /\b(cancel|cancellation|change order|mistake order)\b|បោះបង់ការបញ្ជាទិញ|លុបការបញ្ជាទិញ/i,
    en: "You can cancel any pending order (or any waiting pre-order/back-order before it ships) directly from Account → Orders → Cancel order. Any reserved stock or store credit is restored automatically.",
    km: "អ្នកអាចបោះបង់ការបញ្ជាទិញដែលកំពុងរង់ចាំ (ឬការកុម្ម៉ង់ទុកមុនមុនពេលដឹកចេញ) ដោយផ្ទាល់នៅក្នុង គណនី → ការបញ្ជាទិញ → បោះបង់ការបញ្ជាទិញ។ ស្តុក និងឥណទានហាងនឹងត្រូវបានប្រគល់ជូនវិញដោយស្វ័យប្រវត្តិ។",
    link: "/account/orders",
    followUpsEn: ["Where is my order?", "Return policy", "Talk to a person"],
    followUpsKm: ["ការបញ្ជាទិញរបស់ខ្ញុំនៅឯណា?", "គោលការណ៍ប្តូរត្រឡប់", "និយាយជាមួយបុគ្គលិក"],
  },
  {
    intent: "best_sellers",
    pattern: /\b(best seller|bestseller|best sellers|popular|top rated|recommend|suggestion|good book|what should i read)\b|លក់ដាច់|ពេញនិយម|ណែនាំ/i,
    en: "Here is a quick link to our most popular and highest-rated books across Fiction, Business, Self-Help, Manga, English Learning, and Khmer Literature!",
    km: "នេះជាតំណភ្ជាប់ទៅកាន់សៀវភៅលក់ដាច់បំផុត និងទទួលបានការវាយតម្លៃខ្ពស់បំផុត រួមមានប្រលោមលោក ធុរកិច្ច អភិវឌ្ឍន៍ខ្លួន តុក្កតា ភាសាអង់គ្លេស និងអក្សរសិល្ប៍ខ្មែរ!",
    link: "/books?sort=best_selling",
    followUpsEn: ["New arrivals", "Khmer books", "Offers & discounts"],
    followUpsKm: ["សៀវភៅមកដល់ថ្មី", "សៀវភៅភាសាខ្មែរ", "ប្រូម៉ូសិន និងការបញ្ចុះតម្លៃ"],
  },
  {
    intent: "new_arrivals",
    pattern: /\b(new arrival|new arrivals|newest|latest books|just in|recent books)\b|សៀវភៅថ្មី|មកដល់ថ្មី/i,
    en: "Fresh off the press! Browse our latest arrivals and newly added editions in the Bookly catalogue.",
    km: "ទើបមកដល់ថ្មីៗ! ស្វែងរកសៀវភៅចេញថ្មី និងការបោះពុម្ពថ្មីៗបំផុតនៅក្នុងបណ្ណាល័យ Bookly។",
    link: "/books?sort=newest",
    followUpsEn: ["Best sellers", "Offers & discounts", "Ebooks under $5"],
    followUpsKm: ["សៀវភៅលក់ដាច់បំផុត", "ប្រូម៉ូសិន និងការបញ្ចុះតម្លៃ", "សៀវភៅអេឡិចត្រូនិកក្រោម $5"],
  },
  {
    intent: "khmer_education",
    pattern: /\b(khmer book|khmer books|school|grade|english learning|ielts|toefl|manga|comics|kids)\b|សៀវភៅខ្មែរ|សាលា|ថ្នាក់ទី|រៀនភាសាអង់គ្លេស|តុក្កតា/i,
    en: "We stock Khmer literature, Grade 7–12 school & exam prep books, English learning (A1–C2, IELTS/TOEFL), Manga & Comics, and Kids books! You can filter by Reader Age, School Grade, or English Level on the Books page.",
    km: "យើងមានសៀវភៅអក្សរសិល្ប៍ខ្មែរ សៀវភៅសិក្សាថ្នាក់ទី 7–12 សៀវភៅរៀនភាសាអង់គ្លេស (A1–C2, IELTS/TOEFL) តុក្កតា Manga និងសៀវភៅកុមារ! អ្នកអាចច្រោះតាមអាយុ ថ្នាក់សិក្សា ឬកម្រិតភាសានៅលើទំព័រសៀវភៅ។",
    link: "/books",
    followUpsEn: ["Best sellers", "Complete a series set", "Offers & discounts"],
    followUpsKm: ["សៀវភៅលក់ដាច់បំផុត", "ទិញបង្គ្រប់ឈុតសៀវភៅ", "ប្រូម៉ូសិន និងការបញ្ចុះតម្លៃ"],
  },
  {
    intent: "series_volumes",
    pattern: /\b(series|volume|volumes|complete the set|full set|reading order)\b|ឈុតសៀវភៅ|បង្គ្រប់ឈុត|ភាគ/i,
    en: "Reading a multi-volume series or manga? Open any Series page to see every volume in reading order, track which volumes you already own, and use 'Complete the set' to add all missing volumes in one click!",
    km: "កំពុងអានសៀវភៅជាឈុត ឬតុក្កតាភាគមែនទេ? បើកទំព័រឈុតសៀវភៅ ដើម្បីមើលលំដាប់ភាគទាំងអស់ និងប្រើប៊ូតុង «ទិញបង្គ្រប់ឈុត» ដើម្បីដាក់គ្រប់ភាគដែលអ្នកមិនទាន់មានចូលកន្ត្រកតែម្តង!",
    link: "/series",
    followUpsEn: ["Best sellers", "Offers & discounts", "Delivery fees"],
    followUpsKm: ["សៀវភៅលក់ដាច់បំផុត", "ប្រូម៉ូសិន និងការបញ្ចុះតម្លៃ", "ថ្លៃដឹកជញ្ជូន"],
  },
  {
    intent: "wishlist_lists",
    pattern: /\b(wishlist|reading list|list|favorite|favourite|price drop|save book)\b|បញ្ជីប្រាថ្នា|បញ្ជីអាន|តម្លៃចុះ/i,
    en: "Tap the heart icon on any book to save it to your Wishlist (with statuses: Want to read, Currently reading, Finished) or organize books into shareable Reading Lists! Turn on Price-drop emails in Account → Profile to get notified when saved books drop 5%+ in price.",
    km: "ចុចរូបបេះដូងលើសៀវភៅណាមួយ ដើម្បីរក្សាទុកក្នុងបញ្ជីប្រាថ្នា ឬបង្កើតបញ្ជីអានផ្ទាល់ខ្លួនដែលអាចចែករំលែកបាន! បើកការជូនដំណឹងពេលតម្លៃចុះក្នុង គណនី → ប្រវត្តិរូប ដើម្បីទទួលអ៊ីមែលពេលសៀវភៅបញ្ចុះតម្លៃចាប់ពី 5% ឡើងទៅ។",
    link: "/account/wishlist",
    followUpsEn: ["Reading lists", "Offers & discounts", "Best sellers"],
    followUpsKm: ["បញ្ជីអាន", "ប្រូម៉ូសិន និងការបញ្ចុះតម្លៃ", "សៀវភៅលក់ដាច់បំផុត"],
  },
  {
    intent: "telegram_updates",
    pattern: /\b(telegram|phone login|phone code|notification|bot|tracking alert)\b|តេឡេក្រាម|លេខទូរស័ព្ទ/i,
    en: "Connect your account to our Bookly Telegram Bot in Account → Profile or Sign-in & security! You'll get instant real-time Telegram alerts when your order is confirmed, packed, shipped with courier notes, and delivered — plus 1-tap phone sign-in.",
    km: "ភ្ជាប់គណនីរបស់អ្នកជាមួយ Bookly Telegram Bot ក្នុង គណនី → ប្រវត្តិរូប ឬ សុវត្ថិភាព! អ្នកនឹងទទួលបានសារជូនដំណឹងភ្លាមៗតាម Telegram ពេលការបញ្ជាទិញត្រូវបានវេចខ្ចប់ ដឹកចេញ និងដឹកដល់ដៃ ព្រមទាំងអាចចូលគណនីដោយលេខទូរស័ព្ទ។",
    link: "/account/profile",
    followUpsEn: ["Where is my order?", "Delivery fees", "Contact & hours"],
    followUpsKm: ["ការបញ្ជាទិញរបស់ខ្ញុំនៅឯណា?", "ថ្លៃដឹកជញ្ជូន", "ទំនាក់ទំនង និងម៉ោងធ្វើការ"],
  },
  {
    intent: "credit",
    pattern: /\b(credit|store credit|wallet|referral|refer|invite friend)\b|ឥណទាន|ណែនាំមិត្តភក្តិ/i,
    en: "Your store credit and return vouchers appear in your Account overview and can be applied directly towards your next order at checkout.",
    km: "សមតុល្យឥណទានហាង និងគូប៉ុងសងប្រាក់វិញពីការប្តូរត្រឡប់ អាចមើលឃើញនៅក្នុងគណនីរបស់អ្នក ហើយអាចយកមកប្រើនៅពេលទូទាត់។",
    link: "/account",
    followUpsEn: ["How do coupons work?", "Return policy", "Offers & discounts"],
    followUpsKm: ["តើគូប៉ុងប្រើដោយរបៀបណា?", "គោលការណ៍ប្តូរត្រឡប់", "ប្រូម៉ូសិន និងការបញ្ចុះតម្លៃ"],
  },
];

const FOLLOW_UPS_BY_INTENT: Record<string, { en: string[]; km: string[] }> = {
  delivery: {
    en: ["Where is my order?", "Pay with Bakong KHQR", "Offers & discounts"],
    km: ["ការបញ្ជាទិញរបស់ខ្ញុំនៅឯណា?", "បង់ប្រាក់តាម Bakong KHQR", "ប្រូម៉ូសិន និងការបញ្ចុះតម្លៃ"],
  },
  payment: {
    en: ["Pay with Bakong KHQR", "Cash on delivery", "How do coupons work?"],
    km: ["បង់ប្រាក់តាម Bakong KHQR", "បង់ប្រាក់ពេលទទួលទំនិញ", "តើគូប៉ុងប្រើដោយរបៀបណា?"],
  },
  order: {
    en: ["Can I cancel an order?", "Delivery fees", "Return policy"],
    km: ["តើខ្ញុំអាចបោះបង់ការបញ្ជាទិញបានទេ?", "ថ្លៃដឹកជញ្ជូន", "គោលការណ៍ប្តូរត្រឡប់"],
  },
  ebook: {
    en: ["Free preview sample", "Ebooks under $5", "Best sellers"],
    km: ["អានសាកល្បងឥតគិតថ្លៃ", "សៀវភៅអេឡិចត្រូនិកក្រោម $5", "សៀវភៅលក់ដាច់បំផុត"],
  },
  returns: {
    en: ["Store credit", "Where is my order?", "Contact & hours"],
    km: ["ឥណទានហាង", "ការបញ្ជាទិញរបស់ខ្ញុំនៅឯណា?", "ទំនាក់ទំនង និងម៉ោងធ្វើការ"],
  },
  books: {
    en: ["Best sellers", "New arrivals", "Offers & discounts"],
    km: ["សៀវភៅលក់ដាច់បំផុត", "សៀវភៅមកដល់ថ្មី", "ប្រូម៉ូសិន និងការបញ្ចុះតម្លៃ"],
  },
};

function getLinkLabel(link: string, lang: "en" | "km", staff: boolean, defaultLabel: string, staffLabel: string): string {
  if (staff || link.startsWith("/admin") || link.startsWith("/staff")) return staffLabel;
  const isKm = lang === "km";
  if (link === "/shipping") return isKm ? "មើលព័ត៌មានដឹកជញ្ជូន" : "View delivery & shipping guide";
  if (link === "/checkout") return isKm ? "ទៅកាន់ទំព័រទូទាត់" : "Go to checkout";
  if (link === "/offers") return isKm ? "មើលប្រូម៉ូសិនទាំងអស់" : "Explore current offers";
  if (link === "/cart") return isKm ? "បើកកន្ត្រករបស់អ្នក" : "Open your cart";
  if (link === "/returns-policy") return isKm ? "អានគោលការណ៍ប្តូរត្រឡប់" : "Read return policy";
  if (link === "/account/ebooks") return isKm ? "បើកបណ្ណាល័យសៀវភៅអេឡិចត្រូនិក" : "Open my ebooks library";
  if (link.startsWith("/account/orders")) return isKm ? "ពិនិត្យការបញ្ជាទិញរបស់អ្នក" : "Track your order";
  if (link === "/account/wishlist") return isKm ? "បើកបញ្ជីប្រាថ្នា" : "Open your wishlist";
  if (link === "/account/coupons") return isKm ? "មើលប័ណ្ណបញ្ចុះតម្លៃរបស់ខ្ញុំ" : "View my coupons";
  if (link === "/series") return isKm ? "រុករកឈុតសៀវភៅ" : "Browse book series";
  if (link === "/contact") return isKm ? "មើលទំព័រទំនាក់ទំនង" : "Open contact page";
  if (link === "/login") return isKm ? "ចូលគណនី" : "Sign in to your account";
  if (link === "/register") return isKm ? "បង្កើតគណនីឥតគិតថ្លៃ" : "Create a free account";
  if (link.startsWith("/books")) return isKm ? "មើលសៀវភៅក្នុងបញ្ជី" : "Browse matching books";
  return defaultLabel;
}

/**
 * Enriches backend answers with trained local knowledge when the live server returns "unknown"
 * and attaches contextual follow-up chips to keep the conversation flowing naturally.
 */
function enhanceWithLocalKnowledge(question: string, result: AssistantReply, lang: "en" | "km", staff: boolean): AssistantReply {
  if (staff) return result;
  const isKm = lang === "km";

  if (result.intent === "unknown") {
    for (const rule of LOCAL_TRAINING_RULES) {
      if (rule.pattern.test(question)) {
        return {
          intent: rule.intent,
          text: isKm ? rule.km : rule.en,
          link: rule.link,
          books: [],
          handoff: false,
          followUps: isKm ? rule.followUpsKm : rule.followUpsEn,
        };
      }
    }
  }

  const followUpSet = FOLLOW_UPS_BY_INTENT[result.intent];
  if (followUpSet && !result.followUps) {
    return {
      ...result,
      followUps: isKm ? followUpSet.km : followUpSet.en,
    };
  }
  return result;
}

export function AssistantPanel({ staff = false, onHandoff }: { staff?: boolean; onHandoff?: (question: string) => void }) {
  const { dict, lang } = useT();
  const t = dict.assistant;
  const portal = usePortal();
  const inputId = useId();
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: async (value: string) => {
      const raw = staff ? await assistantApi.staff(value) : await assistantApi.ask(value);
      return enhanceWithLocalKnowledge(value, raw, lang, staff);
    },
    onSuccess: (result, value) => {
      setTurns((prev) => [...prev, { id: Date.now(), asked: value, answer: result }]);
      setPendingQuestion("");
    },
    onError: () => {
      setPendingQuestion("");
    },
  });

  const submit = (value: string, clearInput = false) => {
    const trimmed = value.trim();
    if (!trimmed || ask.isPending) return;
    setPendingQuestion(trimmed);
    if (clearInput) setQuestion("");
    else setQuestion(trimmed);
    ask.mutate(trimmed);
  };

  useEffect(() => {
    const el = feedRef.current;
    if (el && typeof el.scrollTo === "function") {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [turns.length, pendingQuestion]);

  const customerQuickTopics = [
    { label: t.orders, icon: Package },
    { label: t.delivery, icon: Truck },
    { label: t.payment, icon: CreditCard },
    { label: t.ebooks, icon: BookOpen },
    { label: t.offers, icon: Tag },
    { label: t.returns, icon: RotateCcw },
    { label: t.bestSellers, icon: Sparkles },
  ];
  const staffQuickTopics = ["orders waiting", "low stock", "open returns", "sales today", "top books"];

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      {/* Scrollable conversational chat feed */}
      <div
        ref={feedRef}
        className="grid max-h-[345px] min-h-[225px] flex-1 content-start gap-3.5 overflow-y-auto rounded-xl border border-border/80 bg-surface-2/35 p-3.5"
      >
        {/* Welcome Bot Card + Categorized Quick Topics */}
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-2xs" aria-hidden="true">
            <Bot className="size-4" />
          </span>
          <div className="grid min-w-0 flex-1 gap-2.5 rounded-2xl rounded-tl-xs border border-border bg-card p-3.5 shadow-2xs">
            <p className="text-xs leading-relaxed text-foreground sm:text-[13px]">
              {staff ? t.staffDescription : t.welcome}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {staff
                ? staffQuickTopics.map((chip) => (
                    <button
                      type="button"
                      key={chip}
                      disabled={ask.isPending}
                      onClick={() => submit(chip, false)}
                      className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-primary/25 bg-lapis-tint/45 px-2.5 py-1 text-left text-xs font-medium text-primary transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                    >
                      <Sparkles className="size-3 shrink-0 opacity-75" aria-hidden="true" />
                      <span>{chip}</span>
                    </button>
                  ))
                : customerQuickTopics.map(({ label, icon: Icon }) => (
                    <button
                      type="button"
                      key={label}
                      disabled={ask.isPending}
                      onClick={() => submit(label, false)}
                      className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-primary/25 bg-lapis-tint/45 px-2.5 py-1 text-left text-xs font-medium text-primary transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                    >
                      <Icon className="size-3 shrink-0 opacity-80" aria-hidden="true" />
                      <span>{label}</span>
                    </button>
                  ))}
            </div>
          </div>
        </div>

        {/* Multi-turn conversation history */}
        {turns.map((turn, index) => {
          const isLatest = index === turns.length - 1;
          const answer = turn.answer;
          const books = "books" in answer ? answer.books : [];
          const showHandoff = "handoff" in answer && answer.handoff && onHandoff;
          const linkText = answer.link ? getLinkLabel(answer.link, lang, staff, t.title, t.staffTitle) : null;
          return (
            <div key={turn.id} className="grid gap-2.5">
              {/* User question bubble */}
              <div className="justify-self-end max-w-[85%] rounded-2xl rounded-br-xs bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground shadow-2xs sm:text-[13px]">
                {turn.asked}
              </div>

              {/* Assistant answer bubble */}
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/20" aria-hidden="true">
                  <Bot className="size-4" />
                </span>
                <div
                  role={isLatest ? "status" : undefined}
                  className="grid min-w-0 flex-1 gap-2.5 rounded-2xl rounded-tl-xs border border-border bg-card p-3.5 text-xs leading-relaxed text-foreground shadow-2xs sm:text-[13px]"
                >
                  <p className="whitespace-pre-wrap break-words">{answer.text}</p>
                  {answer.link && linkText ? (
                    <div>
                      <Link
                        aria-label={answer.link.startsWith("/admin") || answer.link.startsWith("/staff") ? t.staffTitle : t.title}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-lapis-tint/75 px-3.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                        to={staff ? rewriteAdminPath(answer.link, portal) : answer.link}
                      >
                        <span>{linkText}</span>
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  ) : null}
                  {books?.length ? (
                    <div className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2">
                      {books.map((book) => (
                        <BookCard key={book.id} book={book} />
                      ))}
                    </div>
                  ) : null}
                  {answer.followUps?.length ? (
                    <div className="mt-0.5 border-t border-border/60 pt-2">
                      <div className="flex flex-wrap gap-1.5">
                        {answer.followUps.map((followUp) => (
                          <button
                            key={followUp}
                            type="button"
                            disabled={ask.isPending}
                            onClick={() => submit(followUp, false)}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-lapis-tint/40 hover:text-primary"
                          >
                            <HelpCircle className="size-3 shrink-0 opacity-70" aria-hidden="true" />
                            <span>{followUp}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {showHandoff ? (
                    <div className="pt-0.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full justify-center gap-1.5 rounded-lg border-primary/30 text-xs font-semibold text-primary hover:bg-lapis-tint/40"
                        onClick={() => onHandoff(turn.asked)}
                      >
                        <UserCheck className="size-3.5" aria-hidden="true" />
                        {t.handoff}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}

        {/* Pending thinking state */}
        {ask.isPending && pendingQuestion ? (
          <div className="grid gap-2.5">
            <div className="justify-self-end max-w-[85%] rounded-2xl rounded-br-xs bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground shadow-2xs sm:text-[13px]">
              {pendingQuestion}
            </div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary" aria-hidden="true">
                <Bot className="size-4 animate-pulse" />
              </span>
              <div className="inline-flex items-center gap-2 rounded-2xl rounded-tl-xs border border-border bg-card px-3.5 py-2 text-xs text-muted-foreground">
                <span className="size-1.5 animate-bounce rounded-full bg-primary" />
                <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:120ms]" />
                <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:240ms]" />
                <span>{t.thinking}</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {ask.isError ? <p role="alert" className="text-xs font-medium text-destructive">{t.error}</p> : null}

      {/* Compact pinned bottom composer */}
      <form
        className="grid gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          submit(question, true);
        }}
      >
        <div className="flex items-center justify-between">
          <label htmlFor={inputId} className="text-xs font-semibold text-muted-foreground">
            {t.question}
          </label>
          {turns.length > 0 ? (
            <button
              type="button"
              onClick={() => setTurns([])}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              {t.clearChat}
            </button>
          ) : null}
        </div>
        <div className="flex items-end gap-2">
          <textarea
            id={inputId}
            className={cn(supportField, "min-h-11 resize-none py-2.5 text-sm leading-snug")}
            placeholder={t.placeholder}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (question.trim()) submit(question, true);
              }
            }}
            maxLength={300}
            required
            rows={1}
          />
          <Button type="submit" disabled={ask.isPending || !question.trim()} className="h-11 shrink-0 gap-1.5 px-4">
            <Send className="size-4" aria-hidden="true" />
            <span>{t.send}</span>
          </Button>
        </div>
      </form>
    </section>
  );
}

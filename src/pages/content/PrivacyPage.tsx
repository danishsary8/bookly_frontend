import { Link } from "react-router-dom";
import { shop } from "@/content/shop";
import { ContentPage } from "@/features/content/ContentPage";
import { LegalNotice } from "@/features/content/LegalNotice";

/*
 * /privacy: what the app actually stores and why, in plain language (checked against the
 * API and this frontend on 2026-10-02, approved by the owner 2026-10-06).
 */
export default function PrivacyPage() {
  return (
    <ContentPage
      title="Privacy"
      documentTitle="Privacy policy"
      eyebrow="Legal"
      lead={`What ${shop.name} keeps about you, why, who sees it, and what you can change yourself.`}
      numbered
      notice={<LegalNotice />}
      sections={[
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
              <li>To email you sign-up and password-reset codes. We don't send marketing email.</li>
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
                  <strong>Our staff,</strong> to prepare orders, answer returns and look after reviews. Changes staff make are logged.
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
                In <Link to="/account">your account</Link> you can change your name, phone, password and addresses, and edit or delete your reviews.
              </p>
              <p>
                To change your email address, get a copy of your data, or close your account and delete your data, <Link to="/contact">contact us</Link>{" "}
                from the email on your account. We keep order records the law requires us to keep.
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
      ]}
    />
  );
}

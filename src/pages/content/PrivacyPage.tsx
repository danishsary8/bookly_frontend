import { Link } from "react-router-dom";
import { contact, shop } from "@/content/shop";
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
                <strong>If you sign in with Google or Facebook:</strong> the name and email address they share with us and an account number that links
                them to your Bookly account. Never your password there, your contacts or your posts.
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
                In <Link to="/account">your account</Link> you can change your name, phone, password and addresses, and edit or delete your reviews.
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
                  30 days later.
                </li>
                <li>Order records the law requires us to keep stay, without your personal details attached.</li>
              </ol>
              <p>
                Can't sign in? Message us on Telegram ({contact.telegram}) or email <a href={`mailto:${contact.email}`}>{contact.email}</a> and we'll do it for you
                once we've confirmed it's you.
              </p>
              <p>
                If you used Facebook, you can also remove Bookly from Facebook under Settings &amp; privacy → Settings → Apps and websites. For Google, it's
                under your Google Account → Security → Your connections to third-party apps &amp; services.
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

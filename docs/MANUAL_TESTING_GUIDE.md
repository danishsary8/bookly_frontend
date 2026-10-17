# Bookly Manual Browser Testing Guide

> **Date**: 2026-10-17  
> **Status**: Ready for manual verification  
> **Target Branches**: `main` (`bookly_backend_v2` & `bookly_frontend`)  

This guide contains all step-by-step instructions for testing the newly merged features in your browser when you are ready.

---

## 1. Quick Environment Setup

Open two terminal tabs:

### Tab A: Start Backend API (Port 8000)
```powershell
cd e:\xampp\htdocs\book_project\bookly_v2\bookly_backend_v2
php artisan serve
```
*Expected: Server running at `http://127.0.0.1:8000`*

### Tab B: Start Frontend App (Port 5173)
```powershell
cd e:\xampp\htdocs\book_project\bookly_v2\bookly_frontend
npm run dev
```
*Expected: Server running at `http://localhost:5173`*

---

## 2. Test Checklist

### Test 1: SEO & Search Engine Endpoints
- [ ] Open `http://127.0.0.1:8000/sitemap.xml`:
  - Verify XML output loads cleanly in browser without XML syntax errors.
  - Verify static pages (`/`, `/books`, `/shipping`, `/terms`, `/privacy`) and dynamic entities (`/books/{id}`, `/categories/{slug}`, `/authors/{id}`) are listed with valid `<loc>` tags.
- [ ] Open `http://127.0.0.1:8000/robots.txt`:
  - Verify `Allow: /` and `Disallow: /admin`, `/checkout`, `/account`.
  - Verify `Sitemap:` points to `http://127.0.0.1:8000/sitemap.xml`.

---

### Test 2: Login Page Phone Number Toggle
- [ ] Navigate to `http://localhost:5173/login`:
  - Check under the login form: find the toggle link **"Sign in with phone number?"**.
  - Click it: verify the form smoothly transitions to phone number input mode.
  - Click **"Sign in with email and password?"**: verify it switches back to email mode.
  - Verify social sign-in buttons remain intact at the bottom.

---

### Test 3: Free Delivery Threshold & Province Estimates
- [ ] Browse books at `http://localhost:5173/books` and add items to your cart.
- [ ] Open the cart drawer or `/cart`:
  - When subtotal is under \$50, verify the progress bar: `"Add $X.XX more for FREE delivery"`.
  - When subtotal reaches \$50+, verify the badge: `"You've unlocked FREE delivery!"`.
- [ ] Proceed to `http://localhost:5173/checkout`:
  - Select or add a shipping address in Phnom Penh: check fee is \$0.00 if over \$50 (or \$1.50) with delivery estimate `"1 working day"`.
  - Select a provincial address (e.g., Siem Reap, Battambang): check estimate shows `"2–3 working days"`.
  - Check the green **"Free"** badge next to Delivery in the order summary when eligible.

---

### Test 4: Bilingual Localization (English & Khmer)
- [ ] On `http://localhost:5173/checkout`:
  - Switch the language in the header navbar to **"ភាសាខ្មែរ"**.
  - Verify the **"Free"** delivery badge translates to **"ឥតគិតថ្លៃ"**.
  - Verify estimated delivery translates to **"ការប៉ាន់ស្មានដឹកជញ្ជូន៖ ..."**.
- [ ] Visit legal & policy pages in both languages:
  - `http://localhost:5173/shipping` (all 25 provinces delivery rules).
  - `http://localhost:5173/returns-policy` (7-day returns policy).
  - `http://localhost:5173/terms` and `http://localhost:5173/privacy` (30-day account erasure).
  - Confirm Khmer text wraps cleanly on mobile view (no horizontal overflow).

---

### Test 5: Customer Telegram Order Updates
- [ ] Sign in to your customer account and go to `http://localhost:5173/account/profile`.
- [ ] Locate the **Telegram Order Updates** card:
  - If not connected, tap **"Connect Telegram"** to see instructions / deep link to the bot.
  - If connected, verify you can toggle the order updates switch on/off.
- [ ] Place a test Cash on Delivery order:
  - On the order success confirmation page (`/checkout/success/{id}`), check the new Telegram notifications promo callout and the **"Manage"** button linking to your profile.

---

### Test 6: Staff Cover Image Drag-and-Drop Uploader
- [ ] Log in as staff / admin at `http://localhost:5173/admin/books`.
- [ ] Edit an existing book or click to add a new book variant:
  - Verify the cover image dropzone box is visible.
  - Drag an image file (`.jpg`, `.png`, or `.webp`) into the dropzone:
    - Verify client dimension check (must be at least 100x100px and under 5MB).
    - Verify upload preview shows immediately.
    - Verify you can still manually enter an image URL if desired.

---

### Test 7: Active Orders Packing Slip Control
- [ ] In the admin portal, navigate to `http://localhost:5173/admin/orders`:
  - For an active order (status: `processing` or `pending`), verify the **Print Packing Slip** button is enabled and visible.
  - For a completed order (status: `delivered`, `cancelled`, or `returned`), verify the packing slip button is cleanly hidden.

---

### Test 8: Branded HTML Email Templates & "View your order" Button
- [ ] In `.env` on backend, ensure `MAIL_MAILER=log` (or your Mailtrap/SMTP credentials).
- [ ] Place an order on the storefront or update an order's status to `shipped` in the admin panel.
- [ ] Check the generated email (in `storage/logs/laravel.log` or your Mailtrap inbox):
  - Verify branded header with Bookly book icon and warm serif styling.
  - Verify clean responsive card layout with warm cream background (`#f8f7f5`).
  - Verify styled dark charcoal **"View your order"** action button linking to the frontend customer order page (`/account/orders/{id}`).
  - Verify Khmer language support: switch account language to Khmer (`km`), place an order, and verify the button reads **"មើលការបញ្ជាទិញរបស់អ្នក"**.
  - Verify branded footer: `Bookly · Phnom Penh, Cambodia`.

---

### Test 9: Related Books & Cart Recommendations
- [ ] **Book Detail Page**:
  - Visit any book detail page (`http://localhost:5173/books/{id}`).
  - Scroll down below description and reviews:
    - Verify the **"Readers also enjoyed"** / **"Customers also bought"** bookshelf displays related titles.
    - Verify that only active, in-stock/digital books appear (no out-of-stock physical items).
    - Verify the current book is excluded from recommendations.
- [ ] **Cart Page Recommendations**:
  - Navigate to `http://localhost:5173/cart`:
    - When your cart is empty: verify the recommendation shelf displays **"Popular in bookstore"** ("សៀវភៅពេញនិយមប្រចាំបណ្ណាគារ").
    - Add a book to your cart (e.g. from Fiction or History): return to `/cart` and verify the shelf adapts dynamically to show **"Recommended with your order"** ("សៀវភៅណែនាំសម្រាប់ការបញ្ជាទិញរបស់អ្នក") featuring matching categories/authors, while excluding books already in your cart!
  - Switch language to Khmer (`km`) and verify the Khmer translations render cleanly.

---

### Test 10: Official Order Invoice / Receipt & Verification QR Code
- [ ] **Instant Receipt Access on Order Confirmation Page**:
  - Place a test order through `/checkout`.
  - On the order success page (`/checkout/success/{id}`):
    - Verify the new **"Print receipt"** / **"Print invoice"** action button is displayed next to "View order".
    - Click it: verify it opens the branded A4 printable invoice/receipt (`/account/orders/{id}/invoice?autoprint=1`) in a new tab with the print dialog automatically prompted.
- [ ] **Verification QR Code on Invoice Sheet**:
  - Look at the bottom footer of the printable A4 invoice sheet:
    - Verify the **"Verify Order"** vector QR code is cleanly rendered.
    - Scan the QR code using your smartphone camera: verify it immediately opens the online order details page (`/account/orders/{id}`).
- [ ] **Customer Order Detail Access**:
  - In `/account/orders/{id}`, verify the **"Print invoice"** / **"Print receipt"** button is visible for all non-cancelled orders.
  - Verify you can easily save as PDF from your browser's print preview dialog.

---

### Test 11: Storefront Smart Promotional Announcement Bar
- [ ] **Storefront Top Bar Display**:
  - Open `http://localhost:5173/`:
    - Verify the warm branded promotional bar appears at the very top: *"🚚 Flat $1.50 Delivery in Phnom Penh · Free delivery on orders over $25! Shop books →"*.
    - Click **"Shop books"**: verify it navigates directly to `/books`.
- [ ] **Bilingual Language Switch**:
  - Toggle language to Khmer (`km`):
    - Verify the announcement immediately switches to Khmer: *"🚚 តម្លៃដឹកជញ្ជូន 1.50$ ក្នុងរាជធានីភ្នំពេញ · ឥតគិតថ្លៃសម្រាប់ការបញ្ជាទិញចាប់ពី 25$ ឡើងទៅ! ទិញសៀវភៅ →"*.
- [ ] **Dismissal & Persistence**:
  - Click the **"✕"** dismiss button on the right edge.
  - Verify the announcement bar smoothly dismisses.
  - Refresh the browser (`F5`): verify the announcement bar remains dismissed (persisted in `localStorage`).
---

### Test 12: Customer Wishlist Reading Statuses & Organization
- [ ] **Saved Books Reading Status Tabs**:
  - Sign in as a customer and navigate to `http://localhost:5173/account/wishlist`:
    - Verify the reading status filter tabs at the top:
      - **"All"** (ទាំងអស់) with total saved count badge
      - **"Want to read"** (ចង់អាន) with count badge
      - **"Currently reading"** (កំពុងអាន) with count badge
      - **"Finished"** (បានអានរួចរាល់) with count badge
    - Click each tab: verify the URL updates with `?status=...` and only books with that status are shown.
- [ ] **Interactive Status Changing**:
  - On any saved book card:
    - Click the reading status badge pill (e.g. "Want to read").
    - Select **"Currently reading"** or **"Finished"**:
      - Verify the badge immediately reflects the new status with the appropriate tone/icon.
      - Verify the success toast "Reading status updated" ("បានផ្លាស់ប្តូរស្ថានភាពអាន") appears.
      - Switch between tabs and verify the book moved to the correct status tab!
- [ ] **Remove & Undo**:
  - Click the heart icon on any saved book:
    - Verify it is removed and a toast appears with an **"Undo"** action.
    - Click **"Undo"**: verify the book is restored to your wishlist with its status preserved.
- [ ] **Bilingual Khmer Support**:
  - Switch language to Khmer (`km`):
    - Verify all tabs, badge labels, and empty states render in authentic Khmer typography.

---

### Test 13: Book Social Share & QR Code Modal
- [ ] **Share Button on Book Detail Page**:
  - Visit any book detail page (e.g. `http://localhost:5173/books/1` or click any book on the homepage).
  - Next to the wishlist heart icon, verify the new **Share** button (`Share2` icon).
  - Click the Share button:
    - Verify the interactive modal opens with the book cover preview, title, and author.
- [ ] **Social & Direct Link Sharing**:
  - On the **"Social & Link"** tab:
    - **Telegram Button**: Click the Telegram button with the Telegram paper plane icon; verify it opens a new tab directed to `t.me/share/url?url=...&text=...` with the prefilled book title and URL.
    - **Facebook Button**: Click the Facebook button; verify it opens Facebook's sharer dialog in a new tab.
    - **Copy Link**: Verify the input field shows the book's direct URL. Click "Copy link":
      - Verify the button smoothly flips to green with a checkmark icon and text "Copied!".
      - Verify the success toast "Link copied to clipboard!" ("បានចម្លងតំណភ្ជាប់!") appears.
      - Paste into your address bar to verify the copied URL.
- [ ] **Mobile QR Code Scanning & Download**:
  - Click the **"QR Code"** tab:
    - Verify the high-contrast vector QR code renders in the crisp white framed card.
    - Test scanning the screen with your phone's camera: verify your phone prompts to open the book on Bookly!
    - Click **"Download QR"**: verify an SVG file named `bookly-qr-<slug>.svg` downloads to your computer.
- [ ] **Bilingual Khmer Support**:
  - Switch the language toggle to Khmer:
    - Verify the share modal header ("ចែករំលែកសៀវភៅនេះ"), description, tabs, and copy/download buttons display in natural Khmer.

---

### Test 14: Search Discovery Hub & Recent Searches
- [ ] **Search Discovery Hub (`/search` with no query)**:
  - Visit `http://localhost:5173/search`:
    - Verify that instead of an empty white screen, you see:
      - **"Popular searches"** (ការស្វែងរកពេញនិយម) with trending pills ("Khmer History", "Business & Leadership", "Personal Finance", "Self-Help", "English Learning", "Coding & Tech", "Fiction").
      - **"Browse by category"** (ស្វែងរកតាមប្រភេទ) featuring interactive category cards with book counts.
- [ ] **Popular Tag One-Click Search**:
  - Click any popular tag (e.g. "Khmer History" or "Personal Finance"):
    - Verify the search input immediately populates with that tag.
    - Verify the URL updates to `?q=...` and matching books render instantly.
- [ ] **Recent Searches History & Persistence**:
  - Search for a custom title (e.g. "Cambodia" or "Microservices"):
    - Now clear the search field or visit `http://localhost:5173/search`:
    - Verify **"Recent searches"** (ការស្វែងរកថ្មីៗ) appears with a Clock icon above popular searches.
    - Verify your recent search queries appear as rounded chip pills.
    - Click any chip: verify it searches that query again.
    - Click the small `×` on any chip: verify only that item is removed from history.
    - Click **"Clear all"** (សម្អាតទាំងអស់): verify all recent search history is cleared.
- [ ] **Live Search Header Sync**:
  - In the sticky top navigation header, type a search into the live search bar and press Enter (or click "See all results").
  - Go back to `/search`: verify that query was also automatically captured into your recent searches.
- [ ] **Bilingual Khmer Support**:
  - Switch the language toggle to Khmer:
    - Verify headings, popular search chips, and category cards render in Khmer typography.

---

## 3. Owner Setup: Connecting the Staff Telegram Group (Do Whenever You're Free)

When you're ready to connect your team's Telegram group to receive real-time order alerts:

1. **Create Group**: In Telegram, create a group (e.g. "Bookly Staff Operations"), add your staff, and add your Bookly Alerts bot.
2. **Get Chat ID**: Send a message in the group, open `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates` in your browser, and copy the negative group ID (e.g. `-1002345678901`).
3. **Save Setting**:
   - In `.env` (or Render / Railway environment settings):
     `OPS_STAFF_CHAT_ID=-1002345678901`
     `SHOP_URL=https://bookly-frontend-five.vercel.app` (or `http://localhost:5173`)
4. **Verify**: Run `php artisan ops:test-alert` in backend terminal to confirm instant delivery!


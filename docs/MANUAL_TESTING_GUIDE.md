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

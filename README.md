# Bookly — Frontend

The web app for a bookstore e-commerce platform: a customer storefront and an admin area, built with **React 19**, **TypeScript**, **Vite** and **Tailwind CSS**.

Backend API: [bookly_backend_v2](https://github.com/danishsary8/bookly_backend_v2)

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-build-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)

## Features

**Storefront**
- Home page and catalog browsing
- Book detail pages
- Favorites, cart and checkout
- Order history and order details
- Sign up, log in, OTP verification, forgot / reset password
- Customer profile

**Admin area**
- Dashboard
- Books and catalog management
- Orders, returns and promotions
- Users and settings

## Tech stack

| Area | Choice |
| --- | --- |
| UI | React 19, TypeScript |
| Build | Vite |
| Styling | Tailwind CSS 4, Radix UI / Base UI components, lucide icons |
| Routing | React Router 7 (protected customer and admin routes) |
| HTTP | Axios with a shared client in `src/api/axios.ts` |
| Animation | Motion, GSAP |
| Hosting | Vercel (SPA rewrites in `vercel.json`) |

## Project structure

```
src/
  api/          Axios client
  services/     API calls per area (auth, books, customer, admin)
  page/client/  Storefront pages
  page/admin/   Admin pages
  routes/       Route definitions and route guards
  components/   Shared UI components
  contexts/     React context (auth state, ...)
  hooks/        Custom hooks
  layouts/      Page layouts
  types/        TypeScript types
```

## Getting started

Requirements: Node.js 20+.

```bash
git clone https://github.com/danishsary8/bookly_frontend.git
cd bookly_frontend
npm install
```

Create a `.env` file:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_BOOK_IMAGE_BASE_URL=
```

```bash
npm run dev       # development server
npm run build     # type-check and production build
npm run lint
```

## Status

The frontend currently works with the first version of the API. The backend has been rebuilt as [bookly_backend_v2](https://github.com/danishsary8/bookly_backend_v2) (Laravel + PostgreSQL), and the frontend will be updated to the new `/api/v1` endpoints next.

## Author

Built by [danishsary8](https://github.com/danishsary8).

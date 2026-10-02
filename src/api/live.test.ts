// @vitest-environment-options {"url": "http://localhost:5173/"}
/*
 * End-to-end check of the API layer against a running Bookly API with the demo data
 * (php artisan db:seed --class=DemoSeeder). Skipped unless LIVE_API=1:
 *   LIVE_API=1 VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1 npx vitest run src/api/live.test.ts
 * Runs with the frontend's origin, so it also proves the API's CORS settings allow the app.
 */
import { afterAll, describe, expect, it } from "vitest";
import { ApiError } from "./errors";
import { authApi } from "./endpoints/auth";
import { accountApi } from "./endpoints/account";
import { cartApi } from "./endpoints/cart";
import { catalogApi } from "./endpoints/catalog";
import { ordersApi } from "./endpoints/orders";
import { getSession } from "./session";

const live = import.meta.env.LIVE_API === "1" || process.env.LIVE_API === "1";

describe.skipIf(!live)("API layer against a live API", () => {
  afterAll(() => window.localStorage.clear());

  it("reads the public catalogue", async () => {
    const page = await catalogApi.books({ in_stock: true, sort: "newest", per_page: 5 });
    expect(page.data.length).toBeGreaterThan(0);
    expect(page.meta.total).toBeGreaterThan(0);

    const book = await catalogApi.book(page.data[0].id!);
    expect(book.variants?.length).toBeGreaterThan(0);

    const [categories, authors, series] = await Promise.all([catalogApi.categories(), catalogApi.authors(), catalogApi.seriesList()]);
    expect(categories.length).toBeGreaterThan(0);
    expect(authors.data.length).toBeGreaterThan(0);
    expect((await catalogApi.series(series.data[0].id!)).books?.length).toBeGreaterThan(0);

    // Full-text search covers title and description (not author or series names yet).
    const search = await catalogApi.books({ q: "hound", sort: "relevance" });
    expect(search.data[0]?.title).toBe("The Hound of the Baskervilles");
  });

  it("returns typed errors", async () => {
    const notFound = await catalogApi.book(999_999).catch((e: unknown) => e);
    expect(notFound).toBeInstanceOf(ApiError);
    expect((notFound as ApiError).kind).toBe("not_found");

    const badLogin = await authApi.login("demo@bookly.test", "wrong-password").catch((e: unknown) => e);
    expect((badLogin as ApiError).kind).toBe("unauthenticated");
  });

  it("logs in, shops and places a cash-on-delivery order", async () => {
    await authApi.login("demo@bookly.test", "Password123!");
    expect(getSession("customer")?.token).toBeTruthy();

    const me = await accountApi.me();
    expect(me.email).toBe("demo@bookly.test");

    const [address] = await accountApi.addresses();
    const book = await catalogApi.book((await catalogApi.books({ in_stock: true, format: "paperback", per_page: 1 })).data[0].id!);
    const variant = book.variants!.find((v) => v.format === "paperback" && v.in_stock)!;

    await cartApi.clear();
    const cart = await cartApi.addItem(variant.id!, 1);
    expect(cart.items?.[0].book_variant_id).toBe(variant.id);

    const preview = await cartApi.preview();
    expect(Number(preview.total?.usd)).toBeGreaterThan(0);

    const key = `live-test-${Date.now()}`;
    const order = await cartApi.placeOrder({ address_id: address.id!, payment_method: "cod" }, key);
    expect(order.status).toBe("pending");
    // Same key again returns the same order instead of a second one.
    expect((await cartApi.placeOrder({ address_id: address.id!, payment_method: "cod" }, key)).id).toBe(order.id);

    const cancelled = await ordersApi.cancel(order.id!, "Live API test");
    expect(cancelled.status).toBe("cancelled");

    await authApi.logout();
    expect(getSession("customer")).toBeNull();
  });
});

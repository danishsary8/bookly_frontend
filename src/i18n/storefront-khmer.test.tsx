import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { CartGate } from "@/features/cart/CartGate";
import { loginSchema } from "@/features/auth/schemas";
import { orderDate } from "@/features/orders/format";
import { EnglishOnly, LOCALES, en, formatName, km, rangeText, setLanguage, useT } from "./index";
import { Rich } from "./Rich";

function withProviders(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

function BooksWord() {
  return <span data-testid="word">{useT().dict.nav.books}</span>;
}

describe("Khmer storefront", () => {
  beforeEach(() => act(() => setLanguage("km")));
  afterEach(() => act(() => setLanguage("en")));

  it("keeps the staff area and printed documents in English", () => {
    const { unmount } = render(
      <EnglishOnly>
        <BooksWord />
      </EnglishOnly>,
    );
    expect(screen.getByTestId("word")).toHaveTextContent("Books");
    expect(document.documentElement.lang).toBe("en");
    unmount();
    expect(document.documentElement.lang).toBe("km");
  });

  it("shows form errors in the chosen language", () => {
    const khmer = loginSchema.safeParse({ email: "", password: "" });
    expect(khmer.error?.issues.map((i) => i.message)).toContain(km.forms.enterEmail);

    act(() => setLanguage("en"));
    const english = loginSchema.safeParse({ email: "", password: "" });
    expect(english.error?.issues.map((i) => i.message)).toContain("Enter your email address.");
  });

  it("translates shared parts and pages, not only titles", () => {
    render(withProviders(<CartGate>cart</CartGate>));
    expect(screen.getByRole("heading", { name: km.signin.cartSignIn })).toBeInTheDocument();
    render(<OrderStatusBadge status="shipped" />);
    expect(screen.getByText(km.orderStatus.shipped)).toBeInTheDocument();
  });

  it("formats dates, counts and book formats in Khmer", () => {
    expect(orderDate("2026-10-02T10:00:00Z", LOCALES.km)).toContain("តុលា");
    expect(orderDate("2026-10-02T10:00:00Z")).toBe("2 Oct 2026");
    expect(rangeText(km, 1, 10, 25, km.nouns.book(25))).toBe("បង្ហាញ 1–10 នៃសៀវភៅ 25");
    expect(rangeText(en, 1, 10, 25, en.nouns.book(25))).toBe("Showing 1–10 of 25 books");
    expect(formatName(km, "paperback")).toBe(km.formats.paperback);
    expect(formatName(km, "comic")).toBe("Comic");
  });

  it("renders bold words and links inside translated sentences", () => {
    render(withProviders(<Rich text="ចុច **Start** ឬមើល[ការដឹកជញ្ជូន](/shipping)" strong="font-semibold" />));
    expect(screen.getByText("Start").tagName).toBe("STRONG");
    expect(screen.getByRole("link", { name: "ការដឹកជញ្ជូន" })).toHaveAttribute("href", "/shipping");
  });

  it("has no English left in the Khmer dictionary", () => {
    // Names and codes that stay the same in Khmer.
    const same = /^(Telegram|ISBN|Bakong KHQR|English|ភាសាខ្មែរ|Visa, Mastercard.*|.*\bDELETE\b.*|.*\bORD-.*)$/;
    const leftovers: string[] = [];
    const visit = (a: unknown, b: unknown, path: string) => {
      if (typeof a === "function" && typeof b === "function") return visit(a("7", "8", "X", "Y"), b("7", "8", "X", "Y"), path);
      if (typeof a === "string") {
        if (a === b && /[a-z]{3,}/.test(a) && !same.test(a)) leftovers.push(`${path}: ${a}`);
        return;
      }
      if (a && typeof a === "object") for (const key of Object.keys(a)) visit((a as never)[key], (b as never)?.[key], `${path}.${key}`);
    };
    visit(en, km, "km");
    expect(leftovers).toEqual([]);
  });
});

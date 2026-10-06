import { afterEach, describe, expect, it, vi } from "vitest";
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { catalogApi } from "@/api/endpoints/catalog";
import { OfflineBanner } from "@/components/shell/OfflineBanner";
import { Toaster } from "@/components/ui/toaster";
import { contact, policy } from "@/content/shop";
import { renderWithProviders } from "@/test/render";
import { dismissToast } from "@/stores/toast";
import AboutPage from "./AboutPage";
import ContactPage from "./ContactPage";
import FaqPage from "./FaqPage";
import NotFoundPage from "./NotFoundPage";
import PrivacyPage from "./PrivacyPage";
import ReturnsPolicyPage from "./ReturnsPolicyPage";
import ShippingPage from "./ShippingPage";
import TermsPage from "./TermsPage";

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

const app = (route: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/shipping" element={<ShippingPage />} />
        <Route path="/returns-policy" element={<ReturnsPolicyPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Where />
    </>,
    { route },
  );

/** The bookplate's facts as "value: label" pairs (the <dl> under the title). */
const plateFacts = () =>
  within(screen.getByRole("region", { name: screen.getByRole("heading", { level: 1 }).textContent! }))
    .getAllByRole("definition")
    .map((dd) => `${dd.textContent}: ${dd.previousElementSibling?.textContent}`);

afterEach(() => {
  vi.restoreAllMocks();
  dismissToast();
});

describe("help pages", () => {
  it("shipping quotes the delivery fees the API charges and lists its sections", () => {
    app("/shipping");
    expect(screen.getByRole("heading", { level: 1, name: "Shipping & delivery" })).toBeInTheDocument();
    expect(plateFacts()[0]).toBe(`$${policy.shippingFeesUsd.phnomPenh}: delivery per order in Phnom Penh ($${policy.shippingFeesUsd.provinces} to the provinces)`);
    const contents = screen.getAllByRole("navigation", { name: "On this page" })[0];
    expect(within(contents).getAllByRole("link", { name: /What delivery costs/ })[0]).toHaveAttribute("href", "#cost");
    expect(screen.getByText(/1 working day, \$1\.50/)).toBeInTheDocument();
    expect(screen.getByText(/2 to 3 working days, \$3\.00/)).toBeInTheDocument();
    expect(screen.queryByText("To be confirmed")).not.toBeInTheDocument();
  });

  it("returns policy states the window from the shop config", () => {
    app("/returns-policy");
    expect(plateFacts()[0]).toBe(`${policy.returnWindowDays} days: from the day your order is delivered`);
    expect(screen.getByText(/you get back \$18\.00/)).toBeInTheDocument();
  });

  it("FAQ opens the answer named in the address", async () => {
    const user = userEvent.setup();
    app("/faq#cancel-order");
    const open = screen.getByRole("button", { name: "Can I cancel an order?" });
    expect(open).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/while it's still pending/)).toBeInTheDocument();
    const other = screen.getByRole("button", { name: "How do I pay?" });
    expect(other).toHaveAttribute("aria-expanded", "false");
    await user.click(other);
    expect(other).toHaveAttribute("aria-expanded", "true");
    expect(open).toHaveAttribute("aria-expanded", "true");
  });

  it("contact links open Telegram, the phone and email, and says the shop is online only", () => {
    app("/contact");
    expect(screen.getByRole("link", { name: new RegExp(contact.email) })).toHaveAttribute("href", `mailto:${contact.email}`);
    expect(screen.getByRole("link", { name: new RegExp(contact.phone.replace("+", "\\+")) })).toHaveAttribute("href", contact.phoneHref);
    expect(screen.getByRole("link", { name: /Telegram/ })).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: /Telegram/ })).toHaveAttribute("href", "https://t.me/danishashai");
    expect(screen.getByText("Online only")).toBeInTheDocument();
    expect(screen.queryByText("To be confirmed")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("about shows the newest books and one call to action", async () => {
    vi.spyOn(catalogApi, "books").mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 } } as never);
    app("/about");
    expect(screen.getByRole("heading", { level: 1, name: "A bookshop for Cambodia" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Browse the shelves/ })).toHaveAttribute("href", "/books");
    expect(catalogApi.books).toHaveBeenCalledWith(expect.objectContaining({ sort: "newest" }));
  });
});

describe("legal pages", () => {
  it.each([
    ["/privacy", "Privacy"],
    ["/terms", "Terms of sale"],
  ])("%s is numbered, from Bookly Shop and no longer a draft", (route, title) => {
    app(route);
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(screen.queryByText(/Draft, not yet reviewed/)).not.toBeInTheDocument();
    expect(screen.getByText(/Bookly Shop · Last updated/)).toBeInTheDocument();
    expect(within(screen.getAllByRole("navigation", { name: "On this page" })[0]).getAllByText("1.").length).toBeGreaterThan(0);
  });

  it("terms has the review rules the FAQ links to", () => {
    app("/terms");
    expect(document.getElementById("reviews")).toHaveTextContent("We may hide reviews that");
  });
});

describe("NotFoundPage", () => {
  it("searches the catalogue from an unknown address", async () => {
    const user = userEvent.setup();
    app("/no-such-page");
    expect(screen.getByRole("heading", { level: 1, name: "This page is out of print" })).toBeInTheDocument();
    await user.type(screen.getByRole("searchbox", { name: "Find the book you were looking for" }), "holmes");
    await user.click(screen.getByRole("button", { name: /Find it/ }));
    expect(screen.getByTestId("where")).toHaveTextContent("/search?q=holmes");
  });
});

describe("OfflineBanner", () => {
  it("appears while offline and says when the connection is back", async () => {
    const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    renderWithProviders(
      <>
        <OfflineBanner />
        <Toaster />
      </>,
    );
    act(() => void window.dispatchEvent(new Event("offline")));
    expect(screen.getByRole("status")).toHaveTextContent("You're offline.");
    online.mockReturnValue(true);
    act(() => void window.dispatchEvent(new Event("online")));
    expect(screen.queryByText(/You're offline/)).not.toBeInTheDocument();
    expect(await screen.findByText("Back online")).toBeInTheDocument();
  });
});

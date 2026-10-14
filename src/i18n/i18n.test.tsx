import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getLanguage, setLanguage, translate, useT, en, km } from "./index";
import { LanguageSwitch } from "@/components/shell/LanguageSwitch";
import { SiteHeader } from "@/components/shell/SiteHeader";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>,
  );
}

function TestConsumer() {
  const { lang, dict, t } = useT();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="title">{dict.catalog.title}</span>
      <span data-testid="helper">{t("nav.books")}</span>
    </div>
  );
}

describe("i18n system", () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => {
      setLanguage("en");
    });
  });

  it("useT hook provides current language, dict, and translate helper", () => {
    renderWithProviders(<TestConsumer />);
    expect(screen.getByTestId("lang")).toHaveTextContent("en");
    expect(screen.getByTestId("title")).toHaveTextContent("Books");
    expect(screen.getByTestId("helper")).toHaveTextContent("Books");

    act(() => {
      setLanguage("km");
    });

    expect(screen.getByTestId("lang")).toHaveTextContent("km");
    expect(screen.getByTestId("title")).toHaveTextContent("សៀវភៅ");
    expect(screen.getByTestId("helper")).toHaveTextContent("សៀវភៅ");
  });

  it("persists language to localStorage and updates document.documentElement.lang", () => {
    expect(getLanguage()).toBe("en");
    expect(document.documentElement.lang).toBe("en");

    act(() => {
      setLanguage("km");
    });

    expect(getLanguage()).toBe("km");
    expect(localStorage.getItem("bookly-language")).toBe("km");
    expect(document.documentElement.lang).toBe("km");

    act(() => {
      setLanguage("en");
    });

    expect(getLanguage()).toBe("en");
    expect(localStorage.getItem("bookly-language")).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("translates dot notation keys and falls back to English when missing", () => {
    expect(translate("nav.books", "en")).toBe("Books");
    expect(translate("nav.books", "km")).toBe("សៀវភៅ");

    // Missing key fallback test
    expect(translate("nonexistent.key", "km")).toBe("nonexistent.key");
  });

  it("has matching keys between English and Khmer dictionaries", () => {
    const enKeys = Object.keys(en) as (keyof typeof en)[];
    const kmKeys = Object.keys(km) as (keyof typeof km)[];
    expect(kmKeys).toEqual(enKeys);

    for (const section of enKeys) {
      const enSub = Object.keys(en[section]);
      const kmSub = Object.keys(km[section]);
      expect(kmSub).toEqual(enSub);
    }
  });

  it("switches language via LanguageSwitch component", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LanguageSwitch />);

    const kmRadio = screen.getByRole("radio", { name: "ភាសាខ្មែរ" });
    const enRadio = screen.getByRole("radio", { name: "English" });

    expect(enRadio).toBeChecked();
    expect(kmRadio).not.toBeChecked();

    await user.click(kmRadio);

    expect(getLanguage()).toBe("km");
    expect(kmRadio).toBeChecked();
    expect(enRadio).not.toBeChecked();
    expect(document.documentElement.lang).toBe("km");
  });

  it("renders LanguageSwitch in SiteHeader and updates header navigation on language change", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SiteHeader />);

    // Books link in English
    expect(screen.getByRole("link", { name: "Books" })).toBeInTheDocument();

    const kmRadios = screen.getAllByRole("radio", { name: "ភាសាខ្មែរ" });
    await user.click(kmRadios[0]);

    // Books link in Khmer
    expect(screen.getByRole("link", { name: "សៀវភៅ" })).toBeInTheDocument();
  });
});

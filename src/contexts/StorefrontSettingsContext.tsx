import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import customerService from "../services/customer.service";
import type { StorefrontSettings } from "../types/customer.types";

const defaultStorefrontSettings: StorefrontSettings = {
  store_name: "Bookly",
  support_email: "support@bookly.com",
  support_phone: "+855 12 345 678",
  hero_heading: "Discover Stories That Match Your Mood",
  hero_subheading: "Explore fresh arrivals, trending picks, and timeless classics with a clean shopping experience.",
  free_shipping_threshold: 60,
  shipping_fee: 2,
  tax_rate: 0,
};

interface StorefrontSettingsContextValue {
  settings: StorefrontSettings;
}

const StorefrontSettingsContext = createContext<StorefrontSettingsContextValue>({
  settings: defaultStorefrontSettings,
});

export const StorefrontSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<StorefrontSettings>(defaultStorefrontSettings);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        const nextSettings = await customerService.getStorefrontSettings();
        if (isMounted) {
          setSettings(nextSettings);
        }
      } catch (error) {
        console.error("Unable to load storefront settings, using defaults.", error);
      }
    };

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo(() => ({ settings }), [settings]);

  return (
    <StorefrontSettingsContext.Provider value={value}>
      {children}
    </StorefrontSettingsContext.Provider>
  );
};

export const useStorefrontSettings = () => useContext(StorefrontSettingsContext);

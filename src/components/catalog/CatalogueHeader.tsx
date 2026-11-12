import { useEffect, useLayoutEffect, type ComponentProps } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { PageHeader } from "./PageHeader";
import "./catalogue-v2.css";

/** Catalogue-only presentation and navigation memory; completed product/buying pages keep PageHeader. */
export function CatalogueHeader(props: ComponentProps<typeof PageHeader>) {
  const location = useLocation();
  const navigation = useNavigationType();
  useLayoutEffect(() => {
    const key = `bookly.catalogue.scroll.${location.key}`;
    let target = 0;
    try { target = Number(sessionStorage.getItem(key)) || 0; } catch { /* Storage can be disabled. */ }
    if (navigation !== "POP" || !target) return;
    let attempts = 0;
    const restore = () => {
      window.scrollTo({ top: target, behavior: "instant" });
      return Math.abs(window.scrollY - target) < 2 || ++attempts > 30;
    };
    if (restore()) return;
    const timer = window.setInterval(() => { if (restore()) window.clearInterval(timer); }, 100);
    const cancel = () => window.clearInterval(timer);
    window.addEventListener("pointerdown", cancel, { once: true });
    window.addEventListener("keydown", cancel, { once: true });
    return () => { cancel(); window.removeEventListener("pointerdown", cancel); window.removeEventListener("keydown", cancel); };
  }, [location.key, navigation]);
  useEffect(() => {
    const save = () => {
      try { sessionStorage.setItem(`bookly.catalogue.scroll.${location.key}`, String(window.scrollY)); } catch { /* Optional memory. */ }
    };
    try { sessionStorage.setItem("bookly.last-listing", location.pathname + location.search); } catch { /* Optional memory. */ }
    window.addEventListener("scroll", save, { passive: true });
    return () => window.removeEventListener("scroll", save);
  }, [location.key, location.pathname, location.search]);
  return <div className="catalogue-heading"><PageHeader {...props} covers={props.variant === "panel" ? props.covers : undefined} /></div>;
}

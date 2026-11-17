import { useState } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { frameOf } from "./frame";

/*
 * The route element this transition layer was created with. Without it, the page
 * that is fading out re-renders <Outlet /> with the *new* URL, so the next page
 * briefly exists twice (two h1s, duplicate requests, effects running twice).
 * PageTransition keys each layer by pathname, so every new page gets a fresh
 * FrozenOutlet; search-param changes on the same page still re-render it.
 */
export function FrozenOutlet() {
  const outlet = useOutlet();
  const { pathname } = useLocation();
  const [frozen] = useState(() => ({ outlet, frame: frameOf(pathname) }));
  // Still inside the frame this layer was made for (e.g. moving between account sections): show the live route, so
  // the nested sections change while the frame stays. A layer fading out to another frame keeps its own page.
  return frameOf(pathname) === frozen.frame ? outlet : frozen.outlet;
}

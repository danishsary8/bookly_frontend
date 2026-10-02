import { useState } from "react";
import { useOutlet } from "react-router-dom";

/*
 * The route element this transition layer was created with. Without it, the page
 * that is fading out re-renders <Outlet /> with the *new* URL, so the next page
 * briefly exists twice (two h1s, duplicate requests, effects running twice).
 * PageTransition keys each layer by pathname, so every new page gets a fresh
 * FrozenOutlet; search-param changes on the same page still re-render it.
 */
export function FrozenOutlet() {
  const outlet = useOutlet();
  const [frozen] = useState(outlet);
  return frozen;
}

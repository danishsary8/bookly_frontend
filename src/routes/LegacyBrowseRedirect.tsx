import { Navigate, useLocation } from "react-router-dom";

/** V1's /browse?search=… → V2's /search?q=… (or /books). Keeps old bookmarks and shared links working. */
export default function LegacyBrowseRedirect() {
  const params = new URLSearchParams(useLocation().search);
  const query = params.get("search")?.trim();
  return <Navigate to={query ? `/search?q=${encodeURIComponent(query)}` : "/books"} replace />;
}

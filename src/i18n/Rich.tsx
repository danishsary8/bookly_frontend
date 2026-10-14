import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * Dictionary text with **bold** parts and [links](/path): `<Rich text={dict.telegram.tapStart} strong="font-semibold" />`.
 * Lets a translation move the bold words and links where its grammar needs them.
 */
export function Rich({ text, strong }: { text: string; strong?: string }) {
  const parts: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|\[(.+?)\]\((\/[^)\s]*)\)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > last) parts.push(<Fragment key={last}>{text.slice(last, at)}</Fragment>);
    parts.push(
      match[1] !== undefined ? (
        <strong key={at} className={strong}>
          {match[1]}
        </strong>
      ) : (
        <Link key={at} to={match[3]}>
          {match[2]}
        </Link>
      ),
    );
    last = at + match[0].length;
  }
  if (last < text.length) parts.push(<Fragment key={last}>{text.slice(last)}</Fragment>);
  return <>{parts}</>;
}

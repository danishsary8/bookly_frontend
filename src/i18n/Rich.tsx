import { Fragment } from "react";

/**
 * Dictionary text with **bold** parts: `<Rich text={dict.telegram.tapStart} strong="font-semibold text-foreground" />`.
 * Lets a translation move the bold words where its grammar needs them.
 */
export function Rich({ text, strong }: { text: string; strong?: string }) {
  return (
    <>
      {text.split("**").map((part, i) => (i % 2 === 1 ? <strong key={i} className={strong}>{part}</strong> : <Fragment key={i}>{part}</Fragment>))}
    </>
  );
}

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Accordion } from "radix-ui";
import { useLocation } from "react-router-dom";
import { proseClass } from "./prose";

export type Faq = { id: string; q: string; a: ReactNode };

/*
 * Questions as a disclosure list (several can be open). Each question has its own
 * id, so /faq#cancel-order opens that answer and scrolls to it. No height
 * animation: MASTER animates transform and opacity only.
 */
export function FaqList({ items }: { items: Faq[] }) {
  const { hash } = useLocation();
  const target = hash.slice(1);
  const linked = items.some((i) => i.id === target) ? target : null;
  const [open, setOpen] = useState<string[]>(() => (linked ? [linked] : []));
  const [seen, setSeen] = useState(linked);

  // A new #question in the URL opens that answer (adjusting state while rendering, not in an effect).
  if (linked !== seen) {
    setSeen(linked);
    if (linked && !open.includes(linked)) setOpen([...open, linked]);
  }

  useEffect(() => {
    if (linked) requestAnimationFrame(() => document.getElementById(linked)?.scrollIntoView({ block: "start" }));
  }, [linked]);

  return (
    <Accordion.Root type="multiple" value={open} onValueChange={setOpen} className="grid border-t border-border">
      {items.map((item) => (
        <Accordion.Item key={item.id} value={item.id} id={item.id} className="scroll-mt-[calc(var(--header-h)+1.5rem)] border-b border-border">
          <Accordion.Header asChild>
            <h3 className="font-sans tracking-normal">
              <Accordion.Trigger className="group flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left text-[1.0625rem] font-semibold leading-6 outline-none transition-colors duration-150 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">
                {item.q}
                <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden="true" />
              </Accordion.Trigger>
            </h3>
          </Accordion.Header>
          <Accordion.Content className={proseClass + " pb-5 pr-9 text-foreground/90"}>{item.a}</Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}

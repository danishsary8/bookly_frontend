import { useEffect } from "react";

interface Props {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}

/**
 * Injects a Schema.org JSON-LD structured data script into document head,
 * and removes it when the component unmounts.
 */
export function JsonLd({ data }: Props) {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-testid", "json-ld-script");
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [data]);

  return null;
}

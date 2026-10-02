import { useCallback, useState } from "react";

/**
 * State that a parent may control (`value` + `onChange`) or leave to the component
 * (`defaultValue`). Overlays use it to know whether they are open, so Motion can
 * play the exit animation before Radix unmounts the content.
 */
export function useControllableState<T>(value: T | undefined, defaultValue: T, onChange?: (next: T) => void) {
  const [inner, setInner] = useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : inner;

  const set = useCallback(
    (next: T) => {
      if (!controlled) setInner(next);
      onChange?.(next);
    },
    [controlled, onChange],
  );

  return [current, set] as const;
}

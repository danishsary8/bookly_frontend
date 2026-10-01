const CART_EVENT = "cart-changed";

export const emitCartChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CART_EVENT));
  }
};

export const CART_CHANGED_EVENT = CART_EVENT;

const PENDING_WELCOME_KEY = "bookly-pending-welcome-v1";

export const setPendingWelcome = (message: string) => {
  sessionStorage.setItem(PENDING_WELCOME_KEY, message);
};

export const consumePendingWelcome = (): string | null => {
  const message = sessionStorage.getItem(PENDING_WELCOME_KEY);
  if (message) {
    sessionStorage.removeItem(PENDING_WELCOME_KEY);
  }
  return message;
};

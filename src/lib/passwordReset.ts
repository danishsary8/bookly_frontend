// Carries the reset email from /forgot-password to /reset-password without putting
// it in the URL. Router state is the primary channel; sessionStorage survives a refresh.
const KEY = "bookly-reset-email";

export const rememberResetEmail = (email: string) => {
  try {
    sessionStorage.setItem(KEY, email);
  } catch {
    // Storage unavailable: router state still carries it for this navigation.
  }
};

export const recallResetEmail = (): string => {
  try {
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
};

export const forgetResetEmail = () => {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
};

export const resetErrorMessage = (error: any, fallback: string) => {
  const status = error?.response?.status;
  const message: string = error?.response?.data?.message || "";
  const serverMessage: string = error?.response?.data?.serverMessage || "";
  if (status === 429) return "Too many attempts. Wait 15 minutes, then try again.";
  if (/smtp/i.test(serverMessage) || /smtp/i.test(message)) return "We can't send emails right now. Try again later or contact support.";
  if (!error?.response) return "We couldn't reach Bookly. Check your connection and try again.";
  return message || fallback;
};

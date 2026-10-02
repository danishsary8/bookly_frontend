/*
 * The email a password reset is for, kept in sessionStorage between "forgot
 * password" and "reset password" so a refresh of the second page doesn't lose it.
 * Session-only and cleared on success; it is never sent anywhere but the API.
 */
const KEY = "bookly.resetEmail";

export const rememberResetEmail = (email: string) => {
  try {
    sessionStorage.setItem(KEY, email);
  } catch {
    /* storage blocked: the page falls back to asking for the email */
  }
};

export const recallResetEmail = () => {
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
    /* nothing to clear */
  }
};

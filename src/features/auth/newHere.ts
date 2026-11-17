export const SEEN = "bookly.newHere.seen";

/** Remember that this browser has an account (called after a sign-in), so the note stops showing. */
export const markHasAccount = () => {
  try {
    localStorage.setItem(SEEN, "1");
  } catch {
    /* storage can be off */
  }
};


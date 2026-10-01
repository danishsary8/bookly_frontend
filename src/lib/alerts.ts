import Swal, { type SweetAlertIcon } from "sweetalert2";

/*
 * SweetAlert2 themed to MASTER (§6.5 toasts, dialogs). Visual rules live in
 * index.css under `.swal2-bookly-*`; this file sets behaviour: placement,
 * timing, icon glyphs/colours and screen-reader roles.
 */

const glyph = (paths: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

// Colours are CSS variables so each theme (Daylight / Night) resolves its own measured value.
const ICONS: Record<SweetAlertIcon, { html: string; color: string }> = {
  success: { html: glyph('<path d="M5 12.5l4.5 4.5L19 7.5"/>'), color: "var(--success)" },
  error: { html: glyph('<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5h.01"/>'), color: "var(--destructive)" },
  warning: { html: glyph('<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>'), color: "var(--warning)" },
  info: { html: glyph('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>'), color: "var(--primary)" },
  question: { html: glyph('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6M12 17h.01"/>'), color: "var(--primary)" },
};

const iconOptions = (icon: SweetAlertIcon) => ({ icon, iconHtml: ICONS[icon].html, iconColor: ICONS[icon].color });

const baseOptions = {
  buttonsStyling: false,
  customClass: {
    container: "swal2-bookly-backdrop",
    popup: "swal2-bookly-popup",
    title: "swal2-bookly-title",
    htmlContainer: "swal2-bookly-content",
    confirmButton: "swal2-bookly-confirm",
    cancelButton: "swal2-bookly-cancel",
  },
};

const toast = Swal.mixin({
  toast: true,
  position: "bottom-end",
  showConfirmButton: false,
  showCloseButton: true,
  closeButtonAriaLabel: "Dismiss notification",
  timerProgressBar: true,
  customClass: {
    popup: "swal2-bookly-toast",
    title: "swal2-bookly-toast-title",
    htmlContainer: "swal2-bookly-toast-content",
  },
});

// MASTER §6.5: success/info/warning dismiss after 5s and pause while hovered or
// focused; errors stay until closed and are announced assertively.
const fireToast = (icon: SweetAlertIcon, title: string, text?: string) => {
  const persistent = icon === "error";

  return toast.fire({
    ...iconOptions(icon),
    title,
    text,
    timer: persistent ? undefined : 5000,
    timerProgressBar: !persistent,
    didOpen: (popup) => {
      popup.setAttribute("role", persistent ? "alert" : "status");
      popup.setAttribute("aria-live", persistent ? "assertive" : "polite");

      if (!persistent) {
        popup.addEventListener("mouseenter", Swal.stopTimer);
        popup.addEventListener("mouseleave", Swal.resumeTimer);
        popup.addEventListener("focusin", Swal.stopTimer);
        popup.addEventListener("focusout", Swal.resumeTimer);
      }
    },
  });
};

// A toast with one inline action ("Undo", "View cart"). Resolves true only if the
// action was pressed before the 5s timer (paused on hover/focus) ran out.
const fireActionToast = async (icon: SweetAlertIcon, title: string, text: string | undefined, actionLabel: string) => {
  const result = await toast.fire({
    ...iconOptions(icon),
    title,
    text,
    timer: 5000,
    timerProgressBar: true,
    showConfirmButton: true,
    confirmButtonText: actionLabel,
    buttonsStyling: false,
    customClass: {
      popup: "swal2-bookly-toast",
      title: "swal2-bookly-toast-title",
      htmlContainer: "swal2-bookly-toast-content",
      confirmButton: "swal2-bookly-toast-action",
      actions: "swal2-bookly-toast-actions",
    },
    didOpen: (popup) => {
      popup.setAttribute("role", "status");
      popup.setAttribute("aria-live", "polite");
      popup.addEventListener("mouseenter", Swal.stopTimer);
      popup.addEventListener("mouseleave", Swal.resumeTimer);
      popup.addEventListener("focusin", Swal.stopTimer);
      popup.addEventListener("focusout", Swal.resumeTimer);
    },
  });
  return result.isConfirmed;
};

export const alertToast = {
  success: (title: string, text?: string) => fireToast("success", title, text),
  error: (title: string, text?: string) => fireToast("error", title, text),
  info: (title: string, text?: string) => fireToast("info", title, text),
  warning: (title: string, text?: string) => fireToast("warning", title, text),
  /** e.g. `if (await alertToast.withAction("success", "Removed", title, "Undo")) restore();` */
  withAction: fireActionToast,
};

export const alertModal = {
  success: (options: { title: string; text?: string; html?: string; confirmButtonText?: string; cancelButtonText?: string; showCancelButton?: boolean }) =>
    Swal.fire({
      ...baseOptions,
      ...iconOptions("success"),
      title: options.title,
      text: options.text,
      html: options.html,
      showCancelButton: options.showCancelButton ?? false,
      confirmButtonText: options.confirmButtonText ?? "Continue",
      cancelButtonText: options.cancelButtonText ?? "Close",
    }),
  error: (options: { title: string; text?: string; confirmButtonText?: string }) =>
    Swal.fire({
      ...baseOptions,
      ...iconOptions("error"),
      title: options.title,
      text: options.text,
      confirmButtonText: options.confirmButtonText ?? "Close",
    }),
  info: (options: { title: string; text?: string; confirmButtonText?: string }) =>
    Swal.fire({
      ...baseOptions,
      ...iconOptions("info"),
      title: options.title,
      text: options.text,
      confirmButtonText: options.confirmButtonText ?? "Close",
    }),
};

export default Swal;

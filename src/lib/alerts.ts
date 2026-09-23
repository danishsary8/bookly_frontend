import Swal from "sweetalert2";

const baseOptions = {
  buttonsStyling: false,
  customClass: {
    popup: "swal2-bookly-popup",
    title: "swal2-bookly-title",
    htmlContainer: "swal2-bookly-content",
    confirmButton: "swal2-bookly-confirm",
    cancelButton: "swal2-bookly-cancel",
  },
};

const toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2200,
  timerProgressBar: true,
  customClass: {
    popup: "swal2-bookly-toast",
    title: "swal2-bookly-toast-title",
    htmlContainer: "swal2-bookly-toast-content",
  },
  didOpen: (popup) => {
    popup.addEventListener("mouseenter", Swal.stopTimer);
    popup.addEventListener("mouseleave", Swal.resumeTimer);
  },
});

export const alertToast = {
  success: (title: string, text?: string) => toast.fire({ icon: "success", title, text }),
  error: (title: string, text?: string) => toast.fire({ icon: "error", title, text }),
  info: (title: string, text?: string) => toast.fire({ icon: "info", title, text }),
  warning: (title: string, text?: string) => toast.fire({ icon: "warning", title, text }),
};

export const alertModal = {
  success: (options: { title: string; text?: string; html?: string; confirmButtonText?: string; cancelButtonText?: string; showCancelButton?: boolean }) =>
    Swal.fire({
      ...baseOptions,
      icon: "success",
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
      icon: "error",
      title: options.title,
      text: options.text,
      confirmButtonText: options.confirmButtonText ?? "Close",
    }),
  info: (options: { title: string; text?: string; confirmButtonText?: string }) =>
    Swal.fire({
      ...baseOptions,
      icon: "info",
      title: options.title,
      text: options.text,
      confirmButtonText: options.confirmButtonText ?? "Close",
    }),
};

export default Swal;

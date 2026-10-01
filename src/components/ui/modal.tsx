import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    maxWidthClass?: string;
    showHeader?: boolean;
    bodyClassName?: string;
    children: React.ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/*
 * Dialog frame (MASTER §6, §7): role="dialog" + aria-modal, labelled by its title,
 * Esc and scrim-click close it, Tab is trapped inside, and focus returns to whatever
 * opened it. Frame styling: 10px radius, overlay elevation, 50% navy scrim (no blur).
 * Portaled to <body>: a transformed ancestor (e.g. a route wrapper mid-transition)
 * would otherwise become the containing block for `position: fixed`.
 */
const Modal = ({
    isOpen,
    onClose,
    title,
    maxWidthClass = "max-w-4xl",
    showHeader = true,
    bodyClassName = "max-h-[82vh] overflow-y-auto bg-card p-6",
    children
}: ModalProps) => {
    const titleId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);
    const onCloseRef = useRef(onClose);
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

    useEffect(() => {
        if (!isOpen) return;

        const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const frame = requestAnimationFrame(() => {
            const dialog = dialogRef.current;
            const target = dialog?.querySelector<HTMLElement>("[data-modal-close]") ?? dialog?.querySelector<HTMLElement>(FOCUSABLE) ?? dialog;
            target?.focus();
        });

        const onKeyDown = (event: KeyboardEvent) => {
            // A SweetAlert dialog stacked on top handles its own keys.
            if (document.querySelector(".swal2-popup.swal2-modal.swal2-show")) return;
            const dialog = dialogRef.current;
            if (!dialog) return;
            if (event.key === "Escape") {
                event.stopPropagation();
                onCloseRef.current();
                return;
            }
            if (event.key !== "Tab") return;
            const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
            if (!items.length) { event.preventDefault(); dialog.focus(); return; }
            const first = items[0];
            const last = items[items.length - 1];
            if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener("keydown", onKeyDown);

        return () => {
            cancelAnimationFrame(frame);
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = previousOverflow;
            if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
        };
    }, [isOpen]);

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    {/* Scrim */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="fixed inset-0 bg-[rgb(7_11_34/0.5)]"
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    <motion.div
                        ref={dialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={showHeader ? titleId : undefined}
                        aria-label={showHeader ? undefined : title || "Details"}
                        tabIndex={-1}
                        initial={{ opacity: 0, scale: 0.985, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.985, y: 8, transition: { duration: 0.16 } }}
                        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                        className={`relative w-full ${maxWidthClass} overflow-hidden rounded-xl border border-border bg-card shadow-overlay outline-none`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {showHeader && (
                            <div className="flex items-center justify-between gap-4 border-b border-border bg-card py-2 pl-5 pr-2 sm:pl-6">
                                <h2 id={titleId} className="font-sans text-lg font-semibold tracking-normal text-foreground">
                                    {title || "Details"}
                                </h2>
                                <button
                                    type="button"
                                    data-modal-close
                                    onClick={onClose}
                                    className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-muted-foreground transition-[background-color,color,transform] duration-150 hover:bg-secondary hover:text-foreground active:scale-95 motion-reduce:active:scale-100"
                                    aria-label="Close"
                                >
                                    <X size={20} aria-hidden="true" />
                                </button>
                            </div>
                        )}

                        <div className={bodyClassName}>{children}</div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body,
    );
};

export default Modal;

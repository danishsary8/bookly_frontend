import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

const Modal = ({
    isOpen,
    onClose,
    title,
    maxWidthClass = "max-w-4xl",
    showHeader = true,
    bodyClassName = "max-h-[82vh] overflow-y-auto bg-card/95 p-6",
    children
}: ModalProps) => {
    // Prevent scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
        return () => {
            document.body.style.overflow = "auto";
        };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="fixed inset-0 bg-[rgba(15,23,42,0.24)] backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.985, y: 18 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.985, y: 12 }}
                        transition={{ duration: 0.24, ease: "easeOut" }}
                        className={`relative w-full ${maxWidthClass} overflow-hidden rounded-[28px] border border-border/60 bg-card/95 shadow-[0_28px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {showHeader && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05, duration: 0.24 }}
                                className="flex items-center justify-between border-b border-border/40 bg-card/90 px-5 py-4 sm:px-6"
                            >
                                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                                    {title || "Details"}
                                </h3>
                                <motion.button
                                    onClick={onClose}
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="rounded-2xl border border-border/40 bg-background/70 p-2 text-foreground/60 transition-all duration-150 hover:bg-background hover:text-foreground"
                                    aria-label="Close modal"
                                >
                                    <X size={20} />
                                </motion.button>
                            </motion.div>
                        )}

                        {/* Body */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15, duration: 0.3 }}
                            className={bodyClassName}
                        >
                            {children}
                        </motion.div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default Modal;

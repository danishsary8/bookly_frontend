import React, { useEffect } from "react";
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
    bodyClassName = "p-6 max-h-[80vh] overflow-y-auto bg-white",
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-950/55 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className={`relative w-full ${maxWidthClass} bg-white/95 border border-white/70 rounded-3xl shadow-[0_30px_80px_rgba(15,23,42,0.32)] overflow-hidden animate-in zoom-in-95 fade-in duration-300`}>
                {showHeader && (
                    <div className="flex items-center justify-between p-5 border-b border-slate-200/70 bg-gradient-to-r from-orange-50 to-amber-50">
                        <h3 className="text-xl font-semibold text-slate-900">
                            {title || "Details"}
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-xl hover:bg-white transition-colors text-slate-500 hover:text-slate-900"
                        >
                            <X size={20} />
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className={bodyClassName}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;

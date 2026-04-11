/* eslint-disable react-refresh/only-export-components */
import { useState, useRef, useEffect, useCallback } from 'react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    onCancel: () => void;
}

const variantStyles = {
    danger: {
        icon: '🗑️',
        iconBg: 'bg-red-100',
        button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    },
    warning: {
        icon: '⚠️',
        iconBg: 'bg-yellow-100',
        button: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    },
    info: {
        icon: 'ℹ️',
        iconBg: 'bg-blue-100',
        button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    },
};

export default function ConfirmDialog({
    isOpen,
    title = 'Confirm',
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const [closing, setClosing] = useState(false);
    const cancelRef = useRef<HTMLButtonElement>(null);
    const style = variantStyles[variant];

    const handleClose = useCallback(() => {
        setClosing(true);
        setTimeout(onCancel, 200);
    }, [onCancel]);

    const handleConfirm = useCallback(() => {
        setClosing(true);
        setTimeout(onConfirm, 200);
    }, [onConfirm]);

    useEffect(() => {
        if (isOpen) {
            cancelRef.current?.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, handleClose]);

    if (!isOpen) return null;

    return (
        <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-200 ${closing ? 'opacity-0' : 'opacity-100'}`}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Dialog */}
            <div
                className={`relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all duration-200 ${closing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
            >
                {/* Icon */}
                <div className={`mx-auto w-14 h-14 rounded-full ${style.iconBg} flex items-center justify-center text-2xl mb-4`}>
                    {style.icon}
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
                    {title}
                </h3>

                {/* Message */}
                <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">
                    {message}
                </p>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        ref={cancelRef}
                        onClick={handleClose}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={`flex-1 px-4 py-2.5 rounded-xl text-white font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${style.button}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Hook for easy usage
export function useConfirmDialog() {
    const [state, setState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        variant: 'danger' | 'warning' | 'info';
        confirmLabel: string;
        cancelLabel: string;
        resolve: ((value: boolean) => void) | null;
    }>({
        isOpen: false,
        title: '',
        message: '',
        variant: 'danger',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        resolve: null,
    });

    const confirm = (options: {
        title?: string;
        message: string;
        variant?: 'danger' | 'warning' | 'info';
        confirmLabel?: string;
        cancelLabel?: string;
    }): Promise<boolean> => {
        return new Promise((resolve) => {
            setState({
                isOpen: true,
                title: options.title || 'Confirm',
                message: options.message,
                variant: options.variant || 'danger',
                confirmLabel: options.confirmLabel || 'Confirm',
                cancelLabel: options.cancelLabel || 'Cancel',
                resolve,
            });
        });
    };

    const handleConfirm = () => {
        state.resolve?.(true);
        setState((s) => ({ ...s, isOpen: false, resolve: null }));
    };

    const handleCancel = () => {
        state.resolve?.(false);
        setState((s) => ({ ...s, isOpen: false, resolve: null }));
    };

    const dialogProps: ConfirmDialogProps = {
        isOpen: state.isOpen,
        title: state.title,
        message: state.message,
        variant: state.variant,
        confirmLabel: state.confirmLabel,
        cancelLabel: state.cancelLabel,
        onConfirm: handleConfirm,
        onCancel: handleCancel,
    };

    return {
        confirm,
        ConfirmDialogComponent: () => (
            <ConfirmDialog
                key={`${state.isOpen}-${state.title}-${state.message}`}
                {...dialogProps}
            />
        ),
    };
}

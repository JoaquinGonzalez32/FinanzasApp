/**
 * GlobalToast — single root-mounted Toast host driven by the toastBus.
 *
 * Used for feedback that must survive a screen unmount (e.g. an optimistic
 * mutation that resolves/fails after the user has already navigated away).
 * Screens that are still mounted should keep using the local `useToast` hook.
 */
import { useEffect, useState, useCallback } from 'react';
import Toast from './Toast';
import { toastBus } from '../../src/lib/toastBus';

const HIDDEN = { visible: false, type: 'success', message: '', action: null, onAction: null, duration: undefined };

export default function GlobalToast() {
    const [toast, setToast] = useState(HIDDEN);

    useEffect(() => {
        return toastBus.subscribe((cfg) => {
            setToast({ visible: true, action: null, onAction: null, ...cfg });
        });
    }, []);

    const dismiss = useCallback(() => {
        setToast((prev) => ({ ...prev, visible: false }));
    }, []);

    return (
        <Toast
            visible={toast.visible}
            type={toast.type}
            message={toast.message}
            action={toast.action}
            onAction={toast.onAction}
            onDismiss={dismiss}
            duration={toast.duration}
        />
    );
}

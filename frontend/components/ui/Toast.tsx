export type ToastMessage = { message: string; tone: 'success' | 'error' };

export function Toast({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  return <div className={`toast ${toast.tone}`} role="status" aria-live="polite">
    <span className="toast-icon">{toast.tone === 'success' ? '✓' : '!'}</span>
    <div><strong>{toast.tone === 'success' ? 'Done' : 'Something went wrong'}</strong><small>{toast.message}</small></div>
    <button onClick={onDismiss} aria-label="Dismiss notification">×</button>
  </div>;
}

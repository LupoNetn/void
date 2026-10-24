export type ToastMessage = { message: string; tone: 'success' | 'error' };

export function Toast({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  return <div className={`toast ${toast.tone}`} role="status" aria-live="polite">
    <span className="toast-icon">{toast.tone === 'success' ? <Check size={13}/> : <TriangleAlert size={13}/>}</span>
    <div><strong>{toast.tone === 'success' ? 'Done' : 'Something went wrong'}</strong><small>{toast.message}</small></div>
    <button onClick={onDismiss} aria-label="Dismiss notification"><X size={15}/></button>
  </div>;
}
import { Check, TriangleAlert, X } from 'lucide-react';

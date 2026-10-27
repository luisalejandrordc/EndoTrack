import { useEffect } from "react";
import { Icon } from "./Icon";
import { type Toast } from "./toast";

export function ToastView({
  toast,
  onClose,
}: {
  toast: Toast;
  onClose: () => void;
}) {
  useEffect(() => {
    const id = window.setTimeout(onClose, 4200);
    return () => window.clearTimeout(id);
  }, [toast, onClose]);
  return (
    <div className={`toast toast-${toast.tone}`} role="status">
      <span className="toast-icon">
        <Icon
          name={
            toast.tone === "success"
              ? "check-circle"
              : toast.tone === "error"
                ? "circle-x"
                : "info"
          }
          size={19}
        />
      </span>
      <div>
        <strong>{toast.title}</strong>
        {toast.message && <p>{toast.message}</p>}
      </div>
      <button
        className="icon-button"
        aria-label="Cerrar notificación"
        onClick={onClose}
      >
        <Icon name="x" size={15} />
      </button>
    </div>
  );
}

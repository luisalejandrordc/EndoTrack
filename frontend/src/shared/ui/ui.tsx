import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { errorMessage } from "../api/client";

// ---- Modal (native <dialog>: focus trap, Esc and inert background come for free) ----------------
export function Modal({
  title,
  onClose,
  children,
  footer,
  size,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal${size === "lg" ? " modal-lg" : ""}`}
      aria-labelledby={id}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-body">
        <h2 id={id}>{title}</h2>
        {children}
      </div>
      {footer && <div className="modal-foot">{footer}</div>}
    </dialog>
  );
}

export function ConfirmModal({
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<unknown>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const go = async () => {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            Volver
          </button>
          <button
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={go}
            disabled={busy}
          >
            {busy ? "Procesando…" : confirmLabel}
          </button>
        </>
      }
    >
      <div className="stack">
        {typeof message === "string" ? <p>{message}</p> : message}
        {error && <Banner tone="danger">{error}</Banner>}
      </div>
    </Modal>
  );
}

/** Reason modal: a required text (and, for cancellations, a required category). */
export function ReasonModal({
  title,
  message,
  label = "Motivo",
  categories,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  title: string;
  message?: ReactNode;
  label?: string;
  categories?: { value: string; label: string }[];
  confirmLabel: string;
  danger?: boolean;
  onConfirm: (v: { reason: string; category?: string }) => Promise<unknown>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const textRequired = !categories || category === "otro";
  const valid =
    (!categories || category) && (!textRequired || reason.trim().length > 0);
  const go = async () => {
    setBusy(true);
    setError("");
    try {
      await onConfirm({
        reason: reason.trim(),
        category: categories ? category : undefined,
      });
      onClose();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            Volver
          </button>
          <button
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={go}
            disabled={busy || !valid}
          >
            {busy ? "Procesando…" : confirmLabel}
          </button>
        </>
      }
    >
      <div className="stack">
        {message && <p>{message}</p>}
        {categories && (
          <Field label="Categoría">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Seleccione…</option>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label={textRequired ? label : `${label} (opcional)`}>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        {error && <Banner tone="danger">{error}</Banner>}
      </div>
    </Modal>
  );
}

// ---- small presentational pieces ----------------------------------------------------------------
export type Tone = "neutral" | "info" | "ok" | "warn" | "danger";
export const Badge = ({
  tone = "neutral",
  children,
  title,
}: {
  tone?: Tone;
  children: ReactNode;
  title?: string;
}) => (
  <span className={`badge badge-${tone}`} title={title}>
    {children}
  </span>
);
export const Banner = ({
  tone = "info",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) => (
  <div
    className={`banner banner-${tone}`}
    role={tone === "danger" ? "alert" : "status"}
  >
    {children}
  </div>
);

export function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={`field${error ? " has-error" : ""} ${className ?? ""}`}>
      <label htmlFor={id}>{label}</label>
      <FieldCtl id={id}>{children}</FieldCtl>
      {hint && !error && <small className="hint">{hint}</small>}
      {error && <small className="err">{error}</small>}
    </div>
  );
}
// Gives the wrapped control the label's id without every caller threading it through.
import { Children, cloneElement, isValidElement } from "react";
function FieldCtl({ id, children }: { id: string; children: ReactNode }) {
  return (
    <>
      {Children.map(children, (c) =>
        isValidElement(c) && typeof c.type === "string"
          ? cloneElement(c as any, { id: (c.props as any).id ?? id })
          : c,
      )}
    </>
  );
}

export const Spinner = ({ label = "Cargando…" }: { label?: string }) => (
  <div className="spinner-row" role="status">
    <span className="spinner" aria-hidden />
    {label}
  </div>
);
export const Skeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="skeleton-stack" aria-busy="true">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="skeleton" />
    ))}
  </div>
);
export const Empty = ({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) => (
  <div className="empty">
    <strong>{title}</strong>
    {children && <div>{children}</div>}
  </div>
);
export const PageHeader = ({
  title,
  children,
  sub,
}: {
  title: string;
  sub?: ReactNode;
  children?: ReactNode;
}) => (
  <div className="page-head">
    <div>
      <h1>{title}</h1>
      {sub && <p className="muted">{sub}</p>}
    </div>
    <div className="row">{children}</div>
  </div>
);

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  return (
    <nav className="pager" aria-label="Paginación">
      <span className="muted">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de{" "}
        {total}
      </span>
      <div className="row">
        <button
          className="btn btn-sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Anterior
        </button>
        <span>
          Página {page} de {pages}
        </span>
        <button
          className="btn btn-sm"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Siguiente
        </button>
      </div>
    </nav>
  );
}

// ---- toasts -------------------------------------------------------------------------------------
type Toast = { id: number; msg: string; tone: Tone };
const ToastCtx = createContext<(msg: string, tone?: Tone) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((msg: string, tone: Tone = "ok") => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, msg, tone }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 4500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/** Warns before the tab closes while a form has unsaved changes. */
export function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);
}

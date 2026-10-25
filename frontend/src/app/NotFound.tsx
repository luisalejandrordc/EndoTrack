import { Link } from "react-router-dom";

// Also used for out-of-scope records, so the existence of a record never leaks (IA §3).
export function NotFoundPage() {
  return (
    <div className="empty empty-page">
      <strong>No encontrado</strong>
      <p>La página o el registro no existe, o no tiene acceso a él.</p>
      <Link className="btn btn-primary" to="/ventas">Ir a Ventas</Link>
    </div>
  );
}

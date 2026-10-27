import { Icon } from "./Icon";

export function ApiGap({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="api-gap-card">
      <div className="api-gap-icon">
        <Icon name="database" size={26} />
      </div>
      <span className="section-kicker">MÓDULO EN INTEGRACIÓN</span>
      <h2>{title}</h2>
      <p>{detail}</p>
      <div className="api-gap-foot">
        <span>
          <Icon name="shield-check" size={16} /> El cliente no realizará
          llamadas a rutas no documentadas.
        </span>
        <span className="soft-badge">API-FIRST</span>
      </div>
    </div>
  );
}

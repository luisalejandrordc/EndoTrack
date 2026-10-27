import { Icon, type IconName } from "./Icon";

export function MetricCard({
  label,
  value,
  detail,
  icon,
  tone,
  change,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: IconName;
  tone: string;
  change?: string;
}) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}>
        <Icon name={icon} size={19} />
      </div>
      <div className="metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>
          {change && <b>{change}</b>}
          {detail}
        </small>
      </div>
      <span className="metric-trend">
        <Icon name="arrow-up-right" size={16} />
      </span>
    </article>
  );
}

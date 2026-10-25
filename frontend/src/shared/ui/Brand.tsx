export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`}>
      <div className="brand-mark">
        <span>E</span>
        <span>F</span>
      </div>
      {!compact && (
        <div className="brand-wordmark">
          <strong>EndosoFlow</strong>
          <span>GRUPO PANA</span>
        </div>
      )}
    </div>
  );
}

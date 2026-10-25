// Money travels as strings with two decimals (API convention). Arithmetic is done in integer cents.
export const toCents = (v?: string | null) => {
  if (!v) return 0;
  const n = Math.round(parseFloat(v.replace(/,/g, "")) * 100);
  return Number.isFinite(n) ? n : 0;
};
export const fromCents = (c: number) => (c / 100).toFixed(2);
export const money = (v?: string | number | null) => {
  if (v === undefined || v === null || v === "") return "—";
  const cents = typeof v === "number" ? v : toCents(v);
  return (
    "US$ " +
    (cents / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
};
const dtf = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const dttf = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
export const fmtDate = (v?: string | null) =>
  v ? dtf.format(new Date(v.length === 10 ? v + "T12:00:00" : v)) : "—";
export const fmtDateTime = (v?: string | null) =>
  v ? dttf.format(new Date(v)) : "—";
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const initials = (first: string, last: string) =>
  ((first[0] ?? "") + (last[0] ?? "")).toUpperCase();
export const fullName = (p: { firstName: string; lastName: string }) =>
  `${p.firstName} ${p.lastName}`;

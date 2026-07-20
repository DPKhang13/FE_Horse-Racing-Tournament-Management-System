export const fmtInt = (n: number) => n.toLocaleString("en-US");

export const fmtPoints = (n: number) => `${n.toLocaleString("en-US")} pts`;

export const fmtVND = (n: number) => `${Math.round(n).toLocaleString("en-US")} ₫`;

export const fmtCompact = (n: number) => {
  if (Math.abs(n) >= 1_000_000_000)
    return `${(n / 1_000_000_000).toFixed(n % 1_000_000_000 === 0 ? 0 : 1)}B`;
  if (Math.abs(n) >= 1_000_000)
    return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (Math.abs(n) >= 1_000)
    return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return `${n}`;
};

export const fmtVNDcompact = (n: number) => `${fmtCompact(n)} ₫`;

export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const fmtDateShort = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

export const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const fmtDateTime = (iso: string) => `${fmtDate(iso)} · ${fmtTime(iso)}`;

export const relativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return fmtDateShort(iso);
};

export const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

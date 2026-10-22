import type { AiBudgetPeriod } from "./contracts";

const calendar = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
});
const offset = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  timeZoneName: "longOffset",
});

function londonMonthStart(year: number, month: number) {
  const utc = Date.UTC(year, month, 1);
  const zone = offset
    .formatToParts(new Date(utc))
    .find((part) => part.type === "timeZoneName")!.value;
  const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(zone);
  const minutes = match
    ? (Number(match[2]) * 60 + Number(match[3])) * (match[1] === "+" ? 1 : -1)
    : 0;
  return new Date(utc - minutes * 60_000);
}

export function aiBudgetPeriod(at: Date): AiBudgetPeriod {
  const parts = calendar.formatToParts(at);
  const year = Number(parts.find((part) => part.type === "year")!.value);
  const month = Number(parts.find((part) => part.type === "month")!.value);
  return {
    key: `${year}-${String(month).padStart(2, "0")}`,
    startsAt: londonMonthStart(year, month - 1),
    endsAt: londonMonthStart(year, month),
  };
}

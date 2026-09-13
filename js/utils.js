import { state } from "./state.js";

export function parseDateString(rawStr) {
  if (!rawStr || typeof rawStr !== "string") return null;
  const str = rawStr.trim().split(" ")[0];
  const match = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) - 1;
    const d = parseInt(match[3], 10);
    const dt = new Date(y, m, d);
    return isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}

export function formatDateToYMD(d) {
  if (!d || isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatOffsetDate(offsetDay, shortFormat = false) {
  if (!state.baseDate || isNaN(state.baseDate.getTime())) return `D+${offsetDay}`;
  const d = new Date(state.baseDate.getTime());
  d.setDate(d.getDate() + offsetDay);
  if (isNaN(d.getTime())) return `D+${offsetDay}`;
  
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return shortFormat ? `${m}/${day}` : `${y}/${m}/${day}`;
}

export function getTodayOffsetDays() {
  if (!state.baseDate || isNaN(state.baseDate.getTime())) return null;
  const now = new Date();
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const baseOnly = new Date(state.baseDate.getFullYear(), state.baseDate.getMonth(), state.baseDate.getDate());
  const diffTime = todayOnly.getTime() - baseOnly.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

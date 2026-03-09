/** Simple moving average over `window` periods. Returns array same length as input (first values are partial averages). */
export function movingAverage(values: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return result;
}

/** Percent change from a to b. Returns 0 if a is 0. */
export function percentChange(a: number, b: number): number {
  if (a === 0) return b === 0 ? 0 : 100;
  return ((b - a) / Math.abs(a)) * 100;
}

/** Detect direction from an array of values (last `n` values). */
export function detectDirection(
  values: number[],
  minConsecutive = 3,
): { direction: "up" | "down" | "stable"; consecutiveMonths: number } {
  if (values.length < 2) return { direction: "stable", consecutiveMonths: 0 };

  let upCount = 0;
  let downCount = 0;

  for (let i = values.length - 1; i > 0; i--) {
    if (values[i] > values[i - 1]) {
      if (downCount > 0) break;
      upCount++;
    } else if (values[i] < values[i - 1]) {
      if (upCount > 0) break;
      downCount++;
    } else {
      break;
    }
  }

  if (upCount >= minConsecutive) return { direction: "up", consecutiveMonths: upCount };
  if (downCount >= minConsecutive) return { direction: "down", consecutiveMonths: downCount };
  return { direction: "stable", consecutiveMonths: 0 };
}

/** Check if a value is a spike (exceeds average by threshold %). */
export function isSpike(
  current: number,
  average: number,
  thresholdPercent = 40,
): boolean {
  if (average <= 0) return false;
  return ((current - average) / average) * 100 > thresholdPercent;
}

/** Safe division — returns 0 when denominator is 0. */
export function safeDivide(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

/** Savings rate: percent of income not spent. Returns 0 if no income. */
export function savingsRate(income: number, expense: number): number {
  if (income <= 0) return 0;
  return Math.max(0, ((income - expense) / income) * 100);
}

/** Short month label from "YYYY-MM" → "Ene", "Feb", etc. */
const SHORT_MONTHS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export function shortMonthLabel(month: string): string {
  const m = parseInt(month.split("-")[1], 10);
  return SHORT_MONTHS[m - 1] ?? month;
}

/** Generate array of month strings from start to end (inclusive). */
export function monthRange(startMonth: string, endMonth: string): string[] {
  const months: string[] = [];
  let [y, m] = startMonth.split("-").map(Number);
  const [ey, em] = endMonth.split("-").map(Number);

  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

/** Shift a "YYYY-MM" month string by `delta` months. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Get current month as "YYYY-MM". */
export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Get first and last day of a month string. */
export function monthBounds(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    start: `${month}-01`,
    end: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

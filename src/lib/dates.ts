export interface YearMonth {
  year: number;
  month: number; // 1-12
}

export const MONTH_NAMES_PL = [
  'styczeń',
  'luty',
  'marzec',
  'kwiecień',
  'maj',
  'czerwiec',
  'lipiec',
  'sierpień',
  'wrzesień',
  'październik',
  'listopad',
  'grudzień',
];

export function addMonths(ym: YearMonth, delta: number): YearMonth {
  const total = ym.year * 12 + (ym.month - 1) + delta;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return { year, month };
}

export function ymToIndex(ym: YearMonth): number {
  return ym.year * 12 + ym.month;
}

export function ymEqual(a: YearMonth, b: YearMonth): boolean {
  return a.year === b.year && a.month === b.month;
}

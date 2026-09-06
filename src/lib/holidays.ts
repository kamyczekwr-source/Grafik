// Polskie święta ustawowo wolne od pracy.
// Święta ruchome (Wielkanoc i pochodne) trzeba doliczać rocznie - tu obliczane algorytmem Gaussa.

function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function getPolishHolidays(year: number): Set<string> {
  const easter = easterSunday(year);
  const fixed = [
    `${year}-01-01`, // Nowy Rok
    `${year}-01-06`, // Trzech Króli
    `${year}-05-01`, // Święto Pracy
    `${year}-05-03`, // Święto Konstytucji 3 Maja
    `${year}-08-15`, // Wniebowzięcie NMP
    `${year}-11-01`, // Wszystkich Świętych
    `${year}-11-11`, // Święto Niepodległości
    `${year}-12-25`, // Boże Narodzenie
    `${year}-12-26`, // Drugi dzień Świąt
  ];
  const movable = [
    fmt(easter), // Wielkanoc
    fmt(addDays(easter, 1)), // Poniedziałek Wielkanocny
    fmt(addDays(easter, 49)), // Zielone Świątki
    fmt(addDays(easter, 60)), // Boże Ciało
  ];
  return new Set([...fixed, ...movable]);
}

export function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function isFreeDay(dateStr: string, holidays: Set<string>): boolean {
  return isWeekend(dateStr) || holidays.has(dateStr);
}

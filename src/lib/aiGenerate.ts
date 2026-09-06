import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Employee, ShiftCode, ShiftEntry, MonthSchedule } from '../types';
import { daysInMonth } from './rules';

// Wklej swój klucz Gemini API (aistudio.google.com/app/apikey) do zmiennej środowiskowej
// VITE_GEMINI_API_KEY (plik .env w katalogu głównym projektu, patrz README).
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

const VALID_CODES: ShiftCode[] = ['6-14', '14-22', '22-6', 'W'];

export interface AiGenerateResult {
  entries: ShiftEntry[];
  note?: string;
}

/**
 * Wysyła do Gemini opis słowny (np. "Fokt chce mieć wolne weekendy w połowie miesiąca")
 * razem z listą pracowników, regułami (12h przerwy, 1 osoba na zmianę, wyjątki x2) i prosi
 * o wygenerowanie całego miesiąca w formacie JSON. Zwraca listę ShiftEntry gotową do zapisu.
 */
export async function generateScheduleWithAi(
  employees: Employee[],
  year: number,
  month: number,
  specialStaffing: MonthSchedule['specialStaffing'],
  instructions: string,
): Promise<AiGenerateResult> {
  if (!API_KEY) {
    throw new Error(
      'Brak klucza Gemini API. Ustaw VITE_GEMINI_API_KEY w pliku .env (patrz README) i przebuduj/wdróż aplikację ponownie.',
    );
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const days = daysInMonth(year, month);
  const employeeList = employees.map((e) => `- id: "${e.id}", imię: "${e.name}", etat: ${e.etat}`).join('\n');
  const doubleStaffed = Object.entries(specialStaffing)
    .flatMap(([date, shifts]) =>
      Object.entries(shifts ?? {}).map(([code]) => `${date} (${code}): wymagane 2 osoby`),
    )
    .join('\n') || '(brak)';

  const prompt = `Jesteś generatorem grafiku pracy recepcji. Miesiąc: ${month}/${year} (${days} dni).

Pracownicy:
${employeeList}

Zasady twarde (MUSISZ ich przestrzegać):
1. Zmiany: "6-14", "14-22", "22-6" lub "W" (wolne).
2. Domyślnie dokładnie 1 osoba na każdą zmianę każdego dnia, chyba że dzień jest na liście podwójnej obsady poniżej - wtedy 2 różne osoby.
3. Między końcem jednej zmiany a początkiem następnej zmiany tej samej osoby musi być min. 12 godzin przerwy (np. po zmianie 22-6 osoba nie może zaczynać kolejnej zmiany wcześniej niż o 18:00 tego samego dnia).
4. Każdy dzień powinien mieć obsadzone wszystkie 3 zmiany.
5. Staraj się rozkładać godziny w miarę równo między pracownikami, proporcjonalnie do etatu.

Dni z podwójną obsadą:
${doubleStaffed}

Dodatkowe wytyczne od użytkownika (mogą precyzować preferencje, dni wolne konkretnych osób itp. - zastosuj je, o ile nie łamią zasad twardych powyżej):
"""
${instructions}
"""

Zwróć WYŁĄCZNIE poprawny JSON (bez markdown, bez komentarzy, bez dodatkowego tekstu) w formacie:
{"entries":[{"date":"YYYY-MM-DD","employeeId":"...","code":"6-14|14-22|22-6","slotIndex":0},...],"note":"krótka uwaga po polsku, np. jeśli czegoś nie dało się spełnić"}

Uwzględnij wpisy tylko dla dni, w których dana osoba pracuje (nie dodawaj wpisów dla "W").`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const jsonText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');

  let parsed: { entries: Array<{ date: string; employeeId: string; code: string; slotIndex?: number }>; note?: string };
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Gemini zwróciło odpowiedź w nieoczekiwanym formacie. Spróbuj ponownie lub doprecyzuj polecenie.');
  }

  const validEmployeeIds = new Set(employees.map((e) => e.id));
  const entries: ShiftEntry[] = parsed.entries
    .filter(
      (e) =>
        validEmployeeIds.has(e.employeeId) &&
        VALID_CODES.includes(e.code as ShiftCode) &&
        e.code !== 'W' &&
        e.date.startsWith(`${year}-${String(month).padStart(2, '0')}`),
    )
    .map((e) => ({
      date: e.date,
      employeeId: e.employeeId,
      code: e.code as ShiftCode,
      slotIndex: (e.slotIndex === 1 ? 1 : 0) as 0 | 1,
    }));

  return { entries, note: parsed.note };
}

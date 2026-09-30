import type { Employee, ShiftCode, ShiftEntry } from '../types';
import { daysInMonth } from './rules';
import { generateJsonText } from './gemini';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const VALID_CODES: ShiftCode[] = ['6-14', '14-22', '22-6', 'W'];

export interface PhotoImportResult {
  entries: ShiftEntry[];
  note?: string;
}

function readAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(new Error('Nie udało się odczytać pliku zdjęcia.'));
    reader.readAsDataURL(blob);
  });
}

// Zmniejsza duże zdjęcia z telefonu (max 2000 px, JPEG) - mniejsze żądanie, mniej błędów.
// Jeśli przeglądarka nie potrafi zdekodować pliku (np. HEIC), wysyła oryginał.
async function prepareImage(file: File): Promise<{ data: string; mimeType: string }> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob: Blob = await new Promise((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/jpeg', 0.85),
    );
    return { data: await readAsBase64(blob), mimeType: 'image/jpeg' };
  } catch {
    return { data: await readAsBase64(file), mimeType: file.type || 'image/jpeg' };
  }
}

/**
 * Wysyła zdjęcie papierowego grafiku do Gemini (multimodalnie) i prosi o odczytanie
 * tabeli w formacie: blok kolumn na osobę, w każdym blok - numer dnia, kod zmiany, godziny.
 * Zwraca listę ShiftEntry gotową do zastosowania w wybranym miesiącu/roku.
 */
export async function importScheduleFromPhoto(
  file: File,
  employees: Employee[],
  year: number,
  month: number,
): Promise<PhotoImportResult> {
  if (!API_KEY) {
    throw new Error(
      'Brak klucza Gemini API. Ustaw VITE_GEMINI_API_KEY w pliku .env / zmiennych środowiskowych Vercel i przebuduj aplikację.',
    );
  }

  const image = await prepareImage(file);
  const days = daysInMonth(year, month);
  const employeeList = employees.map((e) => `- id: "${e.id}", imię i nazwisko na grafiku: "${e.name}"`).join('\n');

  const prompt = `To jest zdjęcie papierowego grafiku pracy recepcji. Format dokumentu: osobny blok kolumn dla każdej osoby (nagłówek z nazwiskiem), a w każdym bloku wiersze z numerem dnia miesiąca (1-${days}), kodem zmiany ("6-14", "14-22", "22-6" lub puste/"W" dla dnia wolnego) i liczbą godzin (zwykle "8").

Miesiąc do którego ma się odnosić ten grafik: ${month}/${year}.

Lista pracowników i ich id w systemie (dopasuj nazwiska ze zdjęcia do tych osób, mogą być zapisane skrótowo np. "I. Forysiak" albo samym nazwiskiem):
${employeeList}

Odczytaj CAŁĄ tabelę ze zdjęcia, dzień po dniu, dla każdej osoby. Zwróć WYŁĄCZNIE poprawny JSON (bez markdown, bez komentarzy) w formacie:
{"entries":[{"date":"YYYY-MM-DD","employeeId":"...","code":"6-14|14-22|22-6","slotIndex":0}],"note":"krótka uwaga po polsku, np. które komórki były nieczytelne lub czego nie udało się jednoznacznie odczytać"}

Nie dodawaj wpisów dla dni wolnych ("W" lub puste pole). Jeśli jakaś komórka jest nieczytelna, pomiń ją i wspomnij o tym w "note".`;

  const text = (
    await generateJsonText(API_KEY, [{ inlineData: { data: image.data, mimeType: image.mimeType } }, { text: prompt }])
  ).trim();
  const jsonText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');

  let parsed: { entries: Array<{ date: string; employeeId: string; code: string; slotIndex?: number }>; note?: string };
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Gemini zwróciło odpowiedź w nieoczekiwanym formacie. Spróbuj wyraźniejsze zdjęcie lub inny kadr.');
  }

  const validEmployeeIds = new Set(employees.map((e) => e.id));
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const entries: ShiftEntry[] = parsed.entries
    .filter(
      (e) =>
        validEmployeeIds.has(e.employeeId) &&
        VALID_CODES.includes(e.code as ShiftCode) &&
        e.code !== 'W' &&
        e.date.startsWith(monthPrefix),
    )
    .map((e) => ({
      date: e.date,
      employeeId: e.employeeId,
      code: e.code as ShiftCode,
      slotIndex: (e.slotIndex === 1 ? 1 : 0) as 0 | 1,
    }));

  return { entries, note: parsed.note };
}

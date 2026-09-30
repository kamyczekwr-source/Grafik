import { GoogleGenerativeAI, type Part } from '@google/generative-ai';

// Modele próbowane po kolei. Gdy jeden jest przeciążony (503) albo niedostępny (404),
// aplikacja automatycznie przechodzi do następnego. Nazwy w jednym miejscu, żeby łatwo je zmienić.
const MODELS = ['gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-3.1-flash-lite'];
const RETRIES_PER_MODEL = 1;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

const isOverloaded = (err: unknown) => /\[(429|500|502|503|504)\b/.test(errorMessage(err));
const isNotFound = (err: unknown) => /\[404\b/.test(errorMessage(err));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Wysyła zapytanie do Gemini i zwraca surowy tekst odpowiedzi (JSON). */
export async function generateJsonText(apiKey: string, parts: Array<string | Part>): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError: unknown;

  for (const name of MODELS) {
    const model = genAI.getGenerativeModel({
      model: name,
      generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 16384 },
    });

    for (let attempt = 0; attempt <= RETRIES_PER_MODEL; attempt++) {
      try {
        const result = await model.generateContent(parts);
        return result.response.text();
      } catch (err) {
        lastError = err;
        if (isNotFound(err)) break; // model nie istnieje - od razu następny
        if (!isOverloaded(err)) throw err; // inny błąd (np. zły klucz) - nie ma sensu ponawiać
        if (attempt < RETRIES_PER_MODEL) await sleep(2000);
      }
    }
  }

  throw new Error(
    `Serwery Gemini są teraz przeciążone. Spróbuj ponownie za minutę. (${errorMessage(lastError).slice(0, 120)})`,
  );
}

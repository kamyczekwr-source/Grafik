# Grafik recepcji

Aplikacja do układania grafiku pracy recepcji (3-miesięczny okres rozliczeniowy, zmianowość 6-14/14-22/22-6).

## Co robi

- Tabela grafiku w układzie 1:1 jak papierowy dokument (blok kolumn na osobę: dzień / zmiana / godziny)
- Automatyczne oznaczanie weekendów i polskich świąt ustawowych
- Walidacja min. 12h przerwy między zmianami (czerwone podświetlenie komórki)
- Licznik godzin na osobę + bilans względem normy w całym 3-miesięcznym okresie rozliczeniowym
- Podwójna obsada zmiany — przycisk "x2" przy komórce, elastycznie per dzień i zmiana
- Dwa tryby: **Ręczny** (klikasz i wybierasz zmianę) oraz **Auto** (algorytm proponuje cały miesiąc, wyrównując godziny; wynik można poprawić ręcznie)
- **Generowanie przez AI (Gemini)** — opisujesz słownie, jak ma wyglądać grafik (np. czyjeś preferencje, dni wolne), a Gemini generuje cały miesiąc respektując reguły
- **Cofnij / Wyczyść grafik** — cofa ostatnią zmianę (do 20 kroków wstecz) albo czyści cały bieżący miesiąc
- **Widok pracownika** — zakładka "Pracownicy" pokazuje listę, klik w osobę pokazuje jej indywidualny grafik na dany miesiąc
- **Dowolna nawigacja miesięcy** — strzałki ‹ › pozwalają przejść do dowolnego miesiąca (wstecz też), niezależnie od okresu rozliczeniowego
- **Konfigurowalny okres rozliczeniowy** — przycisk "Okres rozliczeniowy ✎" pozwala ustawić, od którego miesiąca zaczyna się bieżący 3-miesięczny okres (bilans liczy się od tego miesiąca)
- **Drukuj / Wyślij mailem / Udostępnij** — drukowanie przez przeglądarkę (ukrywa przyciski, zostawia tylko grafik), mailto: z tekstowym podsumowaniem grafiku, oraz natywne "Udostępnij" na telefonie (Web Share API)
- **Wczytaj ze zdjęcia** — zrób zdjęcie papierowego grafiku (np. telefonem), AI (Gemini, multimodalnie) odczytuje tabelę i wstawia zmiany do wybranego miesiąca; wymaga tego samego klucza Gemini co generowanie AI
- **Norma godzin** — przycisk "Norma godzin ✎" pozwala wybrać: automatyczne wyliczanie (dni robocze × 8h) albo ręczne wpisanie liczby godzin dla każdego miesiąca (np. z oficjalnej tabeli wymiaru czasu pracy) — używane wszędzie tam, gdzie liczony jest bilans

## Klucz Gemini API (opcjonalnie, do generowania AI)

1. Wejdź na [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) i wygeneruj darmowy klucz API
2. Lokalnie: skopiuj `.env.example` do `.env` i wklej klucz jako `VITE_GEMINI_API_KEY=...`
3. Na Vercel: Project Settings → Environment Variables → dodaj `VITE_GEMINI_API_KEY` z tą samą wartością, potem zrób redeploy (Deployments → ... → Redeploy)

Bez tego klucza reszta aplikacji działa normalnie — przycisk "Generuj z AI" po prostu pokaże komunikat o braku klucza.

## Uruchomienie lokalnie

```bash
npm install
npm run dev
```

## Konfiguracja Firebase

1. Załóż projekt na [console.firebase.google.com](https://console.firebase.google.com)
2. Włącz Firestore (Build → Firestore Database → Create database)
3. Włącz logowanie e-mail/hasło: Build → Authentication → Sign-in method → Email/Password → Enable
4. W Authentication → Users dodaj konta dla osób, które mają układać grafik (Ty, dyrektor itd.)
5. Skopiuj dane konfiguracyjne (Project settings → General → Your apps → Web app) do `src/firebase.ts`
6. Wdróż `firestore.rules` z tego repo (Firestore → Rules → wklej zawartość pliku i opublikuj) — bez tego po 30 dniach trybu testowego dostęp do bazy zostanie zablokowany

## Logowanie

Aplikacja wymaga zalogowania (e-mail/hasło) przed pokazaniem grafiku. Konta zakłada się ręcznie w konsoli Firebase (Authentication → Users → Add user) — nie ma rejestracji z poziomu aplikacji.

## Wdrożenie na GitHub Pages / Vercel

Projekt to standardowa aplikacja Vite — `npm run build` tworzy folder `dist/`, który można wdrożyć na dowolnym hostingu statycznym (Vercel, Netlify, GitHub Pages, Firebase Hosting).

## Struktura kodu

- `src/types.ts` — modele danych (pracownik, zmiana, harmonogram miesiąca)
- `src/lib/holidays.ts` — polskie święta ustawowe + wykrywanie weekendów
- `src/lib/rules.ts` — silnik reguł: norma godzin, walidacja 12h przerwy, bilans kwartalny
- `src/lib/autoGenerate.ts` — algorytm auto-generowania grafiku
- `src/lib/storage.ts` — zapis/odczyt z Firestore
- `src/lib/auth.ts` — logowanie/wylogowanie (Firebase Authentication)
- `src/components/LoginScreen.tsx` — ekran logowania
- `src/components/ScheduleTable.tsx` — tabela grafiku (widok + edycja)
- `src/App.tsx` — spina wszystko, przełącznik trybu ręczny/auto
- `firestore.rules` — reguły dostępu do bazy (tylko zalogowani użytkownicy)

## Do dopracowania w kolejnych krokach

- Edycja listy pracowników z poziomu UI (obecnie edytowalna w `src/App.tsx` / bezpośrednio w Firestore)
- Wybór, który miesiąc jest pierwszym miesiącem okresu rozliczeniowego (obecnie stała `PERIOD_START_MONTH` w `App.tsx`)
- Eksport grafiku do PDF/druku w układzie identycznym z papierowym dokumentem

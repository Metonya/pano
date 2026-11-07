import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, type ReactNode, useState } from "react";
import { type Language, language, setLanguage } from "@/lib/i18n";
export const LanguageContext = createContext<
  (language: Language) => Promise<void>
>(async () => {});

import { BrowserRouter } from "react-router-dom";

const client = new QueryClient();
export function Providers({ children }: Readonly<{ children: ReactNode }>) {
  const [, setLang] = useState(language);
  return (
    // A new function on every language change also re-renders its consumers.
    <LanguageContext.Provider
      value={async (value) => {
        await setLanguage(value);
        setLang(language());
      }}
    >
      <QueryClientProvider client={client}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    </LanguageContext.Provider>
  );
}

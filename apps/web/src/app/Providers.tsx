import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, type ReactNode, useState } from "react";
import { type Language, language } from "@/lib/i18n";
export const LanguageContext = createContext<(language: Language) => void>(
  () => {},
);

import { BrowserRouter } from "react-router-dom";

const client = new QueryClient();
export function Providers({ children }: { children: ReactNode }) {
  const [, setLang] = useState(language);
  return (
    // A new function on every language change also re-renders its consumers.
    <LanguageContext.Provider
      value={(value) => {
        localStorage.setItem("pano-language", value);
        document.documentElement.lang = value;
        setLang(value);
      }}
    >
      <QueryClientProvider client={client}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    </LanguageContext.Provider>
  );
}

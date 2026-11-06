import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { Providers } from "./app/Providers";
import "./style.css";
import { initializeLanguage } from "./lib/i18n";

void initializeLanguage().then(() => {
  const root = document.getElementById("root");
  if (root)
    createRoot(root).render(
      <Providers>
        <App />
      </Providers>,
    );
});

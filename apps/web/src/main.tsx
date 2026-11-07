import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { Providers } from "./app/Providers";
import "./style.css";
import { ensureUser } from "./lib/api";
import { initializeLanguage } from "./lib/i18n";

void Promise.all([initializeLanguage(), ensureUser()]).then(() => {
  const root = document.getElementById("root");
  if (root)
    createRoot(root).render(
      <Providers>
        <App />
      </Providers>,
    );
});

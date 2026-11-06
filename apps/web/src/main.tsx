import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { Providers } from "./app/Providers";
import "./style.css";

const root = document.getElementById("root");
if (root)
  createRoot(root).render(
    <Providers>
      <App />
    </Providers>,
  );

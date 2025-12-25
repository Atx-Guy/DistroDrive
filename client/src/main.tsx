import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "@fontsource/inter";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/jetbrains-mono";

createRoot(document.getElementById("root")!).render(<App />);

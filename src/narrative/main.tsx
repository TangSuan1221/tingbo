import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import NarrativeEditor from "./NarrativeEditor";
import "./narrative.css";

createRoot(document.getElementById("narrative-root")!).render(
  <StrictMode>
    <NarrativeEditor />
  </StrictMode>
);

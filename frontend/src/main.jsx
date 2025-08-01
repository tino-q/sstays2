import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

const useLocal = import.meta.env.VITE_USE_LOCAL === "true";

ReactDOM.createRoot(document.getElementById("root")).render(
  useLocal ? (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  ) : (
    <App />
  )
);

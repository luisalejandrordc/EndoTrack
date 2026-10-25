import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/public-sans";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import { AuthProvider } from "./features/auth/AuthContext";
import { ApiError } from "./shared/api/client";
import { ToastProvider } from "./shared/ui/ui";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      refetchOnWindowFocus: false,
      // Rule violations and permission errors will not change on retry; only network hiccups do.
      retry: (n, e) =>
        e instanceof ApiError && e.status !== 0 && e.status < 500
          ? false
          : n < 2,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

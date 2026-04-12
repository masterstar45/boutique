import { createRoot } from "react-dom/client";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

const envApiBaseUrl = typeof import.meta.env.VITE_API_BASE_URL === "string"
	? import.meta.env.VITE_API_BASE_URL.trim()
	: "";

const runtimeFallbackApiBaseUrl =
	typeof window !== "undefined" && window.location.hostname !== "localhost" && !window.location.hostname.startsWith("127.")
		? "https://api-server-production-823c.up.railway.app"
		: "";

const apiBaseUrl = envApiBaseUrl || runtimeFallbackApiBaseUrl;

// Expose API base URL globally for use in hooks
if (typeof window !== "undefined") {
	(window as any).__API_BASE_URL = apiBaseUrl;
}

if (apiBaseUrl) {
	setBaseUrl(apiBaseUrl);
}

setAuthTokenGetter(() => localStorage.getItem("bankdata_token"));

createRoot(document.getElementById("root")!).render(<App />);

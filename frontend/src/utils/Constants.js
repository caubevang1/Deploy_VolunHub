const rawBackendOrigin =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:5000";

const normalizedApiValue = rawBackendOrigin.replace(/\/+$/, "");

export const BACKEND_ORIGIN = normalizedApiValue.endsWith("/api")
    ? normalizedApiValue.slice(0, -4)
    : normalizedApiValue;

export const DOMAIN_BE = normalizedApiValue.endsWith("/api")
    ? normalizedApiValue
    : `${BACKEND_ORIGIN}/api`;
export const LOCALSTORAGE_USER = "user";

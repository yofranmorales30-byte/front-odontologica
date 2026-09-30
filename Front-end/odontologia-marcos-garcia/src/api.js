// Cliente HTTP de la app: agrega el token de sesión a cada request
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// El token se guarda en sessionStorage: sobrevive a recargar la página pero se borra
// al cerrar la pestaña (útil en la computadora compartida de recepción).
const CLAVE_TOKEN = 'armonia.token';

let authToken = null;
let onUnauthorized = null;

export function setAuthToken(token) {
    authToken = token || null;
    try {
        if (authToken) sessionStorage.setItem(CLAVE_TOKEN, authToken);
        else sessionStorage.removeItem(CLAVE_TOKEN);
    } catch {
        // Navegación privada o almacenamiento bloqueado: la sesión dura hasta recargar
    }
}

export function getStoredToken() {
    try {
        return sessionStorage.getItem(CLAVE_TOKEN);
    } catch {
        return null;
    }
}

// Se llama cuando el servidor rechaza el token (expirado o inválido)
export function setUnauthorizedHandler(handler) {
    onUnauthorized = handler;
}

export async function apiFetch(path, options = {}) {
    const headers = { ...options.headers };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;

    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (response.status === 401 && authToken && onUnauthorized) {
        onUnauthorized();
    }
    return response;
}

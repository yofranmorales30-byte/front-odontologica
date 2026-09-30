import React, { useState, useCallback, useEffect } from 'react';
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import { apiFetch, getStoredToken, setAuthToken, setUnauthorizedHandler } from './api';
import Navbar from "./componentes/Navbar";
import LandingPage from "./componentes/LandingPage";
import SignUp from "./componentes/SignUp";
import AvisosPWA from "./pwa/AvisosPWA";
import PromoInstalacion from "./pwa/PromoInstalacion";

export default function App() {
    const [user, setUser] = useState(null);
    // Mientras se valida un token guardado no se muestra nada, para que no parpadee el login
    const [restaurando, setRestaurando] = useState(() => !!getStoredToken());
    const isAuthenticated = !!user;

    const handleLogin = useCallback((userData) => {
        const { token, ...datosUsuario } = userData;
        setAuthToken(token);
        setUser(datosUsuario);
    }, []);

    const handleLogout = useCallback(() => {
        setAuthToken(null);
        setUser(null);
    }, []);

    // Si el token expira, el servidor responde 401 y se cierra la sesión
    useEffect(() => {
        setUnauthorizedHandler(handleLogout);
    }, [handleLogout]);

    // Al recargar la página: recuperar la sesión guardada (el servidor valida el token)
    useEffect(() => {
        const token = getStoredToken();
        if (!token) return;

        setAuthToken(token);
        apiFetch('/me')
            .then(async (response) => {
                if (response.ok) handleLogin(await response.json());
                else handleLogout();
            })
            // Sin conexión: se muestra el login, el token queda guardado para el próximo intento
            .catch(() => {})
            .finally(() => setRestaurando(false));
    }, [handleLogin, handleLogout]);

    if (restaurando) return null;

    return (
        <Router>
            <Navbar isAuthenticated={isAuthenticated} />
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/home" element={<LandingPage />} />
                <Route path="/sign-up" element={
                    <SignUp
                        isAuthenticated={isAuthenticated}
                        user={user}
                        onLogin={handleLogin}
                        onLogout={handleLogout}
                    />
                } />
                {/* El hosting manda cualquier URL a la app: una ruta que no existe vuelve al inicio */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <AvisosPWA />
            <PromoInstalacion />
        </Router>
    );
}

import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import { apiFetch, getStoredToken, setAuthToken, setUnauthorizedHandler } from './api';
import { wakeUpApi, keepApiAwake } from './apiWarmUp';
import Navbar from "./componentes/Navbar";
import LandingPage from "./componentes/LandingPage";
import AvisosPWA from "./pwa/AvisosPWA";
import PromoInstalacion from "./pwa/PromoInstalacion";
import { useTutorialEnCurso } from "./tutorial/useTutorial";

// The login, the sign-up and the panels are a separate download: the home page does not need them
const loadSignUp = () => import("./componentes/SignUp");
const SignUp = lazy(loadSignUp);

const loading = (
    <div style={{ minHeight: '100vh', paddingTop: '140px', textAlign: 'center', fontFamily: 'Poppins, sans-serif', color: '#6b7280' }}>
        Cargando...
    </div>
);

export default function App() {
    const [user, setUser] = useState(null);
    const tutorialEnCurso = useTutorialEnCurso(user);
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

    // Without a saved session the API is woken up while the person reads or types (with one, /me does it)
    useEffect(() => {
        if (!getStoredToken()) wakeUpApi();
        return keepApiAwake();
    }, []);

    // While the home page is on screen, the login is fetched in the background so "Ingresar" opens at once
    useEffect(() => {
        const whenIdle = window.requestIdleCallback || ((callback) => setTimeout(callback, 2000));
        const cancel = window.cancelIdleCallback || clearTimeout;
        const id = whenIdle(() => { loadSignUp(); });
        return () => cancel(id);
    }, []);

    if (restaurando) return null;

    return (
        <Router>
            <Navbar isAuthenticated={isAuthenticated} />
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/home" element={<LandingPage />} />
                {/* The key starts SignUp fresh on every login and logout: after logging out it shows the login,
                    not the sign-up form that was open before */}
                <Route path="/sign-up" element={
                    <Suspense fallback={loading}>
                        <SignUp
                            key={user ? 'session' : 'guest'}
                            isAuthenticated={isAuthenticated}
                            user={user}
                            onLogin={handleLogin}
                            onLogout={handleLogout}
                        />
                    </Suspense>
                } />
                {/* El hosting manda cualquier URL a la app: una ruta que no existe vuelve al inicio */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <AvisosPWA />
            {/* En el panel, la invitación a instalar espera a que termine el tutorial */}
            <PromoInstalacion
                sesion={!user ? null : user.nombre_rol === 'Paciente' ? 'paciente' : 'personal'}
                tutorialEnCurso={tutorialEnCurso}
            />
        </Router>
    );
}

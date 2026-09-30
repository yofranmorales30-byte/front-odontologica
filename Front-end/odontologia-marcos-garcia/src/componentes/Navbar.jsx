import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiMenu, FiX, FiDownload } from "react-icons/fi";
import { Nav, ScrollLink, SignNavLink, NavMenu, LogoArea, MenuButton, InstallButton } from "../elementos/NavbarElements";
import { useInstalarApp } from "../pwa/useInstalarApp";

const SECCIONES = [
    ["inicio", "Inicio"],
    ["nosotros", "Nosotros"],
    ["servicios", "Servicios"],
    ["contacto", "Contacto"],
];

const Navbar = ({ isAuthenticated }) => {
    const navigate = useNavigate();
    // Menú desplegable en pantallas chicas
    const [abierto, setAbierto] = useState(false);
    const { puedeInstalar, instalar } = useInstalarApp();

    // Escape cierra el menú
    useEffect(() => {
        if (!abierto) return;
        const alTeclear = (e) => { if (e.key === "Escape") setAbierto(false); };
        document.addEventListener("keydown", alTeclear);
        return () => document.removeEventListener("keydown", alTeclear);
    }, [abierto]);

    const scrollTo = (id) => {
        setAbierto(false);
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
            navigate("/", { state: { scrollTo: id } });
        }
    };

    // Cuando el usuario está autenticado, la Navbar se oculta
    // porque el Dashboard tiene su propio TopBar con usuario y cerrar sesión
    if (isAuthenticated) return null;

    return (
        <Nav aria-label="Navegación principal">
            <LogoArea type="button" onClick={() => scrollTo("inicio")}>
                Armonía
            </LogoArea>
            <MenuButton
                type="button"
                aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
                aria-expanded={abierto}
                aria-controls="menu-principal"
                onClick={() => setAbierto((a) => !a)}
            >
                {abierto ? <FiX /> : <FiMenu />}
            </MenuButton>
            <NavMenu id="menu-principal" $abierto={abierto}>
                {SECCIONES.map(([id, texto]) => (
                    <ScrollLink key={id} type="button" onClick={() => scrollTo(id)}>
                        {texto}
                    </ScrollLink>
                ))}
                <SignNavLink to="/sign-up" onClick={() => setAbierto(false)}>
                    Ingresar
                </SignNavLink>
                {puedeInstalar && (
                    <InstallButton type="button" onClick={() => { setAbierto(false); instalar(); }}>
                        <FiDownload /> Instalar app
                    </InstallButton>
                )}
            </NavMenu>
        </Nav>
    );
};

export default Navbar;
